const app = require('./app');
const { initDb, pool } = require('./db');
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`scores-api écoute sur le port ${PORT}`);
  await initDb();
});

function gracefulShutdown(signal) {
  console.log(`\n Signal ${signal} reçu, arrêt propre du serveur...`);
  server.close(async () => {
    console.log('Fermeture du pool de connexions PostgreSQL...');
    await pool.end();
    console.log('Serveur arrêté proprement.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
