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

var READ_AND_ADD = [ //except for add, of course
  'get',
  'getLatest',
  'createLogStream',
  'createUserStream',

  'createHistoryStream',
  'getAddress',

  'links',

  'blobs.add',
  'blobs.size',
  'blobs.has',
  'blobs.get',
  'blobs.changes',
  'blobs.createWants',

  'add',

  'query.read',
  'links2.read'
]


exports.name = 'ws'
exports.version = require('./package.json').version
exports.manifest = {
  getAddress: 'sync'
}

function toId(id) {
  if (typeof id !== 'string') {
    return '@' + id.toString('base64') + '.ed25519' // isn't this available somewhere else?
  } else throw new Error('toId() called on string. todo: clean this your mess.')
}

exports.init = function (sbot, config) {

  var port
  if(config.ws)
    port = config.ws.port
  if(!port)
    port = 1024+(~~(Math.random()*(65536-1024)))

  var layers = []
  var server = http.createServer(JSONApi(sbot, layers)).listen(port)

  function _auth (id, cb) {
    sbot.friends.get({source: sbot.id, dest: toId(id)}, function (err, follows) {
      if(err) return cb(err)
      else if(follows) cb(null, {allow: READ_AND_ADD, deny: null})
      else cb()
    })
  }

  var ms = MultiServer([
    [
      WS({server: server, port: port, host: config.host || 'localhost'}),
      SHS({
        keys: toSodiumKeys(config.keys),
        appKey: (config.caps && new Buffer(config.caps.shs, "base64")) || cap,
        auth: function (id, cb) {
          sbot.auth(toId(id), function (err, allowed) {
            if(err || allowed) cb(err, allowed)
            else _auth(id, cb)
          })
        },
        timeout: config.timeout
      })
    ]
  ])

  var close = ms.server(function (stream) {
    var manifest = sbot.getManifest()
    var rpc = muxrpc({}, manifest)(sbot, stream.auth)
    rpc.id = toId(stream.remote)
    pull(stream, rpc.createStream(), stream)
  })

  //close when the server closes.
  sbot.close.hook(function (fn, args) {
    close()
    fn.apply(this, args)
  })

  return {
    getAddress: function () {
      return ms.stringify()
    },
    use: function (handler) {
      layers.push(handler)
    }

  }
}


