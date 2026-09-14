const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /const approvers = mongooseApprovers\.map\(a => \(\{ id: a\._id\.toString\(\), _id: a\._id, \.\.\.a\.toObject\(\) \}\)\);/g,
  `const approvers = mongooseApprovers.map(a => ({ id: a._id.toString(), ...a.toObject() }));`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
