var WS = require('multiserver/plugins/ws')
var http = require('http')
var pull = require('pull-stream')
var JSONApi = require('./json-api')

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
exports.manifest = {}

exports.init = function (sbot, config) {
  var port
  if(config.ws)
    port = config.ws.port
  if(!port)
    port = 1024+(~~(Math.random()*(65536-1024)))

  var layers = []
  var server, ws_server

  function createServer (config, instance) {
    instance = instance || 0
    if(server) return server
    server = http.createServer(JSONApi(sbot, layers)).listen(port+instance)
    ws_server = WS({
      server: server, port: port+instance, host: config.host || 'localhost'
    })
    return server
  }

  sbot.auth.hook(function (fn, args) {
    var id = args[0]
    var cb = args[1]
    fn(id, function (err, value) {
      if(value === true)
        sbot.friends.get({source: sbot.id, dest: toId(id)}, function (err, follows) {
          if(err) return cb(err)
          else if(follows) cb(null, {allow: READ_AND_ADD, deny: null})
          else cb(null, true)
        })
      else
        cb(err, value)
    })
  })

  sbot.multiserver.transport({
    name: 'ws',
    create: function (config, instance) {
      createServer(config, instance)
      return ws_server
    }
  })

  return {
    use: function (handler) {
      layers.push(handler)
    }
  }
}

