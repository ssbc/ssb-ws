var path = require('path')
var http = require('http')
var https = require('https')

try {
  var LEX = require('letsencrypt-express')
} catch (err) {
  console.error(err)
}

module.exports = function (config, handler, port) {
  var host = config.host ? [config.host] : null

  if(host === null || !config.email || !config.agreeTos || !LEX) {
    console.log('insufficient configuration for letsencrypte')
    console.log('falling back to regular http')
    return http.createServer(handler).listen(port)
  }

  var lex = LEX.create({
    configDir: path.join(config.path, 'letsencrypt'),
    approveRegistration: function (_host, cb) {
      console.log('register certificate for', host)
      if(_host !== host)
        return cb(new Error('unexpected hostname'))

      cb(null, {
        domains: [host],
        email:  config.email,
        agreeTos: config.agreeTos
      });
    }
  })

  var server = https.createServer(
    lex.httpsOptions,
    LEX.createAcmeResponder(lex, handler)
  ).listen(443)

  //no http. just https.
  return server
}











