/*eslint no-process-env:0*/

'use strict'

const config = require('config')
const {createFactory} = require('@starboard/log')

const createLogger = createFactory({
  name: 'starboard-job',
  env: process.env.NODE_ENV,
  logentriesToken: config.has('logging.Logentries.token') ? config.get('logging.Logentries.token') : null,
  sentryDsn: config.has('logging.Sentry.dsn') && config.get('logging.Sentry.dsn'),
  sentryOptions: config.get('logging.Sentry.options')
})

module.exports = createLogger()
