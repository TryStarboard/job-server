'use strict'

const program = require('commander')
const syncStars = require('../../lib/jobs/syncStars').default

process.on('unhandledRejection', (reason) => {
  console.log(reason)
})

program
  .option('--user-id <user-id>')
  .parse(process.argv)

syncStars(program.userId)
  .then((stream) => {
    stream.subscribe(
      (data) => console.log(data),
      (err) => console.error(err.stack),
      () => console.log('completed')
    )
  })
