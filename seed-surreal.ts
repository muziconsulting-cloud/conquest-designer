import { Surreal } from "surrealdb.js";
const db = new Surreal();
async function seed() {
  await db.connect("ws://localhost:8000/rpc", { namespace: "test", database: "agents" });
  await db.query("DEFINE TABLE competency SCHEMAFULL;");
  await db.query("DEFINE FIELD name ON TABLE competency TYPE string;");
  await db.query("DEFINE FIELD code_units ON TABLE competency TYPE object;");
  await db.query("DEFINE FIELD signature ON TABLE competency TYPE object;");
  await db.query("DEFINE TABLE holds SCHEMAFULL;");
  await db.query("DEFINE FIELD in ON TABLE holds TYPE record<agent>;");
  await db.query("DEFINE FIELD out ON TABLE holds TYPE record<competency>;");
  await db.query("DEFINE FIELD certified_at ON TABLE holds TYPE datetime DEFAULT time::now();");
  await db.query("DEFINE FIELD verification_hash ON TABLE holds TYPE string;");
  await db.query(`
    CREATE competency:mit_101 SET 
      name = "Linear Circuit Analysis",
      signature = { input: { voltage: "number", resistance: "number" }, output: { current: "number" } },
      code_units = {
        validator: "function validate(input) { return typeof input.voltage === 'number' && typeof input.resistance === 'number'; }",
        executor: "function execute(input) { if (input.resistance === 0) throw new Error('Short circuit'); return { current: input.voltage / input.resistance }; }"
      };
  `);
  await db.query("CREATE agent:01 SET name = 'CDU Test Agent';");
  await db.query("RELATE agent:01->holds->competency:mit_101 SET verification_hash = 'sha256_verified_cdu_ledger';");
  console.log("✅ Seed complete.");
  await db.close();
}
seed().catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); });
