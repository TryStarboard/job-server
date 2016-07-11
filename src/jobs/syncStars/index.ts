import {Observable, Subscriber} from 'rxjs';
import {User} from '../../models';
import createDataSource from './createDataSource';
import saveData from './saveData';
import deleteRepos from './deleteRepos';

interface SyncStarEvent {
  type: string;
  repoIds: string[];
  totalPage?: number;
  currentPage?: number;
}

export default async function (userId: string) {
  const user = await User.findById(userId);
  const dataSource = createDataSource(user);

  return new Observable<SyncStarEvent>((subscriber: Subscriber<SyncStarEvent>) => {
    const subscription = dataSource
      .flatMap<string[]>(async function (data) {
        const repoIds = await saveData(user, data.repos);
        subscriber.next({
          type: 'REPOS_TOUCHED',
          repoIds,
          totalPage: data.totalPage,
          currentPage: data.currentPage,
        });
        return repoIds;
      })
      .reduce<string[]>((touchedRepoIds, repoIds) => touchedRepoIds.concat(repoIds), [])
      .flatMap<string[]>((repoIds) => deleteRepos(user, repoIds))
      .do((repoIds) => subscriber.next({
        type: 'REPOS_DELETED',
        repoIds,
      }))
      .subscribe(
        null,
        (err) => subscriber.error(err),
        () => subscriber.complete()
      );

    return () => {
      subscription.unsubscribe();
    };
  });
};
