'use strict';

const log = require('./log');
const queue = require('./queue');
const {sharedClient: redisClient} = require('./redis');
const syncStars = require('../lib/jobs/syncStars').default;

queue.process('sync-stars', 5, function (job, done) {
  const {user_id} = job.data;
  const channel = `sync-stars:user_id:${user_id}`;
  const uniqKey = `{uniq-job:sync-stars}:user_id:${user_id}`;

  log.info({user_id, job_type: 'sync-stars', job_id: job.id}, 'JOB_STARTED');

  syncStars(user_id)
    .then((dataSource) => dataSource.subscribe(onNext, onError, onCompleted))
    .catch(onError);

  function onNext(event) {
    redisClient.publish(channel, JSON.stringify(event));
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
});

log.info('JOB_SERVER_START');
