'use strict';

const log       = require('@starboard/shared-backend/log');
const queue     = require('./queue');
const syncStars = require('./jobs/sync-stars');

queue.process('sync-stars', 5, function (job, done) {
  try {
    syncStars(job, done);
  } catch (err) {
    log.error(err, 'UNEXPECTED_JOB_ERROR');
    done(err);
  }
});

log.info('JOB_SERVER_START');
