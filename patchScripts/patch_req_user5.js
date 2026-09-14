const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /departmentHead = await User\.findById\(department\.head\);/g,
  `departmentHead = await db.query.users.findFirst({ where: eq(users.id, String(department.head)) });`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
