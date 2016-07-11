import {Repo} from '../../models';

export default async function (repoIds: string[]) {
  await Repo.destroy({
    where: {
      id: {
        $notIn: repoIds
      }
    }
  });
  return repoIds;
};
