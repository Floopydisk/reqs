const fs = require('fs');
let code = fs.readFileSync('src/controllers/user.controller.ts', 'utf8');

code = code.replace(/_id: u\.department\.id, id: u\.department\.id,/g, '_id: u.department.id,');
code = code.replace(/_id: user\.department\.id, id: user\.department\.id,/g, '_id: user.department.id,');

fs.writeFileSync('src/controllers/user.controller.ts', code);
