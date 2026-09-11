const fs = require('fs');
let code = fs.readFileSync('src/controllers/auth.controller.ts', 'utf8');

const replacement = `
    const tryDatabaseFallback = async (): Promise<boolean> => {
      try {
        console.log(\`Intranet service failed/unavailable. Attempting database auth fallback for userId: \${userId}\`);
        
        const { db } = require("../db");
        const { users, departments } = require("../db/schema");
        const { eq } = require("drizzle-orm");
        
        const user = await db.query.users.findFirst({
          where: eq(users.employeeId, userId),
          with: { department: true }
        });

        if (user) {
          if (!user.isActive) {
            res.status(401).json({
              success: false,
              message: "User account is inactive",
            });
            return true;
          }

          loginUserLocally(user, userId, res, true);
          return true;
        }
      } catch (dbError) {
        console.error("Database fallback error:", dbError);
      }
      return false;
    };
`;

code = code.replace(/const tryDatabaseFallback[\s\S]*?return false;\n    };/, replacement.trim());

fs.writeFileSync('src/controllers/auth.controller.ts', code);
