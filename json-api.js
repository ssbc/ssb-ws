'use strict'
var ref = require('ssb-ref')
var Stack = require('stack')
var BlobsHttp = require('multiblob-http')
var sort = require('ssb-sort')
var pull = require('pull-stream')
var WebBoot = require('web-bootloader/handler')

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

  return Stack(
    WebBoot,
    function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader("Access-Control-Allow-Headers",
      "Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      next()
    },
    msgHandler('/msg/', function (req, res, next) {
      sbot.get(req.id, function (err, msg) {
        if(err) return next(err)
        send(res, {key: req.id, value: msg})
      })
    }),
    msgHandler('/thread/', function (req, res, next) {
      console.log("GET THREAD", req.id)
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
    BlobsHttp(sbot.blobs, '/blobs')
  )
}





