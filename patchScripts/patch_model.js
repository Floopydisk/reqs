const fs = require('fs');
let code = fs.readFileSync('src/models/requisition.model.ts', 'utf8');

// Remove the export default at the top if it was there, and the post hooks at the bottom
code = code.replace(/export default mongoose\.model<IRequisition>\("Requisition", requisitionSchema\);/g, '');

const hooks = `
// Sync to Postgres on save
requisitionSchema.post("save", async function (doc, next) {
  try {
    const { syncRequisitionToPostgres } = require("../utils/pgSync");
    await syncRequisitionToPostgres(doc);
  } catch (err) {
    console.error("PG Sync error (save):", err);
  }
  next();
});

// Sync to Postgres on findOneAndUpdate
requisitionSchema.post("findOneAndUpdate", async function (doc, next) {
  if (doc) {
    try {
      const { syncRequisitionToPostgres } = require("../utils/pgSync");
      await syncRequisitionToPostgres(doc);
    } catch (err) {
      console.error("PG Sync error (findOneAndUpdate):", err);
    }
  }
  next();
});

export default mongoose.model<IRequisition>("Requisition", requisitionSchema);
`;

code = code.replace(/\/\/ Sync to Postgres on save[\s\S]+?next\(\);\n\}\);/g, '');

code = code + '\n' + hooks;

fs.writeFileSync('src/models/requisition.model.ts', code);
