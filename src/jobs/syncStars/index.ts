import {Observable, Subscriber} from 'rxjs';
import {User} from '../../models';
import createDataSource from './createDataSource';
import saveData from './saveData';
import deleteRepos from './deleteRepos';

interface SyncStarEvent {
  type: string;
  data: any;
}

export default async function (userId: string) {
  const user = await User.findById(userId);
  const dataSource = createDataSource(user);

  return new Observable<SyncStarEvent>((subscriber: Subscriber<SyncStarEvent>) => {
    const subscription = dataSource
      .flatMap<string[]>((data) => saveData(user, data.repos))
      .do((repoIds) => subscriber.next({
        type: 'REPOS_TOUCHED',
        data: repoIds,
      }))
      .reduce<string[]>((touchedRepoIds, repoIds) => touchedRepoIds.concat(repoIds), [])
      .flatMap<string[]>((repoIds) => deleteRepos(user, repoIds))
      .do((repoIds) => subscriber.next({
        type: 'REPOS_DELETED',
        data: repoIds,
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
