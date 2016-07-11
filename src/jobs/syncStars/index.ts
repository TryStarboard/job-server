import {User} from '../../models';
import createDataSource from './createDataSource';
import saveData from './saveData';
import deleteRepos from './deleteRepos';

export default async function (userId: string) {
  const user = await User.findById(userId);
  const dataSource = createDataSource(user);
  return dataSource
    .flatMap<string[]>((data) => saveData(user, data.repos))
    .do((ids) => console.log('-----------------> ', ids.length))
    .reduce<string[]>((touchedRepoIds, repoIds) => touchedRepoIds.concat(repoIds), [])
    .do((ids) => console.log('-----------------> all ', ids.length))
    .flatMap<string[]>(deleteRepos);
};
