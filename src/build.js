const Build = require('github-build')
const startcase = require('lodash.startcase')
const { thresholds } = require('./settings')
const { units } = require('./properties')
const { repo, sha, token } = require('./travis')
const store = require('./api')

const label = 'perfbench'
const description = 'Running performance tests...'
const meta = { repo, sha, token, label, description }

const build = new Build(meta)

let pass = () => {} // noop
let fail = () => process.exit(1)

/* If github token is given and we have commit sha */
if (token && sha) {
  build.start()

  pass = values => {
    /* default message */
    let message = 'Performance checks passed!'

    if (store.enabled) {
      const master = store.get()
      let properties = []

      const keys = ['time-to-interactive', 'first-meaningful-paint']
      let increased = false

      for (let key of keys) {
        if (values[key] > master[key]) {
          increased = key
          break
        }
      }

      if (increased) {
        const key = increased
        const difference = parseInt(values[key] - master[key], 10)
        message = `${startcase(key)} has increased by ${difference} ${units(key)}`
      } else {
        const key = keys[0]
        const difference = parseInt(master[key] - values[key], 10)
        message = `${startcase(key)} has improved by ${difference} ${units(key)}`
      }
    }

    build.pass(message)
  }

  fail = values => {
    let properties = []
    let message

    const keys = Object.keys(values)
    for (key of keys) {
      if (values[key] > thresholds[key]) properties.push(key)
    }

    if (properties.length === 1) {
      const key = properties[0]
      message = `${startcase(key)} is above threshold (${values[key]} > ${thresholds[key]})`
    } else {
      message = `${properties
        .map(p => startcase(p))
        .join(', ')
        .replace(/,([^,]*)$/, ' and$1')} are above threshold`
    }

    build.fail(message)
  }
}

module.exports = { pass, fail }
