// MySQL connection pool. Settings come from environment variables (backend/.env locally,
// the hosting provider's settings page in production), so nothing is hard-coded.
//
//   Option A — one connection string (Railway, Aiven, PlanetScale etc. give you one):
//     DATABASE_URL=mysql://user:password@host:port/database
//   Option B — separate values (defaults match a local MySQL install):
//     DB_HOST=localhost  DB_PORT=3306  DB_USER=root  DB_PASSWORD=...  DB_NAME=learning_app
//   Hosted databases that require an encrypted connection: DB_SSL=true
const mysql = require('mysql2');
require('dotenv').config();

const url = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
const ssl = /^(1|true|yes|required?)$/i.test(process.env.DB_SSL || '') || /ssl-mode=required/i.test(url)
  // Encrypted either way; set DB_SSL_VERIFY=true to also check the server certificate.
  ? { rejectUnauthorized: process.env.DB_SSL_VERIFY === 'true' }
  : undefined;

const common = {
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  enableKeepAlive: true,
  charset: 'utf8mb4',
  ...(ssl ? { ssl } : {}),
};

const db = url
  ? mysql.createPool({ uri: url.replace(/[?&]ssl-mode=[^&]*/i, ''), ...common })
  : mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'learning_app',
    ...common,
  });

// Check the connection once at start-up so problems show clearly in the logs.
db.getConnection((err, conn) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to MySQL database');
  conn.release();
});

module.exports = db;
