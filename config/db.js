const { Pool } = require('pg');
require('dotenv').config();

/*const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});*/
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Esto es obligatorio para que Neon acepte la conexión segura
  }
});

pool.on('connect', () => {
  console.log('Conexión establecida con la base de datos PostgreSQL.');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};