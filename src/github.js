'use strict';

const config = require('config');
const {createClient} = require('@starboard/github');

module.exports = createClient({
  clientId: config.get('github.clientID'),
  clientSecret: config.get('github.clientSecret'),
  redirectUri: config.get('github.callbackURL'),
});
