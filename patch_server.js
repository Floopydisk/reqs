const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  /const PORT = parseInt\(process\.env\.PORT \|\| "3000", 10\);/g,
  `const PORT = 3000;`
);

fs.writeFileSync('src/server.ts', code);
