const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function parseSqlStatements(sqlText) {
  const lines = sqlText.replace(/\r/g, '').split('\n');
  let delimiter = ';';
  let chunk = '';
  const statements = [];

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }

    if (/^DELIMITER\s+/i.test(trimmed)) {
      delimiter = trimmed.split(/\s+/)[1] || ';';
      continue;
    }

    chunk += `${line}\n`;

    if (chunk.trim().endsWith(delimiter)) {
      const statement = chunk.trim().slice(0, -delimiter.length).trim();
      if (statement) {
        statements.push(statement);
      }
      chunk = '';
    }
  }

  if (chunk.trim()) {
    statements.push(chunk.trim());
  }

  return statements;
}

async function run() {
  const sqlPath = path.resolve(__dirname, '../database/database_setup.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const statements = parseSqlStatements(sqlContent);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: false,
  });

  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('Database initialized successfully from database_setup.sql');
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Database initialization failed:', error.message);
  process.exit(1);
});
