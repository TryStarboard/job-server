import config = require('config');
const {createClient} = require('@starboard/github');

interface GithubRequestConfig {
  headers: Object;
}

export interface GithubRepoData {
  id: number;
  full_name: string;
  description: string;
  homepage: string;
  html_url: string;
  forks_count: number;
  stargazers_count: number;
  language: string;
}

export interface GithubRepoWithStarredTimeData {
  starred_at: string;
  repo: GithubRepoData;
}

interface GithubResponseHeader {
  link: string;
}

export interface GithubClient {
  getOptionsAsync(path: string, config: GithubRequestConfig, query: Object):
    [any, GithubRepoWithStarredTimeData[], GithubResponseHeader];
}

const {client} = createClient({
  clientId: config.get('github.clientID'),
  clientSecret: config.get('github.clientSecret'),
  redirectUri: config.get('github.callbackURL'),
});

export function create(accessToken: string): GithubClient {
  return client.client(accessToken);
}
