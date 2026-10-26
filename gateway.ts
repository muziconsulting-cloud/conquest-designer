Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "healthy", engine: "CDU Gateway" });
    }

    if (url.pathname === "/v1/execute" && req.method === "POST") {
      const apiKey = req.headers.get("x-conquest-key");
      
      if (!apiKey || apiKey !== (process.env.CONQUEST_NODE_KEY || "cd-local-key")) {
        return Response.json({ error: "Unauthorized node key" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const prompt = (body.prompt || "").toLowerCase();

        console.log(`🔌 [Gateway] Processing: "${prompt}"`);

        if (prompt.includes("run ts") || prompt.includes("execute script")) {
          return Response.json({
            type: "ts",
            command: "bun run ./src/index.ts"
          });
        }

        if (prompt.includes("list files")) {
          return Response.json({
            type: "shell",
            command: "ls -la"
          });
        }

        return Response.json({
          type: "shell",
          command: `echo "Executed prompt via Gateway: ${prompt}"`
        });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("🚀 [CDU Gateway] Running on http://localhost:3000");
