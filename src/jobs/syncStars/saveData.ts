import {UserInstance, RepoInstance, RepoAttributes, TagInstance, TagAttributes} from '@starboard/models';
import {DataSourceRepoData} from './createDataSource';
import {Repo, Tag, sequelize} from '../../models';

interface RepoDataForUpsert {
  github_id: number;
  full_name: string;
  description?: string;
  homepage?: string;
  html_url: string;
  forks_count: string;
  stargazers_count: string;
  starred_at: Date;
}

interface TagDataForInsert {
  text: string;
}

export default async function (user: UserInstance, reposData: DataSourceRepoData[]) {
  const map = getGithubIdToLanguageMap(reposData);

  const [repos, tags] = await Promise.all([
    upsertRepos(user, reposData),
    saveTags(user, reposData),
  ]);

  const repoIdToTagIdMap = getRepoIdToTagIdMap(repos, tags, map);

  await saveRepoTags(user, repoIdToTagIdMap);

  return repos.map(r => r.id);
};

function getGithubIdToLanguageMap(reposData: DataSourceRepoData[]) {
  const map = new Map<number, string>();
  for (const d of reposData) {
    map.set(d.github_id, d.language);
  }
  return map;
}

function getRepoIdToTagIdMap(
  repos: RepoInstance[],
  tags: TagInstance[],
  githubIdToLanguageMap: Map<number, string>
): Map<RepoInstance, TagInstance> {

  const newMap = new Map<RepoInstance, TagInstance>();
  for (const repo of repos) {
    const tag = tags.find(t => t.text === githubIdToLanguageMap.get(repo.github_id));
    if (tag) {
      newMap.set(repo, tag);
    }
  }
  return newMap;
}

async function upsertRepos(user: UserInstance, reposData: DataSourceRepoData[]): Promise<RepoInstance[]> {
  const reposDataForUpsert = transformReposData(reposData) as RepoAttributes[];
  return await Promise.all<RepoInstance>(reposDataForUpsert.map(r => upsertRepo(user, r)));
}

function transformReposData(data: DataSourceRepoData[]): RepoDataForUpsert[] {
  return data.map<RepoDataForUpsert>(d => ({
    github_id: d.github_id,
    full_name: d.full_name,
    description: d.description,
    homepage: d.homepage,
    html_url: d.html_url,
    forks_count: d.forks_count,
    stargazers_count: d.stargazers_count,
    starred_at: new Date(d.starred_at),
  }));
}

async function upsertRepo(user: UserInstance, repoData: RepoAttributes): Promise<RepoInstance> {
  return await sequelize.transaction(async function (t): Promise<RepoInstance> {
    const [repo, initialized] = await Repo.findOrInitialize({
      where: {
        github_id: repoData.github_id,
        user_id: user.id
      },
      defaults: repoData,
      transaction: t,
    });

    if (initialized) {
      return await user.createRepo(repoData, {transaction: t});
    } else {
      return await repo.update(repoData, {transaction: t});
    }
  });
}

async function saveTags(user: UserInstance, reposData: DataSourceRepoData[]): Promise<TagInstance[]> {
  const languages = new Set();
  for (const d of reposData) {
    if (d.language) {
      languages.add(d.language);
    }
  }
  const tagsDataForInsert = transformTagsData(languages) as TagAttributes[];
  return await Promise.all<TagInstance>(tagsDataForInsert.map(t => saveTag(user, t)));
}

function transformTagsData(data: Set<string>): TagDataForInsert[] {
  return Array.from(data).map(text => ({text}));
}

async function saveTag(user: UserInstance, tagData: TagAttributes): Promise<TagInstance> {
  return await sequelize.transaction(async function (t): Promise<TagInstance> {
    const [tag, initialized] = await Tag.findOrInitialize({
      where: {
        text: tagData.text,
        user_id: user.id
      },
      defaults: tagData,
      transaction: t,
    });

    if (initialized) {
      return await user.createTag(tagData, {transaction: t});
    } else {
      return tag;
    }
  });
}

async function saveRepoTags(user: UserInstance, map: Map<RepoInstance, TagInstance>) {
  await Promise.all(
    Array.from(map.entries())
      .map(([repo, tag]) => createRepoTagAssociation(repo, tag))
  );
}

async function createRepoTagAssociation(repo: RepoInstance, tag: TagInstance) {
  return await sequelize.transaction(async function (t) {
    const has = await repo.hasTag(tag, {transaction: t});
    if (!has) {
      await repo.addTag(tag, {transaction: t});
    }
  });
}
