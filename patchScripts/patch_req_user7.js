const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /departmentHead\._id/g,
  `departmentHead.id`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
