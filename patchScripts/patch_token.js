const fs = require('fs');
let code = fs.readFileSync('src/utils/tokenManager.ts', 'utf8');

code = code.replace(
  /id: user\._id/,
  'id: user.id || user._id'
);
code = code.replace(
  /id: user\._id/,
  'id: user.id || user._id'
);

fs.writeFileSync('src/utils/tokenManager.ts', code);
