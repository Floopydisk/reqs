const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /const requester = await db\.query\.users\.findFirst\(\{\swhere:\seq\(users\.id,\srequisition\.requester\)\s\}\);/g,
  `const requester = await db.query.users.findFirst({ where: eq(users.id, requisition.requester as string) });`
);

code = code.replace(
  /const departmentHead = await db\.query\.users\.findFirst\(\{\swhere:\seq\(users\.id,\sdepartment\.head\)\s\}\);/g,
  `const departmentHead = await db.query.users.findFirst({ where: eq(users.id, department.head as string) });`
);


fs.writeFileSync('src/controllers/requisition.controller.ts', code);
