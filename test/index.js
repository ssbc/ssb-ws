const crypto = require('crypto')
const ssbClient = require('ssb-client')
const ssbConfig = require('ssb-config/inject')
const ssbServer = require('ssb-server')
  .use(require('ssb-server/plugins/master'))
  .use(require('../'))
const test = require('tape')

const caps = {
  shs: crypto.randomBytes(32).toString('base64')
}

const customConfig = {
  caps,
  connections: {
    incoming: {
      ws: [{
        scope: ["public", "local", "device"],
        port: 9000,
        transform: "shs",
      }]
    }
  }
}

const config = ssbConfig('testnet', customConfig)
const server = ssbServer(config)

test('example configuration works', function (t) {
  t.plan(1);

  setImmediate(() =>
    ssbClient(server.keys, {
      caps,
      remote: server.getAddress(),
      manifest: {}
    }, (err, api) => {
      t.error(err)
      api.close()
      server.close()
      t.end()
    })
  )
});
