const fs = require('fs');
let code = fs.readFileSync('src/controllers/auth.controller.ts', 'utf8');

code = code.replace(
  /console\.error\("Database fallback error:", dbError\);/,
  `console.error("Database fallback error:", dbError);
        res.status(500).json({ success: false, message: "Database fallback error: " + dbError.message });
        return true;`
);

fs.writeFileSync('src/controllers/auth.controller.ts', code);
