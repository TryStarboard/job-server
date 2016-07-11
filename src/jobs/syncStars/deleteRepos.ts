import {UserInstance} from '@starboard/models';
import {Repo, sequelize} from '../../models';

export default async function (user: UserInstance, repoIds: string[]) {
  return await sequelize.transaction(async function (t) {
    const repos = await user.getRepos({
      where: {
        id: {
          $notIn: repoIds
        }
      },
      transaction: t,
    });

    await Promise.all(repos.map(r => r.destroy({transaction: t})));

    return repos.map(r => r.id);
  });
};
