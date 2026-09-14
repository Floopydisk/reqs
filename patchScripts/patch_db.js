const fs = require('fs');
let code = fs.readFileSync('src/db/index.ts', 'utf8');

code = code.replace(
  'connectionString: process.env.DATABASE_URL,',
  \`connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },\`
);

fs.writeFileSync('src/db/index.ts', code);
