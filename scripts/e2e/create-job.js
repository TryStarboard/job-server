#!/usr/bin/env node --harmony_destructuring --harmony_default_parameters

'use strict';

const program = require('commander');

program
  .option('--complaint-id <complaint-id>')
  .parse(process.argv);

const queue = require('../../src/queue');

queue
  .create('sync-stars', {
    user_id: 1,
  })
  .removeOnComplete(true)
  .save((err) => {
    if (err) {
      throw err;
    }
    console.log('added');
    process.exit(0);
  });
