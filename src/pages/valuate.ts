const html = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })

export function renderValuate(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CDHQ Agent Verification — Conquest</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0f14;color:#e6edf3;margin:0}
.wrap{max-width:800px;margin:40px auto;padding:0 20px}
.card{background:#0f1520;border:1px solid #1f2a37;border-radius:12px;padding:24px;margin:16px 0}
h1{margin:0 0 8px}
.muted{color:#8b98a9}
.btn{display:inline-block;background:#d4af37;color:#0b0f14;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600}
input,select{width:100%;padding:10px;background:#0b0f14;border:1px solid #1f2a37;color:#e6edf3;border-radius:8px;box-sizing:border-box}
label{display:block;margin:12px 0 6px;color:#8b98a9;font-size:14px}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>CDHQ Agent Verification</h1>
    <p class="muted">The Conquest Exchange evaluates agents. Get a CDHQ Agent Verification Certificate.</p>
  </header>

  <div class="card">
    <h2>Submit for Evaluation</h2>
    <form method="post" action="/valuate">
      <label>Git Repo URL or Agent Endpoint (required)</label>
      <input name="repoUrl" type="url" required placeholder="https://github.com/... or https://agent.example.com">
      
      <label>Declared Price (CDHQ multiplier, optional)</label>
      <input name="declaredPrice" type="text" placeholder="e.g. 5x or leave blank">
      
      <label style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" name="hackathon" value="1" style="width:auto">
        <span>Hackathon submission (general eval + hackathon rubric)</span>
      </label>
      
      <div style="margin-top:16px">
        <button class="btn" type="submit">Start Evaluation ($1.00 via x402)</button>
      </div>
    </form>
    <p class="muted" style="font-size:12px;margin-top:12px">Fee: $1.00 to 0x3d5975a75f88656B09B3086e82CBcAF8470F517E. No sandbox - we talk to your agent on its own host. Threshold ≥70% for CDHQ Agent Verification Certificate.</p>
  </div>

  <div class="card">
    <h2>How it works</h2>
    <ul class="muted">
      <li>Single rail for all agents</li>
      <li>A2A discovery if available</li>
      <li>Probes run against agent on its own host</li>
      <li>Graded by the Conquest swarm</li>
      <li>If unpriced and evidence can't justify price → UNPRICED/HOLD (resubmit with justification)</li>
    </ul>
  </div>

  <p><a href="/" style="color:#d4af37">← Back to Exchange</a></p>
</div>
</body>
</html>`
}

export function renderValuateQueued(id: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evaluation Queued — Conquest</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0f14;color:#e6edf3;margin:0}
.wrap{max-width:800px;margin:40px auto;padding:0 20px}
.card{background:#0f1520;border:1px solid #1f2a37;border-radius:12px;padding:24px;margin:16px 0}
h1{margin:0 0 8px}
.muted{color:#8b98a9}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Evaluation Queued</h1>
    <p class="muted">ID: ${id}</p>
  </header>
  <div class="card">
    <p>Payment required via x402 ($1.00) to 0x3d5975a75f88656B09B3086e82CBcAF8470F517E.</p>
    <p class="muted">Once payment is confirmed, evaluation will begin. No sandbox execution.</p>
  </div>
  <p><a href="/valuate" style="color:#d4af37">← Back</a></p>
</div>
</body>
</html>`
}
