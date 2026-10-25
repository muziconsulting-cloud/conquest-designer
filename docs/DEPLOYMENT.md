# DEPLOYMENT.md — conquestdesigner.com: the decision, the architecture, the plan

**Status:** written 2026-10-23. **LIVE:** `https://conquestdesigner.com` serves the beacon
(§2.1). This file is the resume point.
If context was lost, read §10 first, then §5. Everything needed to finish is here; nothing
lives only in a chat log.

**One-line answer to "how will conquestdesigner.com work":**
`conquestdesigner.com` is served **directly**. The zone is already registered on Cloudflare
and already points at the WardByWard box, so there is no redirect and no subdomain: one extra
nginx site file sends the host to one Bun process on `127.0.0.1:3500`. No new nginx instance,
no new deploy protocol, no new server. The only coupling is TLS: the origin reuses the existing
WardByWard certificate, so the zone's SSL mode must be **Full** (not strict) until a free
Origin CA certificate is issued for the domain.

---

## 1 · URL decision (revised against the live Cloudflare zone)

**What the Cloudflare account actually shows (verified by the owner, 2026-10-23):**
- `conquestdesigner.com` is a **registered zone** on the same Cloudflare account.
- `www.conquestdesigner.com` → `CNAME conquestdesigner.com`, **Proxied**.
- A misspelled record exists: `conguestdesigner.conquestdesigner.com` → `A 84.12.96.65`,
  Proxied. The **apex has no record**, which is why the domain returned 530.
- `wardbyward.co.za` already serves several subdomains to the same box
  (`identity`, `muzichat`, `muzitel`, `turn`, `wardai`) — the pattern this project copies.

| Host | What it is | Origin | Cert |
|---|---|---|---|
| **`conquestdesigner.com`** | **canonical** | nginx → `127.0.0.1:3500` | existing `cloudflare_wardbyward.pem` (see TLS note) |
| `www.conquestdesigner.com` | alias, same server block | same | same |
| `conquestdesigner.wardbyward.co.za` | not configured (optional future alias) | n/a | would be covered by the existing cert |

**Why direct serving, not a redirect or subdomain.** The domain is already on Cloudflare and
already points at the box. A redirect would add a rule and an extra hop for no benefit; a
subdomain would add a DNS record and a different brand address. Direct serving is one nginx
file — the fewest moving parts that reaches the real domain.

**TLS note (the only coupling).** The origin certificate on the box is a Cloudflare Origin CA
cert whose SAN is `*.wardbyward.co.za`; it does **not** name `conquestdesigner.com`. In
Cloudflare SSL/TLS mode **Full** this is fine (the edge encrypts to the origin without
verifying the name). In **Full (strict)** it fails with 526. Upgrade path, optional and free:
Cloudflare → SSL/TLS → Origin Server → **Create Certificate** for `conquestdesigner.com`
(+ `*.conquestdesigner.com`), install it at `/etc/ssl/{certs,private}/conquestdesigner.{pem,key}`,
point the two `ssl_certificate*` lines in `deploy/nginx/conquestdesigner.conf` at it, reload —
then switch the zone to **Full (strict)**. Nothing else changes.

---

## 2.1 · What is live now (Phase W) vs the target rail

**Live today — the beacon.** A separate Bun process (`conquest-venue`, `127.0.0.1:3500`)
serves `src/welcome.ts`: the landing page, `/health`, and `/assets/*`. Its stylesheet is
`src/design.ts`, a **verbatim copy** of WardByWard's `src/Design.ts` (tokens + glass card +
buttons). No second design system was invented. It has no database because a beacon has
nothing to query.

**Target — the tenant rail (the refactor).** WardByWard already renders `conquestPage`
(`/conquest`) and `conquestDeploymentPage` (`/conquestDESIGNER/deployment`) through
`publicShell` + `Design.CSS` + SurrealDB on `:3000`. The proven tenant pattern on this box is
nginx: one server block listing many hostnames, all proxying to the same app (see
`identity.`/`pay.`/`bonds.`/`wardai.` on `wardbyward.co.za`). So the end-state is:
`conquestdesigner.com` → nginx → **`:3000`**, with `/` routed to the Conquest surface.

