const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'clickfast_user',
  password: process.env.DB_PASSWORD || 'clickfast_pass',
  database: process.env.DB_NAME || 'clickfast_db',
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
});

async function initDb() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      score INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    const client = await pool.connect();
    await client.query(createTableQuery);
    client.release();
    console.log('Base de données initialisée avec succès (table "scores" prête).');
  } catch (err) {
    console.error('Impossible de joindre la base PostgreSQL au démarrage :', err.message);
    console.log('L\'API continuera de fonctionner et tentera de se reconnecter aux prochaines requêtes.');
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initDb
};
