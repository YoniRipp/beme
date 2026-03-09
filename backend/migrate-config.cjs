/** node-pg-migrate config. Run: npx node-pg-migrate up */
require('dotenv').config({ path: '.env.development' });
module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  dir: 'migrations',
  direction: 'up',
};
