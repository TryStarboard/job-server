'use strict';

const config            = require('config');
const createRedisClient = require('../../../shared-backend/redis').createClient;
const log               = require('../../../shared-backend/log');
const startSyncStars    = require('./SyncStars');

const redisClient = createRedisClient(config.get('redis'), log);

module.exports = function (job, done) {
  const data = job.data;
  const {user_id} = data;
  const channel = `sync-stars:user_id:${user_id}`;
  const uniqKey = `{uniq-job:sync-stars}:user_id:${user_id}`;
  let total;
  let i = 0;

  log.info({user_id, job_type: 'sync-stars', job_id: job.id}, 'JOB_STARTED');

  startSyncStars(user_id).subscribe(onNext, onError, onCompleted);

  function onNext(event) {
    switch (event.type) {
    case 'SUMMARY_ITEM':
      // Plus one because we have to an additional delete step after all pages
      total = event.total_page + 1;
      break;
    case 'UPDATED_ITEM':
      // Fallthrough
    case 'DELETED_ITEM':
      i += 1;
      job.progress(i, total);
      redisClient.publish(channel, JSON.stringify({
        type: 'PROGRESS_DATA_ITEM',
        progress: Math.round(i / total * 100) / 100,
      }));
      redisClient.publish(channel, JSON.stringify(event));
      break;
    default:
      // No additional case
    }
  }

  function onError(err) {
    log.error({err, user_id, job_type: 'sync-stars', job_id: job.id}, 'JOB_ERROR');
    redisClient.del(uniqKey);
    done(err);
  }

  function onCompleted() {
    log.info({user_id, job_type: 'sync-stars', job_id: job.id}, 'JOB_COMPLETED');
    redisClient.del(uniqKey);
    done();
  }
};