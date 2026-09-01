const session = require('express-session');
const MongoStore = require('connect-mongo');
const env = require('../config/env');

// Uma única instância de sessão é compartilhada entre o Express (HTTP) e o
// Socket.io (handshake) — ver server.js. Isso garante que admin, aluno e
// fiscal usem o mesmo mecanismo de sessão HttpOnly/Secure/SameSite, com
// dados de autorização guardados só no servidor (nunca em JWT decodificável
// no cliente).
const sessionMiddleware = session({
  name: 'provas_live.sid',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: env.mongoUri,
    collectionName: 'sessions',
    ttl: 8 * 60 * 60, // 8 horas
  }),
  cookie: {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
});

module.exports = sessionMiddleware;