When that lands, delete in one step: the `conquest-venue` PM2 app, the `:3500` port, and
`src/welcome.ts` + `src/design.ts`. One app, one process, one design system, one database.

**Editing `/home/wardair/thegearmerchant`.** Permitted when the refactor needs it. The
read-only rule was a guard against choosing a parallel path without reading code reality —
not a permanent ban. Before any edit: read the route table, the page module, `Shared.ts`
(`publicShell`), `Design.ts`, and the DB access pattern the neighbouring pages use. Then edit
the existing rail; never add a second one.

---

## 2 · Architecture

```
                   visitor
                      │  https://conquestdesigner.com  (canonical, served directly)
                      │  https://www.conquestdesigner.com
                      ▼
              Cloudflare (JNB edge · WAF · TLS termination)
                      │  :443 to origin — Cloudflare IPs only; the
                      │  OCI security list admits no one else
                      ▼
    nginx :443  (system service, unchanged except one added site file)
      ├─ default_server  wardbyward           → 127.0.0.1:3000  (merchant-api)
      └─ conquestdesigner.com (+ www)         → 127.0.0.1:3500  (conquest-venue)
                                                    │
                                          ┌─────────▼──────────┐
                                          │ Bun venue (PM2)    │
                                          │ src/server.ts      │
                                          │ SAMPLE_MODE=true   │
                                          │ .env: AVC keys     │
                                          └────────────────────┘
```

**Process table (one box, shared with the live WardByWard service):**

| PM2 app | Port | State |
|---|---|---|
| `surrealdb` | `127.0.0.1:8000` | existing, untouched |
| `merchant-api` | `3000` | existing, untouched — Conquest never uses 3000 |
| `conquest-venue` | `127.0.0.1:3500` | new, `bun src/server.ts --port 3500`, fork, 1 instance |

Budget: 952 MB RAM (~526 MB free), 1 vCPU. The venue idles at ~60 MB;
`max_memory_restart: 320M` is the hard stop.

**Why 3500:** 3000 is WardByWard's, 8000 is SurrealDB's, 8080 is the local WSL nginx. 3500 is
free, memorable, and inside the ephemeral range without colliding with either service.

---

## 3 · The reference point (do not touch)

These are the "working reference" the owner requires to survive any Conquest mistake:

| Path | sha256 | Rule |
|---|---|---|
| `/etc/nginx/sites-available/wardbyward` | `051281bb0ddfed7c4b87f1aca1748ad569cfc59ebdedd5057d272d6206acf339` | read-only |
| `/home/wardair/thegearmerchant/ecosystem.config.cjs` | `8c6926941e9e4b2f7974299f20a9cda8ba730164654037edb15dbfbf1a24413e` | read-only |
| `/home/wardair/thegearmerchant/**` | — | never written by this project |

`deploy/deploy-conquest.sh` re-checks both hashes **before and after** every run and aborts on
any drift. Conquest is added as a **separate** nginx site file and a **separate** PM2 app.
`pm2 save` rewrites the dump additively (existing entries remain); it does not edit any file in
the table.

---

## 4 · Artifacts (every file that matters)

| File | Role |
|---|---|
| `ecosystem.config.cjs` | PM2 app definition. House shape copied from WardByWard: `loadEnv(__dirname/.env)`, `script: 'bun'`, `interpreter: 'none'`, `cwd: __dirname`, fork, 1 instance, `max_memory_restart: 320M`. |
| `deploy/nginx/conquestdesigner.conf` | The site file that gets installed. `listen 443 ssl`, `server_name conquestdesigner.com www.conquestdesigner.com`, the existing CF Origin cert, `proxy_pass http://127.0.0.1:3500`, standard proxy headers. |
| `deploy/deploy-conquest.sh` | The only deploy path. Guard → typecheck → rsync → `pm2 startOrReload` → health → optional site install → reload → prove → post-guard. |
| `deploy/gen-avc-key.ts` | Mints the Ed25519 AVC pair **on the box**, writes `.env` 0600, prints only the public key id. `--force` rotates. |
| `/home/ubuntu/conquest/.env` | Box-local secrets. Never in git, never rsynced. Key id currently `avc-26b9eb3c37ed`. |

