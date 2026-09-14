const fs = require('fs');
let code = fs.readFileSync('src/middleware/auth.middleware.ts', 'utf8');

code = code.replace(
  /const user = await User\.findById\([^)]+\)[\s\S]*?\.select\("-password"\);/,
  `const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
        with: { department: true }
      });`
);

code = code.replace(
  /req\.user = user;/,
  `req.user = {
        _id: user.id,
        ...user,
        department: user.department ? { _id: user.department.id, ...user.department } : null
      };`
);

fs.writeFileSync('src/middleware/auth.middleware.ts', code);
