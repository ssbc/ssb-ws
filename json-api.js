'use strict'
var ref = require('ssb-ref')
var Stack = require('stack')
var BlobsHttp = require('multiblob-http')
var sort = require('ssb-sort')
var pull = require('pull-stream')
var WebBoot = require('web-bootloader/handler')
var URL = require('url')
var Emoji = require('emoji-server')

function msgHandler(path, handler) {
  return function (req, res, next) {
    console.log(req.method, req.url)
    if(req.method !== 'GET') return next()
    if(req.url.indexOf(path) === 0) {
      var id = req.url.substring(path.length)
      console.log("MSG?", id)
      if(!ref.isMsg(id))
        next(new Error('not a valid message id:'+id))
      else {
        req.id = id
        handler(req, res, next)
      }
    }
    else
      next()
  }
}

function send(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(obj, null, 2))
}

module.exports = function (sbot) {
  var prefix = '/blobs'
  return Stack(
    WebBoot,
    Emoji('/img/emoji'),
    function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader("Access-Control-Allow-Headers",
      "Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since");
      res.setHeader("Access-Control-Allow-Methods", "GET", "HEAD");
      next()
    },
    msgHandler('/msg/', function (req, res, next) {
      sbot.get(req.id, function (err, msg) {
        if(err) return next(err)
        send(res, {key: req.id, value: msg})
      })
    }),
    msgHandler('/thread/', function (req, res, next) {
      sbot.get(req.id, function (err, value) {
        if(err) return next(err)
        var msg = {key: req.id, value: value}

        pull(
          sbot.links({rel: 'root', dest: req.id, values: true, keys: true}),
          pull.collect(function (err, ary) {
            if(err) return next(err)
            ary.unshift(msg)
            send(res, sort(ary))
          })
        )
      })

    }),
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
    BlobsHttp(sbot.blobs, prefix)
  )
}







