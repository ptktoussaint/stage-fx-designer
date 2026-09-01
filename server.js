const path = require('path');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const env = require('./config/env');
const { connectDb } = require('./config/db');
const sessionMiddleware = require('./middleware/session');
const { initSockets } = require('./sockets');
const { startExpirySweep } = require('./lib/examLifecycle');

const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const proctorRoutes = require('./routes/proctor');

async function main() {
  await connectDb();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: false },
  });

  app.set('trust proxy', 1);
  app.set('io', io);

  // CSP restritiva: sem CDNs externos (JS/CSS 100% locais), só permitindo o
  // embed do vídeo introdutório do YouTube (requisito #51).
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://i.ytimg.com'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        frameSrc: ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

  app.use(express.json({ limit: '200kb' }));
  app.use(sessionMiddleware);

  // Sessão compartilhada entre HTTP e Socket.io — a autorização de cada
  // conexão realtime vem do mesmo cookie de sessão, nunca de um token
  // enviado solto pelo cliente (ver sockets/index.js).
  io.engine.use(sessionMiddleware);

  app.use('/api/admin', adminRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/proctor', proctorRoutes);

  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '1d' }));
  app.use('/shared', express.static(path.join(__dirname, 'public', 'shared')));
  app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
  app.use('/aluno', express.static(path.join(__dirname, 'public', 'student')));
  app.use('/professor', express.static(path.join(__dirname, 'public', 'proctor')));

  // Rotas com token na URL (/aluno/:token, /professor/:token) servem sempre
  // o mesmo index.html do papel correspondente — a identificação real
  // acontece via POST /api/*/identify, nunca lendo o token da rota no
  // backend de página estática.
  app.get('/aluno/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student', 'index.html')));
  app.get('/professor/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'proctor', 'index.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
  app.get('/', (req, res) => res.redirect('/admin'));

  app.use((err, req, res, next) => {
    console.error('[http-error]', err.message);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Erro interno.' });
  });

  initSockets(io);
  startExpirySweep(io);

  server.listen(env.port, () => {
    console.log(`[server] Provas Live rodando na porta ${env.port}`);
  });
}

main().catch((err) => {
  console.error('[server] falha ao iniciar:', err);
  process.exit(1);
});