**Deploy invariant:** `rsync --exclude .env`. The first transfer accidentally shipped the
local dev `.env`; keys were rotated on the box immediately and exclusion is now permanent.

---

## 5 · The change plan (execution order, with status)

Status legend: `[ ]` pending · `[x]` done · `[!]` owner action required.

### D0 · Hygiene — `[x]`
- [x] Code synced to `/home/ubuntu/conquest` (1.5 MB, zero runtime dependencies).
- [x] AVC keypair generated **on the box**; local `.env` rotated away; `.env` excluded.
- [x] Bogus PM2 entry (`ecosystem.conquest`, created by a `#`-comment parse failure) deleted.
- [x] Abandoned `conquestdesigner.com` self-signed cert/key deleted.
- [x] Reference hashes recorded (§3) and verified identical after cleanup.
- [x] `wardbyward` site file and `sites-enabled` symlink untouched; no Conquest site installed.

### D1 · Serve the canonical domain — `[x]` (done 2026-10-23)
```bash
./deploy/deploy-conquest.sh --nginx
```
Exit criteria:
- `curl -fsS http://127.0.0.1:3500/health` → `{"ok":true}` (on the box).
- `ssh wardbyward "curl -kfsS --resolve conquestdesigner.com:443:127.0.0.1 \
   https://conquestdesigner.com/health"` → `{"ok":true}`.
- `sudo nginx -t` clean; `/etc/nginx/sites-enabled/conquestdesigner` present.
- Script prints `reference intact` at the end.

**Result (2026-10-23):** `nginx -t` clean, site file installed, reference intact.
`https://conquestdesigner.com/health` → `{"ok":true,"venue":"ConquestDesignEngineeringHQ"}`,
HTTP 200 through Cloudflare, TLS verified, logo served `image/jpeg`.

### D2 · Edge: DNS + TLS — `[x]` done (owner set the apex record + SSL mode Full)
1. Zone **`conquestdesigner.com`** → DNS → **delete** the misspelled
   `conguestdesigner.conquestdesigner.com` record, and **add** the apex:
   `@` → `A` → `84.12.96.65` → **Proxied**. Keep `www` → `CNAME conquestdesigner.com`
   (Proxied). This is what makes the domain resolvable at all.
2. Zone **`conquestdesigner.com`** → SSL/TLS → Overview → mode **Full**.
   Do not use Flexible (it would send plaintext to the origin, which listens on 443 only).
   Leave `wardbyward.co.za` exactly as it is.

Exit criteria:
- `curl -fsS https://conquestdesigner.com/health` from anywhere → `{"ok":true}`.
- `https://conquestdesigner.com/` renders the venue; `https://www.conquestdesigner.com/` too.

Optional later (free, 2 min): Origin CA cert for the domain → switch to **Full (strict)** (§1).

### D3 · Verify the venue itself — `[x]` beacon verified; exchange not deployed
- `/` renders listings; `/agents` shows book number + masked card; `/avc/<id>` renders.
- `/listing/register` returns 402 with a challenge (x402 stub), then issues on retry.
- Trace written per request; certificate verifies from signed bytes (`/avc/<id>/verify`).
- Health of WardByWard is unaffected: `curl -fsS https://wardbyward.co.za/health`.

### D4 · Harden — `[ ]` (post-submission)
- WAF + rate limit on `/listing/register`; real-IP restore (`set_real_ip_from` CF ranges +
  `CF-Connecting-IP`) once request logs matter.
- Upgrade to `Full (strict)` if the zone was left on `Full`.

### D5 · Optional strict TLS — `[ ]` (post-submission)
Issue the Origin CA cert for `conquestdesigner.com`, point the two cert lines at it, reload,
switch the zone to **Full (strict)**. See §1. Never edit `wardbyward`.

---

## 6 · What is actually deployed (be precise)

The deployed artifact is the **public submission build**: the full exchange, deterministic
(`SAMPLE_MODE=true`), with the 8-row sample book. It is honest to call it a **working venue**.

