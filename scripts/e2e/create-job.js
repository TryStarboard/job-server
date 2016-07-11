#!/usr/bin/env node --harmony_destructuring --harmony_default_parameters

'use strict';

const program = require('commander');

program
  .option('--user-id <user-id>')
  .parse(process.argv);

const queue = require('../../src-js/queue');

queue
  .create('sync-stars', {
    user_id: program.userId,
  })
  .removeOnComplete(true)
  .save((err) => {
    if (err) {
      throw err;
    }
    console.log('added');
    process.exit(0);
  });
