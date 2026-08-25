require('dotenv').config();
const { Pool } = require('pg');
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');

if (missingVars.length > 0) {
  throw new Error(
    `Erreur critique de configuration : Les variables d'environnement suivantes sont obligatoires mais manquantes : ${missingVars.join(', ')}.\n` +
    `Veuillez vérifier votre fichier .env ou les variables injectées au conteneur.`
  );
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
