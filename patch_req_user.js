const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

// Replace all User.findById with db.query.users.findFirst
code = code.replace(
  /const (user|requester|targetApproverUser|departmentHead) = await User\.findById\(([^)]+)\);/g,
  `const $1 = await db.query.users.findFirst({ where: eq(users.id, $2) });`
);

code = code.replace(
  /const (user|requester|targetApproverUser|departmentHead) = await User\.findById\(([^)]+)\)\.populate\("department"\);/g,
  `const $1 = await db.query.users.findFirst({ where: eq(users.id, $2), with: { department: true } });`
);

code = code.replace(
  /const approvers = await User\.find\(filter\)/g,
  `// TODO fix User.find
    const approvers = await User.find(filter)`
);


fs.writeFileSync('src/controllers/requisition.controller.ts', code);
