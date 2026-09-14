const fs = require('fs');
let code = fs.readFileSync('src/models/requisition.model.ts', 'utf8');

// Add import
const importStatement = `import { syncRequisitionToPostgres } from "../utils/pgSync";\n`;
code = importStatement + code;

// Add hooks
const hooks = `
// Sync to Postgres on save
requisitionSchema.post("save", async function (doc, next) {
  await syncRequisitionToPostgres(doc);
  next();
});

// Sync to Postgres on findOneAndUpdate
requisitionSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    await syncRequisitionToPostgres(doc);
  }
  next();
});
`;

code = code + hooks;
fs.writeFileSync('src/models/requisition.model.ts', code);
