'use strict';

const config = require('config');
const createModels = require('@starboard/models').createModels;

module.exports = createModels({connection: config.get('postgres')});
