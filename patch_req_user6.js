const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = code.replace(
  /\/\/ TODO fix User\.find\s*const approvers = await User\.find\(filter\)[\s\S]*?\.sort[^;]+;/g,
  `const mongooseApprovers = await User.find(filter).select("_id firstName lastName email role designation department isActive").populate("department", "name code").sort({ firstName: 1, lastName: 1 });
  const approvers = mongooseApprovers.map(a => ({ id: a._id.toString(), _id: a._id, ...a.toObject() }));`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
