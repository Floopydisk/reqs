const fs = require('fs');
let code = fs.readFileSync('src/controllers/requisition.controller.ts', 'utf8');

code = `import { db } from "../db";\nimport { users } from "../db/schema";\nimport { eq } from "drizzle-orm";\n` + code;

code = code.replace(
  /targetApproverUser = await User\.findById\(([^)]+)\);/g,
  `targetApproverUser = await db.query.users.findFirst({ where: eq(users.id, $1 as string) });`
);

code = code.replace(
  /targetApproverUser\._id/g,
  `targetApproverUser.id`
);

fs.writeFileSync('src/controllers/requisition.controller.ts', code);
