'use strict'
var ref = require('ssb-ref')
var Stack = require('stack')
var BlobsHttp = require('multiblob-http')
var pull = require('pull-stream')
var URL = require('url')
var Emoji = require('emoji-server')

function send(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(obj, null, 2))
}

var BoxStream = require('pull-box-stream')
var zeros = new Buffer(24); zeros.fill(0)

module.exports = function (sbot, layers) {
  var prefix = '/blobs'
  return Stack(
    function (req, res, next) {
      Stack.compose.apply(null, layers)(req, res, next)
    },
    Emoji('/img/emoji'),
    //blobs are served over CORS, so you can get blobs from any pub.
    function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader("Access-Control-Allow-Headers",
      "Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since");
      res.setHeader("Access-Control-Allow-Methods", "GET", "HEAD");
      next()
    },
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
    function (req, res, next) {
      if(!(req.method === "GET" || req.method == 'HEAD')) return next()

      var u = URL.parse('http://makeurlparseright.com'+req.url)
      var hash = decodeURIComponent(u.pathname.substring((prefix+'/get/').length))
      //check if we don't already have this, tell blobs we want it, if necessary.
      sbot.blobs.has(hash, function (err, has) {
        if(has) next()
        else sbot.blobs.want(hash, function (err, has) { next() })
      })
    },
    BlobsHttp(sbot.blobs, prefix, {size: false, transform: function (q) {
      if(q.unbox && /\.boxs$/.test(q.unbox)) {
        var key = new Buffer(q.unbox.replace(/\s/g, '+'), 'base64')
        if(key.length !== 32)
            return function (read) {
              return function (abort, cb) {
                read(new Error('key must be 32 bytes long'), cb)
              }
            }
        return BoxStream.createUnboxStream(
          new Buffer(key, 'base64'),
          zeros
        )
      }
      return pull.through()
    }})
  )
}






