const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:admin@localhost:5432/commerceai'
  });
  await client.connect();
  let sql = fs.readFileSync('packages/database/src/migrations/003_add_token_blocklist.sql', 'utf8');
  sql = sql.replace(/^\uFEFF/, ''); // Strip BOM
  await client.query(sql);
  console.log('Migration executed successfully');
  await client.end();
}
run().catch(console.error);