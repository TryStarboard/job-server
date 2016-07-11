import {Observable, Subscriber} from 'rxjs';
import R = require('ramda');
import parseLinkHeader = require('parse-link-header');
import {LinkHeaderData} from 'parse-link-header/types';
import {UserInstance} from '@starboard/models';
import {User} from '../../models';
import {create, GithubClient, GithubRepoData, GithubRepoWithStarredTimeData} from '../../github';

export interface DataSourceRepoData {
  github_id: number;
  full_name: string;
  description?: string;
  homepage?: string;
  html_url: string;
  forks_count: string;
  stargazers_count: string;
  language?: string;
  starred_at: string;
}

interface DataSourceResponse {
  repos: DataSourceRepoData[];
  totalPage: number;
  currentPage: number;
}

export default function (user: UserInstance) {
  return new Observable<DataSourceResponse>((s: Subscriber<DataSourceResponse>) => {
    const client = create(user.access_token);
    let unsubscribed = false;
    let currentPage = 1;

    fetchData()
      .then(() => s.complete())
      .catch((err) => s.error(err));

    async function fetchData(): Promise<void> {
      if (unsubscribed) {
        return;
      }

      const {reposWithStarredTime, lastPage, nextPage} = await getStarredRepos(client, currentPage);
      const repos = transformReposWithStarredTime(reposWithStarredTime);

      s.next({
        repos,
        totalPage: lastPage,
        currentPage,
      });

      // Support 2000 stars for now (1 page contains 100 repos)
      if (currentPage < 20 && nextPage != null) {
        currentPage = nextPage;
        return await fetchData();
      }
    }

    return () => {
      unsubscribed = true;
    };
  });
};

async function getStarredRepos(client: GithubClient, page: number) {
  const config = {
    headers: {
      // Get "starred_at" property from Github API
      Accept: 'application/vnd.github.v3.star+json'
    }
  };
  const query = {per_page: 100, page};

  const [, reposWithStarredTime, headers] = await client.getOptionsAsync('/user/starred', config, query);
  const {lastPage, nextPage} = getLinkHeaderInfo(headers.link);

  return {
    reposWithStarredTime,
    lastPage,
    nextPage,
  };
}

function getLinkHeaderInfo(linkHeader: string) {
  const data = parseLinkHeader(linkHeader);
  return {
    lastPage:
      R.pipe<LinkHeaderData, string, number, number>(
        R.path(['last', 'page']),
        parseInt,
        R.defaultTo(null)
      )(data),

    nextPage:
      R.pipe<LinkHeaderData, string, number, number>(
        R.path(['next', 'page']),
        parseInt,
        R.defaultTo(null)
      )(data),
  };
}

function transformReposWithStarredTime(reposWithStarredTime: GithubRepoWithStarredTimeData[]): DataSourceRepoData[] {
  return reposWithStarredTime.map<DataSourceRepoData>(r => {
    const repo = R.pick<GithubRepoData, DataSourceRepoData>([
      'full_name',
      'description',
      'homepage',
      'html_url',
      'forks_count',
      'stargazers_count',
      'language',
    ], r.repo);

    repo.github_id = r.repo.id;
    repo.starred_at = r.starred_at;

    return repo;
  });
}
