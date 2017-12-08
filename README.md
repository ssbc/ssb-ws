# ssb-ws

ssb-ws & http server for ssb.

Work In Progress

``` js
sbot plugins.install ssb-ws
```

make sure you set a port in your config file (~/.ssb/config).

``` json
{
  "ws": {"port": 8989}
}
```

## adding your own http handlers

sometimes you need to do http, here is an example sbot plugin that
exposes the websocket address.

``` js
require('scuttlebot')
  .use(require('ssb-ws'))
  .use({
    name: 'test123',
    version: '1.0.0',
    init: function (sbot) {
      sbot.ws.use(function (req, res, next) {
        if(req.url == '/get-address')
          res.end(sbot.ws.getAddress())
        else next()
      })
    }
  })
```

## License

MIT

