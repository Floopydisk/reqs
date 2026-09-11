const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /const requester = await db\.query\.users\.findFirst\(\{\swhere:\seq\(users\.id,\sString\(requisition\.requester\)\)\s\}\);/g,
  `const requester = await db.query.users.findFirst({ where: eq(users.id, String(requisition.requester)) });`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
