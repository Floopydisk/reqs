const fs = require('fs');
let code = fs.readFileSync('src/controllers/auth.controller.ts', 'utf8');

code = code.replace(
  /res\.status\(500\)\.json\(\{ success: false, message: "Database fallback error: " \+ dbError\.message \}\);/,
  `res.status(500).json({ success: false, message: "Database fallback error: " + (dbError as Error).message });`
);

fs.writeFileSync('src/controllers/auth.controller.ts', code);
