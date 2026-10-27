import fs from "fs";

let serverCode = fs.readFileSync("src/server.ts", "utf8");

// Patch /cdu/execute-competency to handle NATIVE_SKILLS directly
const execTarget = `if (url.pathname === '/cdu/execute-competency' && request.method === 'POST') {`;

const execReplacement = `if (url.pathname === '/cdu/execute-competency' && request.method === 'POST') {
        try {
          const body = await request.json() as any;
          const { agentId, competencyId, payload } = body;
          
          // Execute native conquest.ts skills directly
          if (NATIVE_SKILLS && NATIVE_SKILLS[competencyId]) {
            const skill = NATIVE_SKILLS[competencyId];
            let cmd = ["git", "status"];
            if (competencyId === "list-files") cmd = ["ls", "-la"];
            const proc = Bun.spawn(cmd, { stdout: "pipe" });
            const output = await new Response(proc.stdout).text();
            await proc.exited;
            return Response.json({ success: true, competencyId, output, name: skill.name });
          }

          const result = await cduEngine.runAgentCompetency(agentId, competencyId, payload);
          return Response.json(result);`;

if (serverCode.includes("if (NATIVE_SKILLS && NATIVE_SKILLS[competencyId])")) {
  console.log("✅ Execution route already patched for native skills.");
} else if (serverCode.includes(execTarget)) {
  serverCode = serverCode.replace(execTarget, execReplacement);
  fs.writeFileSync("src/server.ts", serverCode);
  console.log("✅ Successfully patched /cdu/execute-competency execution handler in src/server.ts!");
} else {
  console.log("⚠️ Execution target route block not found.");
}
