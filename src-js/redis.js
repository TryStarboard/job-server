'use strict'

const config = require('config')
const createFactory = require('@starboard/redis').createFactory
const log = require('./log')

const REDIS_CONFIG = config.get('redis')

const createClient = createFactory({
  host: REDIS_CONFIG.host,
  port: REDIS_CONFIG.port,
  password: REDIS_CONFIG.password,
  log
})

const sharedClient = createClient()

module.exports = {
  sharedClient,
  createClient
}
