#!/usr/bin/env bun
import { spawn } from "bun";
interface NativeSkill { name: string; description: string; handler: () => Promise<void>; }
const NATIVE_SKILLS: Record<string, NativeSkill> = {
  "git-status": { name: "git-status", description: "Check git status", handler: async () => { const p = spawn(["git", "status"], { stdout: "inherit" }); await p.exited; } },
  "list-files": { name: "list-files", description: "List files", handler: async () => { const p = spawn(["ls", "-la"], { stdout: "inherit" }); await p.exited; } },
  "test-competency": { name: "test-competency", description: "Test V8 competency execution", handler: async () => {
    const res = await fetch("http://localhost:3000/execute-competency", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: "01", competencyId: "competency:mit_101", payload: { voltage: 12, resistance: 4 } })
    });
    console.log("📊 Result:", JSON.stringify(await res.json(), null, 2));
  }}
};
async function main() {
  const intent = process.argv.slice(2).join(" ");
  if (!intent) { console.log("⚡ CDU Harness Active. Usage: bun ./conquest.ts '<skill>'"); return; }
  const skill = Object.keys(NATIVE_SKILLS).find(k => intent.toLowerCase().includes(k));
  if (skill) { await NATIVE_SKILLS[skill].handler(); return; }
  console.log("❌ Unknown skill.");
}
main();
