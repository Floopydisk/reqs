const fs = require('fs');
let code = fs.readFileSync('src/controllers/user.controller.ts', 'utf8');

code = code.replace(/_id: u\.id,\s*id: u\.id,/g, '_id: u.id,');
code = code.replace(/_id: user\.id,\s*id: user\.id,/g, '_id: user.id,');
code = code.replace(/eq\(users\.id, req\.params\.id\)/g, 'eq(users.id, req.params.id as string)');

fs.writeFileSync('src/controllers/user.controller.ts', code);
