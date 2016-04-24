'use strict';

const kue               = require('kue');
const config            = require('config');
const createRedisClient = require('../../shared-backend/redis').createClient;
const log               = require('../../shared-backend/log');

const REDIS_CONFIG = config.get('redis');

const queue = kue.createQueue({
  redis: {
    createClientFactory() {
      return createRedisClient(REDIS_CONFIG, log);
    }
  }
});

queue
  .on('job enqueue', function (id, type) {
    log.info({job_type: type, job_id: id}, 'JOB_ENQUEUE');
  })
  .on('job complete', function (id, result) {
    kue.Job.get(id, function (err1, job) {
      if (err1) {
        return;
      }

      job.remove(function (err2) {
        if (err2) {
          throw err2;
        }
        log.info({job_id: id}, 'JOB_REMOVED');
      });
    });
  })
  .on('error', function (err) {
    log.error(err, 'QUEUE_ERROR');
  });

module.exports = queue;
