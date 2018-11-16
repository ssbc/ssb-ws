'use strict'
var ref = require('ssb-ref')
var Stack = require('stack')
var Emoji = require('emoji-server')

function send(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(obj, null, 2))
}

module.exports = function (sbot, layers) {
  return Stack(
    function (req, res, next) {
      Stack.compose.apply(null, layers)(req, res, next)
    },
    Emoji('/img/emoji'),
    //blobs are served over CORS, so you can get blobs from any pub.
    function (req, res, next) {
      var id
      try { id = decodeURIComponent(req.url.substring(5)) }
      catch (_) { id = req.url.substring(5) }
      if(req.url.substring(0, 5) !== '/msg/' || !ref.isMsg(id)) return next()

      sbot.get(id, function (err, msg) {
        if(err) return next(err)
        send(res, {key: id, value: msg})
      })
    },
    require('./blobs')(sbot, {prefix: '/blobs'})
  )
}