It is **not** yet the private-physics venue. `VENUE_MODE` is read by nothing; `SunIndex`,
`NumberCatalog`, `SettlementRail`, `LedgerChain`, `FeeSplit` and `AgentDirectory` do not exist
(see `PRODUCTION-BUILD-PLAN.md` §3.2, Phase B2/B3). When they land they are **additive behind
ports** and the public build must stay green with `VENUE_MODE=public`.

Public copy must therefore say: live venue, sample-mode deterministic exchange; private physics
not deployed. Never claim otherwise on the site or in the deck.

---

## 7 · Failure signatures (diagnose in this order)

| Symptom | Cause | Fix |
|---|---|---|
| `502` from nginx | PM2 app down or on the wrong port | `pm2 logs conquest-venue`, `ss -ltnp \| grep 3500` |
| `404` from nginx for the domain | site file not enabled, or `server_name` mismatch | `ls /etc/nginx/sites-enabled`, `nginx -T \| grep server_name` |
| `522` from Cloudflare | DNS record missing/not proxied, or points elsewhere (`conguestdesigner.conquestdesigner.com` typo, no apex) | add the apex A record |
| `526` from Cloudflare | zone is Full (strict) but the origin cert does not name `conquestdesigner.com` | set Full, or install an Origin CA cert for the domain (D5) |
| `530` from Cloudflare | hostname not in the zone / origin unresolved | DNS |
| Cert warning on `--resolve` probe | origin cert is a public CA cert but the probe skipped verification | expected; probe uses `-k` |
| `ABORT: … changed` | a reference file moved | stop, diff against §3, restore before anything else |

---

## 8 · Rollback

```bash
./deploy/deploy-conquest.sh --rollback
```
Removes **only** `/etc/nginx/sites-enabled/conquestdesigner`,
`/etc/nginx/sites-available/conquestdesigner`, and the `conquest-venue` PM2 app; reloads nginx;
re-checks the reference hashes. WardByWard's `default_server`, cert, `merchant-api`, SurrealDB
and all of `/home/wardair/thegearmerchant` are outside the blast radius.

---

## 9 · Open decisions (do not silently resolve)

| # | Question | Default until answered |
|---|---|---|
| D3 | Reissuance fee `$0.25` is fractional vs the whole-unit rule | keep `$0.25` as the one documented x402-unit exception; listing price stays whole-rand |
| D6 | `docs/ai_evaluator_targeting_scorecard.md` claims "live on OCI" and a file that does not exist | mark it TARGET or move it out of the public repo |
| D7 | ~~Serve the `.com` directly, or keep the edge 301?~~ | **closed 2026-10-23:** served directly; the zone already points at the box |

---

## 10 · Resume protocol (read this after the detour)

```bash
# 1 · Is anything of ours running?
ssh wardbyward 'pm2 list; ss -ltnp | grep 3500'

# 2 · Is the reference still intact?
ssh wardbyward 'sudo -n sha256sum /etc/nginx/sites-available/wardbyward \
  /home/wardair/thegearmerchant/ecosystem.config.cjs'
#    expect 051281bb… and 8c692694…  (see §3)

# 3 · Which Conquest pieces exist on the box?
ssh wardbyward 'ls -l /etc/nginx/sites-enabled/; ls -a /home/ubuntu/conquest | head -30'

# 4 · What is the repo state?
git -C /home/wardair/ConquestDESIGNER status --short; git log --oneline -5

# 5 · Then: D1 (if not installed) → D2 (owner: apex A record + Full) → D3 verify
./deploy/deploy-conquest.sh --nginx
```

Read in this order: this file → `docs/PRODUCTION-BUILD-PLAN.md` §3 (the public/private cut) →
§8–§8c (audit + flight map) → `AGENTS.md` §0 (anti-hallucination facts).

---

## 11 · Change log

| Date | Change |
|---|---|
| 2026-10-23 | Decision recorded: canonical host is `conquestdesigner.wardbyward.co.za`; `.com` is an edge 301. D0 complete; D1–D5 planned. Reference hashes pinned. |
| 2026-10-23 | **Revised against the live Cloudflare zone:** `.com` is registered and already proxied to the box, so it is served **directly**. Apex A record + SSL mode Full are the only owner actions; no redirect, no subdomain. |
