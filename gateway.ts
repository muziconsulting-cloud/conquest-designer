import { CDUCompetencyEngine } from "./src/competency_engine";
const engine = new CDUCompetencyEngine();
engine.init().catch(err => console.warn("⚠️ SurrealDB pending: " + err.message));
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ status: "healthy", engine: "CDU Gateway" });
    if (url.pathname === "/execute-competency" && req.method === "POST") {
      try {
        const { agentId, competencyId, payload } = await req.json();
        const result = await engine.runAgentCompetency(agentId, competencyId, payload);
        return Response.json(result);
      } catch (err: any) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
      }
    }
    return new Response("Not Found", { status: 404 });
  },
});
console.log("🚀 [CDU Gateway] Running on http://localhost:3000");
