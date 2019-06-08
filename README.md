# ssb-ws

**Creates a web server for ssb clients**

It is used by ssb clients, in [scuttle-shell ](https://github.com/ssbc/scuttle-shell) which is required for [Patchfox](https://github.com/soapdog/patchfox), and in web projects like [secret-islands](https://github.com/dangerousbeans/secret-islands).

Peers can replicate over ws, if a pub exposes a ws address and this enables sbot peers running in a browser (WIP).

Since ssb-ws creates a web server, it also exposes an interface that allows plugins to expose things over http. Blobs and emoji are provided via this plugin too.

### usage

``` js
sbot plugins.install ssb-ws
```

best configured via [connections config](https://github.com/ssbc/ssb-config#connections)

``` json
"connections": {
  "incoming": {
    "ws": [{
      "scope": ["public", "local", "device"],
      "port": 9000,
      "transform": "shs",
      "http": true // serve http, see ws.use(handler)
    }]
  }
}
```

you can have more than one ws server if desired.
you can also disable hosting of http handlers
by setting `web:false` on the config item,
`connections.incoming.ws[N].web = false`

# Api
## noauth

given the flexibility of multiserver, you may want to run
this with noauth config locally. However this is ***not recommended***
until ssb-ws prevents [dns rebinding attacks](https://medium.com/@brannondorsey/attacking-private-networks-from-the-internet-with-dns-rebinding-ea7098a2d325)
and websocket connections from locally open websites.

If used with a [secure transport](https://github.com/auditdrivencrypto/secret-handshake),
that authenticates the client `"transport": "shs"`
then this is not a problem.

## ws.use(handler) - http handlers

sometimes you need to do http, but if every plugin that did that
created it's own servers there would be mass panic.
But never fear, with ssb-ws, you can add http handlers
as [connect style middleware](https://www.npmjs.com/package/stack).

Here is an example sbot plugin that
adds a single route: to output the current sbot address.

``` js
require('scuttlebot')
  .use(require('ssb-ws'))
  .use({
    name: 'test123',
    version: '1.0.0',
    init: function (sbot) {
      sbot.ws.use(function (req, res, next) {
        if(req.url == '/get-address')
          res.end(sbot.getAddress('device'))
        else next()
      })
    }
  })
```

http hosting on a particular multiserver address can be disabled
using `{http:false}` in the incoming multiserver config.

## License

MIT
