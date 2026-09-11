const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /eq\(users\.id, ([^\s]+)\s+as\s+string\)/g,
  `eq(users.id, String($1))`
);
code = code.replace(
  /eq\(users\.id, ([^)]+)\)/g,
  `eq(users.id, String($1))`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
