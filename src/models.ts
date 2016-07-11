import config = require('config');
import {create} from '@starboard/models';

const {User, Repo, Tag, RepoTag, sequelize} = create(config.get('postgres'));

export {
  User,
  Repo,
  Tag,
  RepoTag,
  sequelize,
};
