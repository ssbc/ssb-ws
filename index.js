
var MultiServer = require('multiserver')
var WS = require('multiserver/plugins/ws')
var SHS = require('multiserver/plugins/shs')
var BlobsHttp = require('multiblob-http')
var http = require('http')
var muxrpc = require('muxrpc')
var pull = require('pull-stream')

var cap =
  new Buffer('1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s=', 'base64')


exports.name = 'ws'
exports.version = require('./package.json').version
exports.manifest = {}

exports.init = function (api, config) {

  var server = http.createServer(BlobsHttp(api.blobs)).listen(8989)

  function toSodiumKeys(keys) {
    return {
      publicKey:
        new Buffer(keys.public.replace('.ed25519',''), 'base64'),
      secretKey:
        new Buffer(keys.private.replace('.ed25519',''), 'base64'),
    }

  }

  var ms = MultiServer([
    [
      WS({server: server}),
      SHS({
        keys: toSodiumKeys(config.keys),
        appKey: cap,
        auth: function (id, cb) {
          id = '@'+id.toString('base64')+'.ed25519'
          console.log('access request from:', id)
          //cb(null, true)
          api.auth(id, function (err, perms) {
            console.log('AUTH', err, perms)
            cb(null, {allow: ['createHistoryStream'], deny: null})
          })
        },
        timeout: config.timeout
      })
    ]
  ])

  ms.server(function (stream) {
    var manifest = api.getManifest()
    var rpc = muxrpc({}, manifest)(api)
    pull(stream, rpc.createStream(), stream)
  })
}




