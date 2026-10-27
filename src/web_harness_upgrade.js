import fs from "fs";

let serverCode = fs.readFileSync("src/server.ts", "utf8");

// 1. Upgrade the UI workbench interface layout to include an input terminal text bar
const oldUIBlockStart = "if (url.pathname === '/university' && request.method === 'GET') {";
const oldUIBlockEnd = "return new Response(html, { headers: { \"Content-Type\": \"text/html; charset=utf-8\" } });";

const uiStartIndex = serverCode.indexOf(oldUIBlockStart);
const uiEndIndex = serverCode.indexOf(oldUIBlockEnd);

if (uiStartIndex !== -1 && uiEndIndex !== -1) {
  const before = serverCode.substring(0, uiStartIndex);
  const after = serverCode.substring(uiEndIndex + oldUIBlockEnd.length);

  const upgradedHTMLBlock = `if (url.pathname === '/university' && request.method === 'GET') {
    try {
      const html = \`<!doctype html><html><head><meta charset="utf-8"><title>CDU Agent Terminal Harness</title><style>body{background:#0a192f;color:#e6edf3;font-family:monospace;padding:40px}.card{background:#0f1520;border:1px solid #1f2a37;padding:24px;max-width:900px;border-radius:8px;box-shadow: 0 4px 20px rgba(0,0,0,0.5)}h1{color:#d4af37;margin-top:0}input,button{padding:14px;background:#070a12;color:#64ffda;border:1px solid #1f2a37;font-family:monospace;border-radius:4px;box-sizing:border-box}input{width:75%;margin-right:2%}button{width:23%;background:#d4af37;color:#0a192f;font-weight:bold;cursor:pointer;text-transform:uppercase}#out{margin-top:20px;padding:20px;background:#050810;border-left:4px solid #64ffda;white-space:pre-wrap;font-size:14px;color:#64ffda;min-height:200px;box-shadow:inset 0 2px 10px rgba(0,0,0,0.8)}</style></head><body><div class="card"><h1>🎓 CDU Agent University — Command Bar Harness</h1><div style="display:flex;margin-bottom:15px;"><input type="text" id="cmdInput" placeholder="Type prompt or command (e.g. ls -la, git status, file distribution)..." onkeydown="if(event.key==='Enter')execute()"><button onclick="execute()">Run Command</button></div><div id="out">⚡ Terminal standing by. Type an intent statement or binary target task above...</div></div><script>async function execute(){const inp=document.getElementById("cmdInput");const out=document.getElementById("out");if(!inp.value.trim())return;out.textContent="⏳ Running native shell executor layer...";try{const res=await fetch("/cdu/execute-competency",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:"9710 3421 0000 0015",competencyId:"list-files",prompt:inp.value})});const data=await res.json();if(data.output){out.textContent=data.output;}else{out.textContent=JSON.stringify(data,null,2);}}catch(e){out.textContent="❌ Network communication fault: "+e.message;}}</script></body></html>\`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    } catch (e: any) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }`;

  serverCode = before + upgradedHTMLBlock + after;
}

// 2. Now rewire the execution router handler to capture the typed string directly and feed it to Bun.spawn shell
const oldRouteStart = "if (url.pathname === '/cdu/execute-competency' && request.method === 'POST') {";
const oldRouteEnd = "return Response.json(v8Output);";

const routeStartIndex = serverCode.indexOf(oldRouteStart);
const routeEndIndex = serverCode.indexOf(oldRouteEnd);

if (routeStartIndex !== -1 && routeEndIndex !== -1) {
  const before = serverCode.substring(0, routeStartIndex);
  const after = serverCode.substring(routeEndIndex + oldRouteEnd.length);

  const cleanShellRunnerBlock = `if (url.pathname === '/cdu/execute-competency' && request.method === 'POST') {
        try {
          const body = await request.json();
          const { agentId, competencyId, payload, prompt } = body;

          // Natural Language Intent Router translating prompts straight to valid shell commands
          let shellArgs = ["ls", "-la"];
          if (prompt) {
            const p = prompt.toLowerCase().trim();
            if (p.includes("git status") || p.includes("repo") || p.includes("git")) {
              shellArgs = ["git", "status"];
            } else if (p.includes("ls") || p.includes("file") || p.includes("dir")) {
              shellArgs = ["ls", "-la"];
            } else if (p.includes("profile") || p.includes("audit") || p.includes("line")) {
              shellArgs = ["wc", "-l", "src/server.ts", "src/competency_engine.ts"];
            } else if (p.includes("cluster") || p.includes("pm2") || p.includes("ecosystem")) {
              shellArgs = ["cat", "ecosystem.config.cjs"];
            } else if (p.includes("network") || p.includes("port")) {
              shellArgs = ["echo", "Server active loop running on local loopback port 3001"];
            } else {
              // Direct fallback: execution path executes exactly what was typed into the bar matrix
              shellArgs = prompt.split(" ");
            }
          }

          const proc = Bun.spawn(shellArgs, { stdout: "pipe", stderr: "pipe" });
          const output = await new Response(proc.stdout).text();
          const errOutput = await new Response(proc.stderr).text();
          await proc.exited;

          return Response.json({
            success: true,
            output: output + (errOutput ? "\\nERR:\\n" + errOutput : "")
          });`;

  serverCode = before + cleanShellRunnerBlock + after;
  fs.writeFileSync("src/server.ts", serverCode);
  console.log("🔥 Terminal Upgraded successfully! Form-field prompt bar enabled.");
} else {
  console.log("❌ Target endpoint configuration pattern mismatch.");
}
