var WS = require('multiserver/plugins/ws')

function no_handler (req, res, next) {
  next(new Error('ssb-ws:web sockets only'))
}

function getPort (config) {
  if (config.ws && config.ws.port) return config.ws.port
  return 1024+(~~(Math.random()*(65536-1024)))
}

module.exports = function (createHandlers) {
  var exports = {}
  exports.name = 'ws'
  exports.version = require('./package.json').version
  exports.manifest = {}

  exports.init = function (sbot, config) {
    var port = getPort(config)
    var handlers

    sbot.multiserver.transport({
      name: 'ws',
      create: function (config) {
        handlers = config.http ? createHandlers(sbot) : no_handler
        var _host = config.host || 'localhost'
        var _port = config.port || port
        return WS(Object.assign({
          host: _host,
          port: _port,
          handler: config.http !== false ? handlers : no_handler
        }, config))
      }
    })

    return {
      use: function (handler) {
        if (handlers.layers) handlers.layers.push(handler)
      }
    }
  }

  return exports
}
