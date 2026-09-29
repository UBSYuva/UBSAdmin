const { env } = require('process');

const target = env.PORT
  ? `http://localhost:${env.PORT}`
  : 'http://localhost:3000';

const PROXY_CONFIG = [
  {
    context: ['/api', '/central-hub', '/xero', '/signalr', '/hubs', '/connect/token', '/connect/authorize', '/connect/userinfo', '/connect/endsession', '/.well-known/openid-configuration'],
    target: target,
    secure: false,
    headers: {
      Connection: 'Keep-Alive',
    },
    logLevel: 'debug',
  }
];

module.exports = PROXY_CONFIG;
