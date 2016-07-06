var MultiServer = require('multiserver')
var WS = require('multiserver/plugins/ws')
var SHS = require('multiserver/plugins/shs')
var http = require('http')
var muxrpc = require('muxrpc')
var pull = require('pull-stream')

var JSONApi = require('./json-api')

var cap =
  new Buffer('1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s=', 'base64')

function toSodiumKeys(keys) {
  return {
    publicKey:
      new Buffer(keys.public.replace('.ed25519',''), 'base64'),
    secretKey:
      new Buffer(keys.private.replace('.ed25519',''), 'base64'),
  }
}

var READ_ONLY = [
  'get',
  'createLogStream',
  'createUserStream',
  'links'
//  'add',
//  'blobs.get',
//  'blobs.add',
//  'query.read',
]


exports.name = 'ws'
exports.version = require('./package.json').version
exports.manifest = {}

exports.init = function (sbot, config) {

  var server = http.createServer(JSONApi(sbot)).listen(8989)

  var ms = MultiServer([
    [
      WS({server: server}),
      SHS({
        keys: toSodiumKeys(config.keys),
        appKey: cap,
        auth: function (id, cb) {
          id = '@'+id.toString('base64')+'.ed25519'
          sbot.auth(id, function (err, perms) {
            cb(null, {allow: READ_ONLY, deny: ['publish']})
          })
        },
        timeout: config.timeout
      })
    ]
  ])

  ms.server(function (stream) {
    var manifest = sbot.getManifest()
    var rpc = muxrpc({}, manifest)(sbot)
    pull(stream, rpc.createStream(), stream)
  })
}

