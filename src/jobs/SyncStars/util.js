'use strict';

const {curry, curryN, pluck, filter, identity, uniq, pick, map, omit, pipe, path, defaultTo} = require('ramda');
const co              = require('co');
const {wrap}          = require('co');
const {Observable}    = require('rx');
const parseLinkHeader = require('parse-link-header');
const {github}        = require('@starboard/shared-backend/github');
const db              = require('@starboard/shared-backend/db');

const transformRepo = curry(function (id, {starred_at, repo}) {
  const transformed = pick([
    'full_name',
    'description',
    'homepage',
    'html_url',
    'forks_count',
    'stargazers_count',
    'language',
  ], repo);

  transformed.user_id = id;
  transformed.github_id = repo.id;
  transformed.starred_at = starred_at;

  return transformed;
});

function getStarred(client, query) {
  return client.getOptionsAsync(
    '/user/starred',
    {
      headers: {
        // Get "starred_at" property from Github API
        Accept: 'application/vnd.github.v3.star+json'
      }
    },
    query
  )
    .then(function ([, repos, headers]) {
      const {lastPage, nextPage} = getLinkHeaderInfo(headers.link);
      return {repos, lastPage, nextPage};
    });
}

function transformReposForInsertion(repos) {
  const githubIdLangMap = {};
  const transformedRepos = repos.map((repo) => {
    githubIdLangMap[repo.github_id] = repo.language;
    return omit(['language'], repo);
  });
  return [githubIdLangMap, transformedRepos];
}

/**
 * Data source from Github, emit fetched data from github
 *
 * @param {number} user_id Local User ID
 * @param {Object} client Github client to make API requests
 *
 * @return {Observable} Emit two types of item
 *                      interface ReposItem {
 *                      	type: 'REPOS_ITEM',
 *                      	repos: Repo[],
 *                      }
 *                      interface SummaryItem {
 *                      	type: 'SUMMARY_ITEM',
 *                      	total_page: number,
 *                      }
 */
function createDataSource(user_id, client) {
  const transformRepos = map(transformRepo(user_id));

  return Observable.create((observer) => {
    co(function *() {
      let gotTotalPage = false;
      let page = 1;

      // Let's only support 2000 stars for now, 1 page contains 100 repos
      while (page !== null && page <= 20) {
        const query = {per_page: 100, page};
        const {repos, lastPage, nextPage} = yield getStarred(client, query);

        // Report total page number for tracking progress
        //
        if (!gotTotalPage && lastPage !== null) {
          gotTotalPage = true;
          observer.onNext({type: 'SUMMARY_ITEM', total_page: lastPage});
        }

        observer.onNext({type: 'REPOS_ITEM', repos: transformRepos(repos)});
        page = nextPage;
      }

      observer.onCompleted();
    })
    .catch((err) => observer.onError(err));
  });
}

/**
  enum ParsedLinkHeaderRel {
    Next = 'next',
    Last = 'last',
    First = 'first',
    Prev = 'prev',
  }

  interface ParsedLinkHeaderItem {
    per_page: string;
    page: string;
    access_token: string;
    rel: ParsedLinkHeaderRel;
    url: string;
  }

  interface ParsedLinkHeader {
    next?: ParsedLinkHeaderItem;
    last?: ParsedLinkHeaderItem;
    first?: ParsedLinkHeaderItem;
    prev?: ParsedLinkHeaderItem;
  }

 * @param  {string} linkHeader "link" property from Headers
 * @return {Object} {lastPage?: number, nextPage?: number}
 */
function getLinkHeaderInfo(linkHeader) {
  const parsed = parseLinkHeader(linkHeader); // ParsedLinkHeader
  return {
    lastPage: pipe(path(['last', 'page']), parseInt, defaultTo(null))(parsed),
    nextPage: pipe(path(['next', 'page']), parseInt, defaultTo(null))(parsed),
  };
}

function createRepoSource(user_id) {
  return Observable
    .fromPromise(getGithubClientForUser(user_id))
    .flatMap((client) => createDataSource(user_id, client));
}

function getGithubClientForUser(user_id) {
  return db('users').select('access_token').where({id: user_id})
    .then(function ([{access_token}]) {
      return github.client(access_token);
    });
}

/**
 * @param {Object[]} repos Raw star object from github
 *
 * @yield {Promise<{id: number; language: string;}>} Resolve
 */
const reposSelector = wrap(function *(repos) {
  if (!repos.length) {
    return [];
  }

  const [githubIdLangMap, transformedRepos] = transformReposForInsertion(repos);

  const transformInsertedRepos = map(function ({id: repo_id, github_id}) {
    return {id: repo_id, language: githubIdLangMap[github_id]};
  });

  const {rows} = yield db.raw(
    '? ON CONFLICT (user_id, github_id) ' +
    'DO UPDATE SET (full_name, description, homepage, html_url, forks_count, stargazers_count) = ' +
    '(' +
      'EXCLUDED.full_name, EXCLUDED.description, EXCLUDED.homepage, ' +
      'EXCLUDED.html_url, EXCLUDED.forks_count, EXCLUDED.stargazers_count' +
    ') ' +
    'RETURNING id, github_id',
    [db('repos').insert(transformedRepos)]
  );

  return transformInsertedRepos(rows);
});

const tagsSelector = curryN(2, wrap(function *(user_id, repos) {
  const tags = pipe(
    pluck('language'),
    filter(identity),
    uniq,
    map((text) => ({user_id, text}))
  )(repos);

  if (tags.length) {
    yield db.raw('? ON CONFLICT DO NOTHING', [db('tags').insert(tags)]);
  }

  const allTags = yield db('tags').select('id', 'text').where({user_id});

  const languageTagMap = {};

  for (const {id: tag_id, text} of allTags) {
    languageTagMap[text] = tag_id;
  }

  return languageTagMap;
}));

const reposAndLanguageTagMapSelector = curryN(2, wrap(function *(user_id, [repos, languageTagMap]) {
  const entries = pipe(
    map(({id: repo_id, language}) => {
      if (language == null) {
        return null;
      }
      return {user_id, repo_id, tag_id: languageTagMap[language]};
    }),
    filter(identity)
  )(repos);

  if (entries.length) {
    yield db.raw('? ON CONFLICT DO NOTHING', [db('repo_tags').insert(entries)]);
  }

  return pluck('id', repos);
}));

const deleteRepos = curry((user_id, ids) => {
  return db('repos')
    .where('user_id', user_id)
    .whereNotIn('id', ids)
    .del()
    .returning('id');
});

module.exports = {
  transformRepo,
  getStarred,
  transformReposForInsertion,
  createRepoSource,
  reposSelector,
  tagsSelector,
  reposAndLanguageTagMapSelector,
  deleteRepos,
};
