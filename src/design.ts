/**
 * WARD BY WARD DESIGN RAIL — vendored verbatim from the proven stack.
 *
 * Source: /home/wardair/thegearmerchant/src/Design.ts (read-only here).
 * Single source of truth for the :root tokens and the base stylesheet. Do not
 * re-declare tokens or .card/.btn in a private <style> block: import this.
 *
 * Kept as a byte-for-byte copy because the two repos deploy separately. The
 * target end-state is one app (conquestdesigner.com served by WardByWard on
 * :3000, as the other tenant hosts are), at which point this file is deleted
 * and the import points at the original.
 */

// Single source of truth for design tokens + base stylesheet.
// Any page that wants the app look must consume ROOT_TOKENS + CSS from here —
// never re-declare :root tokens or .card/.btn in a private <style> block.

const ROOT_TOKENS = `:root{--bg-main:#0a1628;--bg-gradient:linear-gradient(165deg,#080f1e 0%,#0c1a2e 40%,#0a1628 100%);--bg-card:#0f1d32;--bg-card-inner:#091322;--accent-gold:#d4a843;--accent-gold-light:#f0d78c;--accent-green:#00e87b;--text-primary:#eef2f7;--text-muted:#7a8da0;--border:#162338;--border-accent:#1e3352;--shell-max:1120px;--gap-card:16px;--gap-tile:10px}`

export const CSS = `
${ROOT_TOKENS}
/* Shared report table (used by hubs' Shift×Endpoint×CRUD matrix and report
   pages). min-width makes narrow screens scroll the table horizontally via the
   .table-wrap overflow-x:auto wrapper instead of crushing columns. */
.rpt-tbl{width:100%;min-width:560px;border-collapse:collapse;font-size:.78rem}
.rpt-tbl th{font-size:.58rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);text-align:left;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.14)}
.rpt-tbl td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
.rpt-tbl tr:last-child td{border-bottom:none}
.rpt-tbl .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.rpt-tbl .code{font-weight:700;color:var(--accent-gold-light);letter-spacing:.03em;white-space:nowrap}
.rpt-tbl .muted{color:var(--text-muted)}
.rpt-tbl .pos{color:var(--accent-green);font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
.skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:200}
.skip-link:focus{position:fixed;left:8px;top:8px;width:auto;height:auto;padding:10px 16px;background:var(--accent-gold);color:#061325;border-radius:6px;font-weight:700;font-size:.85rem;overflow:visible}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg-gradient);background-attachment:fixed;color:var(--text-primary);min-height:100vh;overflow-x:hidden;min-width:0}
html{overflow-x:hidden;max-width:100vw;min-width:0}
/* Unified sans-serif heading system — Arial everywhere, weights kept clean
   (600) to match the compliance subheadings and the site wordmark. Sizes stay
   context-driven (.card h2, .rpt-title, inline) so nothing shifts visually. */
h1,h2,h3,h4{font-family:Arial,Helvetica,sans-serif;font-weight:600}
a{color:var(--accent-gold);text-decoration:none}a:hover{text-decoration:underline}
.wrap{width:100%;max-width:var(--shell-max);margin:0 auto;padding:24px 16px;box-sizing:border-box}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--gap-card);align-items:stretch}
.card-grid .card{margin-bottom:0;height:100%}
.hdr{text-align:center;margin-bottom:28px}.hdr h1{font-size:1.5rem;font-weight:700;color:var(--accent-gold);letter-spacing:.5px}.hdr p{font-size:.8rem;color:var(--text-muted);margin-top:4px}
.nav{display:flex;gap:0;margin-bottom:20px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg-card-inner)}
.nav a,.nav span{flex:1;text-align:center;padding:8px 4px;font-size:.65rem;color:var(--text-muted);text-decoration:none;border-right:1px solid var(--border);transition:all .15s;white-space:nowrap}
.nav a:last-child,.nav span:last-child{border-right:none}
.nav span.active{color:var(--accent-gold);font-weight:600;background:rgba(197,160,89,.08)}
.nav span.locked{color:var(--border);pointer-events:none}
.nav a:hover{color:var(--accent-gold-light);background:rgba(197,160,89,.05)}
/* Glassmorphic card skin — the "transparent ledger" look applied app-wide.
   Same surface as REPORT_CSS .rpt-glass so no page shows a different material. */
.card{position:relative;background:linear-gradient(165deg,rgba(20,45,80,.55),rgba(9,22,41,.45) 55%,rgba(5,14,26,.55));border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:24px;margin-bottom:16px;box-shadow:0 24px 60px -28px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.09);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);overflow:hidden}
.card::after{content:'';position:absolute;inset:0;border-radius:18px;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.05),transparent 32%)}
.card h2{font-family:Arial,Helvetica,sans-serif;font-size:1.18rem;font-weight:600;color:var(--accent-gold-light);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.09);letter-spacing:.01em}
label{display:block;font-size:.75rem;color:var(--text-muted);margin-bottom:4px;margin-top:12px}label:first-child{margin-top:0}
input[type=text],input[type=tel],input[type=password],input[type=number],textarea,select{width:100%;padding:10px 12px;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:.85rem;font-family:inherit}
input:focus,textarea:focus{outline:none;border-color:var(--accent-gold)}
textarea{resize:vertical;min-height:60px}
input[type=file]{display:none}
.btn{display:block;width:100%;padding:12px;border:none;border-radius:8px;font-size:.85rem;font-weight:600;cursor:pointer;margin-top:16px;font-family:inherit;transition:opacity .15s,transform .1s,box-shadow .15s}.btn:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.25)}.btn:active{transform:translateY(0);opacity:1;box-shadow:none}.btn:focus-visible{outline:2px solid var(--accent-green);outline-offset:2px}
.btn-gold{background:var(--accent-gold);color:#061325}
.btn-green{background:var(--accent-green);color:#061325}
.btn-outline{background:transparent;border:1px solid var(--border-accent);color:var(--accent-gold-light)}
.num-badge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:.68rem;font-weight:700;color:var(--bg-main);flex-shrink:0;line-height:1;vertical-align:middle}
.btn-sm{display:inline-block;width:auto;padding:6px 14px;font-size:.75rem;margin-top:8px}
.btn-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.btn-row>*{flex:1;min-width:0}
.btn-row .btn{margin-top:0}
.banner{background:rgba(197,160,89,.12);border-bottom:1px solid rgba(197,160,89,.3);padding:10px 16px}
.banner-inner{max-width:var(--shell-max);margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.8rem}
.banner-title{color:var(--accent-gold)}
.banner-sub{color:var(--text-muted)}
.banner-btn{background:var(--accent-gold);color:#061325;padding:4px 10px;border-radius:4px;font-weight:600;text-decoration:none;font-size:.75rem;white-space:nowrap}
.home-bar{display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;padding:12px;margin-top:16px;border:1px solid var(--border-accent);border-radius:8px;background:var(--bg-card);transition:border-color .15s,color .15s}
.home-bar:hover{border-color:var(--accent-gold)}
.home-bar-label{font-size:.8rem;font-weight:600;color:var(--accent-gold-light)}
.home-bar:hover .home-bar-label{color:var(--accent-gold)}
.ok{background:rgba(0,255,136,.1);border:1px solid var(--accent-green);border-radius:8px;padding:12px;margin-bottom:16px;font-size:.85rem;color:var(--accent-green)}
.err{background:rgba(255,80,80,.1);border:1px solid #ff5050;border-radius:8px;padding:12px;margin-bottom:16px;font-size:.85rem;color:#ff5050}
.row{display:flex;flex-wrap:wrap;gap:12px}.row>*{flex:1;min-width:0}
.sm{font-size:.75rem;color:var(--text-muted)}
.progress{background:var(--bg-card-inner);border-radius:6px;height:8px;margin:8px 0;overflow:hidden}
.progress-fill{height:100%;background:var(--accent-gold);border-radius:6px}
/* Funding line (fundLine) */
.fund-row{padding:12px 0 14px}
.fund-row-top{display:flex;justify-content:space-between;align-items:start;gap:8px}
.fund-row-left{flex:1}
.fund-row-tag{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.fund-row-label{font-size:.8rem;font-weight:600;color:var(--text-primary)}
.fund-row-sub{font-size:.68rem;color:var(--text-muted);margin-top:2px}
.fund-row-amt{text-align:right;font-size:.8rem;font-weight:700;white-space:nowrap}
.fund-row-amt-target{font-weight:400;color:var(--text-muted);font-size:.7rem}
.progress.fund-row-progress{margin-top:6px;height:6px}
.progress.fund-row-progress .progress-fill{height:6px}
.fund-badge{font-size:.6rem;padding:2px 8px;border-radius:12px;white-space:nowrap}
.fund-badge.funded{background:rgba(0,255,136,.1);color:var(--accent-green)}
.fund-badge.pct{background:rgba(255,255,255,.05);color:var(--text-muted)}
.feat{display:flex;align-items:center;gap:6px;font-size:.8rem;margin-bottom:6px;color:var(--text-muted)}.feat::before{content:'';width:6px;height:6px;background:var(--accent-gold);border-radius:50%;flex-shrink:0}
.pay-box{background:var(--bg-card-inner);border:1px solid var(--border);border-radius:8px;padding:14px;margin:10px 0;font-size:.8rem}
.pay-box .lbl{color:var(--text-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.pay-box .val{color:var(--accent-gold-light);font-weight:500}.pay-box .val.green{color:var(--accent-green)}
.pay-box .row{margin-top:6px}
.pay-box .note,.note-tiny{font-size:.62rem;color:var(--text-muted);margin-top:4px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.form-flex{display:flex;gap:8px;align-items:end;flex-wrap:wrap}
.form-flex .f{flex:1;min-width:140px}
.tx-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)}
.tx-row .tx-desc{min-width:0;padding-right:10px}
.tx-row .tx-desc p{font-size:.8rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0}
.tx-row .tx-amt{font-size:.85rem;font-weight:700;white-space:nowrap}
.note-sm{font-size:.68rem;color:var(--text-muted)}
.note-xs{font-size:.6rem;color:var(--text-muted);margin-top:2px}
.inv{margin-top:20px;text-align:center;font-size:.65rem;color:var(--text-muted);opacity:.4}
.upload-zone{border:2px dashed var(--border-accent);border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color .15s;margin:8px 0}
.upload-zone:hover{border-color:var(--accent-gold)}
.upload-zone .upload-icon{font-size:1.5rem;margin-bottom:6px}
.upload-zone p{font-size:.75rem;color:var(--text-muted)}
/* Compact horizontal attach-row (mobile-first pay pages) */
.upload-zone.upload-row{padding:10px 12px;display:flex;align-items:center;gap:8px;text-align:left;margin:8px 0}
.upload-zone.upload-row .upload-icon{font-size:1.05rem;margin:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--bg-card-inner);border-radius:6px;flex-shrink:0}
.upload-zone.upload-row p{flex:1;margin:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.upload-zone.upload-row .upload-preview{width:36px;height:36px;object-fit:cover;border-radius:6px;margin:0;flex-shrink:0}
.upload-zone.upload-row .upload-actions{margin:0;flex-shrink:0}
.upload-zone.upload-row .upload-actions button{padding:6px 10px;font-size:.68rem;white-space:nowrap}
/* Open-book banking details: card image + details side by side */
.bank-book{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);border:1px solid var(--bank-accent,var(--border));border-radius:12px;overflow:hidden;margin:12px 0}
.bank-book.single{grid-template-columns:minmax(0,1fr)}
.bank-book .bank-page{padding:12px}
.bank-card-page{display:flex;align-items:center;justify-content:center;background:var(--bg-card-inner);border-right:1px dashed var(--border)}
.bank-card-page img{display:block;width:100%;max-width:150px;aspect-ratio:1/1.586;object-fit:cover;object-position:center top;border-radius:8px;border:1px solid var(--border);box-shadow:0 4px 14px rgba(0,0,0,.35)}
.bank-details-page{display:flex;flex-direction:column;justify-content:center;gap:4px}
.bank-details-page .bdd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:.72rem;padding:6px 0;border-bottom:1px solid var(--border)}
.bank-details-page .bdd:last-child{border-bottom:none}
.bank-details-page .bdd .lbl{color:var(--text-muted);font-size:.6rem;text-transform:uppercase;letter-spacing:.4px;flex-shrink:0}
.bank-details-page .bdd .val{color:var(--bank-accent,var(--accent-gold-light));font-weight:700;text-align:right;font-size:.76rem;word-break:break-word;min-width:0}
.upload-preview{max-width:100%;max-height:120px;border-radius:6px;margin-top:8px;display:none}
.upload-actions{display:flex;gap:6px;margin-top:8px;justify-content:center}
.upload-actions button{padding:6px 12px;font-size:.7rem;border-radius:6px;border:1px solid var(--border-accent);background:transparent;color:var(--accent-gold-light);cursor:pointer;font-family:inherit}
.upload-actions button:hover{background:rgba(197,160,89,.1)}
.motivation-box{background:var(--bg-card-inner);border:1px solid var(--border);border-radius:8px;padding:14px;margin:10px 0;font-size:.8rem;color:var(--accent-gold-light);font-style:italic}
/* Pay-by-Bank launcher strip — rendered above the manual EFT booklet.
   Accent is themed per fund via the inline --paybank-accent custom property
   (set by payByBankHtml); falls back to the platform gold/neutral palette. */
.paybank{background:var(--bg-card-inner);border:1px solid var(--paybank-accent,var(--border));border-radius:12px;padding:14px;margin:12px 0}
.paybank-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.paybank-title{font-size:.65rem;text-transform:uppercase;letter-spacing:.5px;color:var(--paybank-accent,var(--text-muted))}
.paybank-amount{font-size:1.05rem;font-weight:700;color:var(--paybank-accent,var(--accent-green))}
.paybank-ref{font-size:.72rem;color:var(--text-muted);margin-bottom:10px;line-height:1.6}
.paybank-ref strong{color:var(--paybank-accent,var(--accent-gold-light))}
.paybank-banks{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;margin:10px 0}
.paybank-bank{display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px 2px;border-radius:8px;border:1px solid var(--paybank-accent,var(--border));background:var(--bg-card);color:var(--paybank-accent,var(--accent-gold-light));font-size:.6rem;font-weight:600;cursor:pointer;font-family:inherit;line-height:1.2;text-align:center;transition:all .15s}
.paybank-bank:hover,.paybank-bank:active{border-color:var(--paybank-accent,var(--accent-gold));color:var(--paybank-accent,var(--accent-gold));background:color-mix(in srgb,var(--paybank-accent,var(--accent-gold)) 10%,transparent)}
.paybank-copy{margin-top:10px}
/* One-tap field copy buttons (ID / ward reference / account) + the cross-bank
   helper line. Themed per fund via --paybank-accent like the rest of the strip. */
.paybank-copy-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}
.paybank-copy-btn{font-size:.66rem;font-weight:600;padding:7px 10px;border-radius:8px;border:1px solid var(--paybank-accent,var(--border-accent));background:var(--bg-card);color:var(--paybank-accent,var(--accent-gold-light));cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s}
.paybank-copy-btn:hover,.paybank-copy-btn:active{border-color:var(--paybank-accent,var(--accent-gold));background:color-mix(in srgb,var(--paybank-accent,var(--accent-gold)) 10%,transparent)}
.paybank-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);background:rgba(6,19,37,.97);border:1px solid var(--accent-gold);color:var(--accent-gold-light);padding:10px 16px;border-radius:8px;font-size:.75rem;font-weight:600;z-index:200;opacity:0;pointer-events:none;transition:opacity .25s;max-width:90%;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.4)}
.paybank-toast.show{opacity:1}
/* Capitec Scan-to-Pay QR tiles + fullscreen overlay */
.paybank-qr{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0}
.paybank-qr-single{grid-template-columns:1fr}
.qr-tile{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);cursor:pointer;font-family:inherit;transition:border-color .15s}
.qr-tile:hover,.qr-tile:active{border-color:var(--accent-gold)}
.qr-tile img{width:100%;max-width:150px;height:auto;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:6px;padding:4px;border:1px solid var(--border)}
.qr-tile span{font-size:.6rem;font-weight:600;color:var(--accent-gold-light);text-align:center;line-height:1.3}
.paybank-hint{font-size:.66rem;color:var(--text-muted);text-align:center;line-height:1.5;margin:4px 0 10px}
.paybank-hint strong{color:var(--paybank-accent,var(--accent-gold-light))}
/* Payment-card family: same shell as the pay-by-bank master box */
.pay-card{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:1.25rem;margin:1.25rem 0}
.pay-card-title{display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:var(--text-primary);opacity:.85;margin:0 0 .75rem}
.pay-label{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin:0 0 .5rem}
.pay-control{width:100%;padding:.7rem .9rem;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:.9rem;font-family:inherit;font-variant-numeric:tabular-nums;cursor:pointer;transition:border-color .15s}
.pay-control:focus-visible{border-color:var(--accent-gold);outline:none}
.pay-custom{display:none;margin-top:.75rem}
.pay-custom input{width:100%;padding:.7rem .9rem;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:.9rem;font-family:inherit;font-variant-numeric:tabular-nums}
.pay-panel{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:1rem;margin-top:1rem}
/* Segmented payment-rail selector — collapsed donate surfaces. Each rail's
   interactive card stays hidden until its tab is tapped, so a donate page
   never renders a single long vertical scroll of every payment option. */
.pay-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:1.25rem 0 .25rem}
.pay-tab{flex:1;min-width:0;padding:9px 6px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card-inner);color:var(--text-muted);font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-family:inherit;cursor:pointer;line-height:1.25;text-align:center;transition:all .15s;-webkit-tap-highlight-color:transparent}
.pay-tab small{display:block;font-size:.55rem;font-weight:600;text-transform:none;letter-spacing:.02em;color:var(--text-muted);margin-top:2px;opacity:.75}
.pay-tab:hover{border-color:var(--border-accent);color:var(--accent-gold-light)}
.pay-tab.active{border-color:var(--accent-gold);background:color-mix(in srgb,var(--accent-gold) 12%,var(--bg-card-inner));color:var(--accent-gold-light);box-shadow:inset 0 0 0 1px var(--accent-gold)}
.pay-tab.active small{color:var(--accent-gold)}
.pay-pane{display:none}
.pay-pane.active{display:block;animation:payFade .18s ease}
@keyframes payFade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
.qr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:300;display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;padding:20px}
.qr-overlay.show{display:flex}
.qr-overlay img{width:min(80vw,320px);height:auto;aspect-ratio:1;object-fit:contain;background:#fff;border-radius:10px;padding:10px}
.qr-overlay .qr-close{background:var(--accent-gold);color:#061325;border:none;border-radius:8px;padding:10px 22px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit}

/* ── Main Menu (WardByWard Menu) tiles ──────────────────────────────────── */
.menu-btn{display:inline-block;padding:5px 12px;border-radius:6px;font-size:.72rem;font-weight:600;text-decoration:none;border:1px solid var(--accent-gold);color:var(--accent-gold);background:rgba(197,160,89,.08);transition:all .15s;white-space:nowrap}
.menu-btn:hover{background:var(--accent-gold);color:#061325}
.menu-portfolio{background:var(--bg-card);border:1px solid var(--border-accent);padding:18px}
.portfolio-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.portfolio-label{font-size:.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:600}
.portfolio-total{font-size:2rem;font-weight:800;color:var(--accent-green);letter-spacing:.5px;line-height:1.1;margin-top:4px;font-variant-numeric:tabular-nums}
.portfolio-sub{font-size:.68rem;color:var(--text-muted);margin-top:4px}
.portfolio-live{display:inline-flex;align-items:center;gap:5px;font-size:.6rem;font-weight:700;color:var(--accent-green);background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.3);padding:3px 8px;border-radius:12px;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 6px var(--accent-green);animation:pulse 1.6s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.portfolio-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px}
.portfolio-stat{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:8px;padding:8px 6px;text-align:center}
.portfolio-stat .n{font-size:1rem;font-weight:700;color:var(--accent-gold-light);font-variant-numeric:tabular-nums}
.portfolio-stat .l{font-size:.54rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-top:10px}
.menu-tile{display:flex;flex-direction:column;gap:3px;min-height:96px;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);text-decoration:none;transition:all .15s}
.menu-tile:hover,.menu-tile:active{border-color:var(--accent-gold);color:var(--accent-gold);background:color-mix(in srgb,var(--accent-gold) 10%,transparent)}
.menu-tile-icon{display:flex;align-items:center;line-height:1;color:var(--accent-gold-light)}
.menu-tile-icon svg{width:20px;height:20px;display:block}
.menu-tile:hover .menu-tile-icon{color:var(--accent-gold)}
.menu-tile-label{font-size:.72rem;font-weight:700;line-height:1.15}
.menu-tile-desc{font-size:.62rem;color:var(--text-muted);line-height:1.25;flex:1}
.menu-tile-amount{font-size:.68rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
.menu-tile-progress{background:var(--bg-card-inner);border-radius:4px;height:4px;overflow:hidden}
.menu-tile-progress span{display:block;height:100%;background:var(--accent-green);border-radius:4px}
.menu-tile-lock{font-size:.58rem;color:var(--accent-gold);font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.menu-cta{display:block;text-align:center;padding:11px;border-radius:8px;border:1px solid var(--accent-gold);background:var(--accent-gold);color:#061325;font-size:.75rem;font-weight:700;text-decoration:none;margin-top:12px}
.menu-cta:hover{background:var(--accent-gold-light);color:#061325;text-decoration:none}
.menu-cta-outline{display:block;text-align:center;padding:10px;border-radius:8px;border:1px solid var(--border-accent);background:transparent;color:var(--accent-gold-light);font-size:.7rem;font-weight:600;text-decoration:none;margin-top:8px}
.menu-cta-outline:hover{border-color:var(--accent-gold);color:var(--accent-gold);text-decoration:none}
/* Candidate-name redaction (stress test): text stays in the DOM for select/copy
   but renders invisible. Remove this rule to restore names everywhere. */
.redact{color:transparent;-webkit-text-fill-color:transparent}
@media(max-width:360px){
  .portfolio-stats{grid-template-columns:1fr 1fr}
  .nav{flex-wrap:wrap}
  .nav a,.nav span{flex:none;min-width:0;padding:8px 6px;font-size:.6rem}
  .bank-book{grid-template-columns:1fr}
  .bank-card-page{border-right:none;border-bottom:1px dashed var(--border)}
}

/* Orchestrator hero hotspot container */
.landing-container{width:100%;max-width:var(--shell-max);margin:0 auto;padding:0 1rem;box-sizing:border-box;overflow:hidden}
.orchestrator-wrap{position:relative;width:100%;max-width:100%;margin:0 auto 20px;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center}
.orchestrator-wrap img{width:100%;max-width:100%;height:auto;display:block;border-radius:12px;box-shadow:0 8px 32px rgba(212,175,55,.15);object-fit:contain}
.orchestrator-wrap .hotspot{position:absolute;border-radius:20px;cursor:pointer;transition:background .2s,box-shadow .2s,transform .15s;text-decoration:none}
.orchestrator-wrap .hotspot:hover{background:rgba(212,175,55,.30)!important;box-shadow:0 0 16px rgba(212,175,55,.5)!important;transform:scale(1.05)}
.orchestrator-wrap .hotspot::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--bg-card);color:var(--accent-gold-light);font-size:.65rem;font-weight:600;white-space:nowrap;padding:6px 12px;border-radius:8px;border:1px solid var(--accent-gold);pointer-events:none;opacity:0;transition:opacity .2s}
.orchestrator-wrap .hotspot:hover::after{opacity:1}
.hs-political{top:30%;left:14%;width:18%;height:18%}
.hs-economic{top:58%;left:11%;width:18%;height:18%}
.hs-social{top:82%;left:13%;width:18%;height:18%}
.hs-tech{top:30%;right:14%;width:18%;height:18%}
.hs-esg{top:58%;right:11%;width:18%;height:18%}
.hs-legal{top:82%;right:13%;width:18%;height:18%}
.reset-card{background:var(--bg-card-inner);border-left:3px solid var(--accent-gold);padding:14px;margin-bottom:20px;border-radius:0 8px 8px 0}
.reset-card-title{color:var(--accent-gold);font-size:1rem;margin:0 0 6px 0;padding:0;border:none}
.reset-card-text{font-size:.85rem;color:var(--text-primary);margin:0;line-height:1.5}
.btn-center{text-align:center;text-decoration:none}
.btn-sm{font-size:.72rem}

/* PESTEL accordion tree */
.pestel-gear{background:linear-gradient(145deg,#101622,#0a0d14);border:1px solid rgba(212,175,55,.25);border-radius:8px;margin-bottom:10px;overflow:hidden;transition:border-color .2s,box-shadow .2s}
.pestel-gear[open]{border-color:var(--accent-gold);box-shadow:0 4px 20px rgba(212,175,55,.12)}
.gear-header{padding:14px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:600;color:var(--text-primary);list-style:none}
.gear-header::-webkit-details-marker{display:none}
.gear-header::marker{display:none;content:''}
.gear-title{font-size:.82rem;display:flex;align-items:center;gap:8px}
.gear-badge{font-size:.72rem;color:var(--accent-gold);font-weight:600;white-space:nowrap}
/* Canonical disclosure accordion (details/summary) */
.mdl-acc{margin-top:8px}
.mdl-acc-summary{font-size:.7rem;color:var(--text-muted);cursor:pointer;list-style:none}
.mdl-acc-summary::-webkit-details-marker{display:none}
.mdl-acc-summary::marker{content:''}
.mdl-acc-body{margin-top:8px}
.shift-list{list-style:none;padding:4px 16px 14px;margin:0;border-top:1px solid rgba(255,255,255,.05)}
.shift-list li{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03)}
.shift-list li:last-child{border-bottom:none}
.shift-list a{color:var(--text-muted);text-decoration:none;font-size:.76rem;transition:color .15s}
.shift-list a:hover{color:var(--accent-gold)}
.shift-code{font-size:.62rem;font-weight:600;color:rgba(255,255,255,.25);margin-right:6px;font-family:monospace}

/* ── PESTEL Shift Pages (800px elastic desktop) ────────────────────────────── */
.shift-container{max-width:var(--shell-max);margin:0 auto;padding:0}
.shift-header{margin-bottom:20px}
.shift-tag{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent-gold);margin-bottom:6px;padding:3px 8px;border:1px solid rgba(197,160,89,.3);border-radius:4px;background:rgba(197,160,89,.08)}
.shift-header h2,.shift-header h1{font-family:Arial,Helvetica,sans-serif;font-size:1.15rem;font-weight:600;color:var(--accent-gold-light);margin:8px 0 4px;letter-spacing:.01em}
.shift-header p{font-size:.82rem;color:var(--text-muted);line-height:1.5;margin:0}
.shift-header .shift-sub{font-size:.68rem;color:var(--text-muted);margin:4px 0 0;letter-spacing:.02em}
.sec-label{font-size:.68rem;font-weight:700;color:#7a8da0;text-transform:uppercase;letter-spacing:.08em;margin:0}
.row-baseline{display:flex;justify-content:space-between;align-items:baseline}
.num-strong{font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums}
.ward-search-box{display:flex;gap:8px;margin-bottom:20px}
.ward-search-box input{flex:1;padding:10px 14px;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:.85rem;font-family:inherit}
.ward-search-box input:focus{outline:none;border-color:var(--accent-gold)}
.ward-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px}
.ward-badge{font-size:.68rem;font-weight:600;color:var(--accent-gold);background:rgba(197,160,89,.1);padding:3px 10px;border-radius:12px;display:inline-block;margin-bottom:6px;border:1px solid rgba(197,160,89,.25)}
.ward-card h3{font-size:.92rem;font-weight:600;color:var(--text-primary);margin:4px 0}
.ward-areas{font-size:.75rem;color:var(--text-muted);margin:4px 0 0}
.verification-box{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.verification-box label{display:block;font-size:.75rem;color:var(--text-muted);margin-bottom:6px}
.profile-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.profile-field{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.82rem}
.profile-field:last-child{border-bottom:none}
.profile-field span{color:var(--text-muted)}
.profile-field strong{color:var(--text-primary)}
.badge-success{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(0,232,123,.12);color:var(--accent-green);border:1px solid rgba(0,232,123,.28)}
.badge-dormant{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(255,255,255,.06);color:var(--text-muted);border:1px solid rgba(255,255,255,.12)}
.pill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:.62rem;font-weight:700;letter-spacing:.04em;white-space:nowrap}
.pill-green{background:rgba(0,232,123,.12);color:#00e87b;border:1px solid rgba(0,232,123,.28)}
.pill-gold{background:rgba(212,168,67,.12);color:#d4a843;border:1px solid rgba(212,168,67,.28)}
.pill-red{background:rgba(255,80,80,.12);color:#ff5050;border:1px solid rgba(255,80,80,.28)}
.pill-blue{background:rgba(59,130,246,.15);color:#93c5fd;border:1px solid rgba(59,130,246,.3)}
.pill-purple{background:rgba(139,92,246,.15);color:#c4b5fd;border:1px solid rgba(139,92,246,.3)}
.pill-cyan{background:rgba(0,229,255,.12);color:#00e5ff;border:1px solid rgba(0,229,255,.28)}
.pill-muted{background:rgba(255,255,255,.06);color:#7a8da0;border:1px solid rgba(255,255,255,.12)}
.pill-orange{background:rgba(255,107,53,.12);color:#ff6b35;border:1px solid rgba(255,107,53,.28)}
/* Identity card (renderIdentityCard) */
.id-card{background:#0B0E14;border:1px solid #1e3352;border-radius:10px;padding:16px 18px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,.3)}
.id-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:6px}
.id-card-id{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.id-card-name{font-size:.78rem;font-weight:700;color:#eef2f7}
.id-card-role{font-size:.58rem;color:#7a8da0;text-align:right}
.id-card-acct{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.id-card-acct-ref{font-family:'Courier New',Courier,monospace;font-size:.88rem;font-weight:700;color:#d4a843;letter-spacing:.06em}
.id-card-copy{cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#162338;padding:4px 10px;border-radius:6px;border:1px solid #1e3352}
.id-card-copy-code{font-family:'Courier New',Courier,monospace;font-size:.72rem;font-weight:600;color:#00E5FF;letter-spacing:.04em}
.id-card-copy-tip{font-size:.52rem;color:#7a8da0;transition:opacity .2s;opacity:0}
.id-card-cells{display:flex;gap:10px;flex-wrap:wrap}
.id-cell{flex:1;min-width:90px;background:#091322;border:1px solid #162338;border-radius:8px;padding:10px 12px}
.id-cell-label{display:flex;align-items:center;gap:5px;margin-bottom:4px}
.id-cell-label span{font-size:.52rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7a8da0}
.id-cell-value{font-size:.88rem;font-weight:700;font-variant-numeric:tabular-nums;color:#00e87b}
.id-cell-value.zar{color:#d4a843}
.id-cell-value.muted{color:#7a8da0}
.id-cell-note{font-size:.52rem;color:#7a8da0;margin-top:2px}
.id-claim{display:block;margin-top:12px;text-align:center;padding:10px;border-radius:6px;font-size:.72rem;font-weight:700;text-decoration:none;color:#0a1628;background:linear-gradient(135deg,#d4a843,#f0d78c);letter-spacing:.02em}
.nomination-form{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.nomination-form input{width:100%;padding:10px 12px;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:.85rem;font-family:inherit;margin-bottom:10px}
.nomination-form input:last-child{margin-bottom:0}
.nomination-form input:focus{outline:none;border-color:var(--accent-gold)}
.campaign-summary{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.campaign-summary h3{font-size:.88rem;font-weight:600;color:var(--text-primary);margin:0 0 10px}
.progress-bar{background:var(--bg-card-inner);border-radius:6px;height:8px;overflow:hidden;margin:8px 0}
.progress-bar .fill{height:100%;background:var(--accent-gold);border-radius:6px}
.poll-box{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.poll-box h3{font-size:.88rem;font-weight:600;color:var(--text-primary);margin:0 0 10px;line-height:1.4}
.poll-res-head{display:flex;justify-content:space-between;gap:10px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:10px 2px 6px;border-bottom:1px solid var(--border);margin-bottom:6px}
.poll-res-head .pr-head.all{color:var(--text-primary)}
.poll-res-head .pr-head.reg{color:var(--accent-gold-light);text-align:right}
.poll-res-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid var(--border)}
.poll-res-row:last-child{border-bottom:none}
.poll-res-name{font-size:.82rem;color:var(--text-primary);flex:1}
.poll-res-cohorts{display:flex;gap:22px;text-align:right;flex-shrink:0}
.pr-cohort{display:inline-flex;flex-direction:column;line-height:1.15;min-width:52px}
.pr-cohort b{font-size:.92rem;color:var(--text-primary)}
.pr-cohort em{font-size:.66rem;color:var(--text-muted);font-style:normal}
.pr-cohort.reg b{color:var(--accent-gold-light)}
.party-dropdown{width:100%;padding:10px 12px;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-size:.85rem;font-family:inherit}
.party-dropdown:focus{outline:none;border-color:var(--accent-gold)}
.shift-actions-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:24px;padding-top:16px;border-top:1px solid var(--border)}
.btn-shift-action{padding:10px 12px;font-size:.8rem;font-weight:600;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);cursor:pointer;text-align:center;transition:all .15s ease-in-out;font-family:inherit;text-decoration:none;display:block}
.btn-shift-action:hover{border-color:var(--accent-gold);color:var(--accent-gold);background:rgba(197,160,89,.06);text-decoration:none}
.btn-shift-action.primary{background:var(--accent-gold);color:#061325;border-color:var(--accent-gold)}
.btn-shift-action.primary:hover{background:var(--accent-gold-light);color:#061325}
.btn-shift-action:disabled{opacity:.35;cursor:not-allowed;border-style:dashed;pointer-events:none}
.shift-section{margin-top:14px}
.shift-section .card{margin-bottom:14px}
.shift-ward-results{border:1px solid var(--border);border-radius:8px;overflow-y:auto;max-height:264px;display:none;margin-bottom:16px}

/* ── Gear 2: Economic Pillar shift cards ────────────────────────────────────── */
.eco-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.eco-card h3{font-size:.88rem;font-weight:600;color:var(--text-primary);margin:0 0 4px}
.eco-card p{font-size:.78rem;color:var(--text-muted);margin:4px 0 0;line-height:1.5}
.stimulus-banner{background:linear-gradient(135deg,rgba(0,232,123,.15),rgba(0,232,123,.08));border:1px solid rgba(0,232,123,.3);border-radius:10px;padding:18px;margin-bottom:20px}
.stimulus-banner h3{margin:0 0 6px;font-size:1.05rem;font-weight:700;color:var(--accent-green)}
.stimulus-banner p{margin:0;opacity:.9;font-size:.78rem;color:var(--text-muted)}
.bond-rate-badge{display:inline-block;padding:3px 8px;font-size:.65rem;font-weight:700;border-radius:4px;background:rgba(0,232,123,.12);color:var(--accent-green);border:1px solid rgba(0,232,123,.28);margin-bottom:8px}
.bond-rate-badge.gold{background:rgba(197,160,89,.12);color:var(--accent-gold);border-color:rgba(197,160,89,.28)}

/* ── Gear 3: Social Pillar shift cards ──────────────────────────────────────── */
.social-banner{border-radius:10px;padding:18px;margin-bottom:20px}
.social-banner h3{margin:0 0 6px;font-size:1.05rem;font-weight:700}
.social-banner p{margin:0;opacity:.9;font-size:.78rem;color:var(--text-muted)}
.social-banner.gold{background:rgba(197,160,89,.15);border:1px solid rgba(197,160,89,.3)}
.social-banner.gold h3{color:var(--accent-gold-light)}
.social-banner.blue{background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3)}
.social-banner.blue h3{color:#93c5fd}
.social-tag{display:inline-block;padding:3px 8px;font-size:.65rem;font-weight:700;border-radius:4px;margin-bottom:8px}
.social-tag.gold{background:rgba(197,160,89,.12);color:var(--accent-gold);border:1px solid rgba(197,160,89,.28)}
.social-tag.blue{background:rgba(59,130,246,.12);color:#93c5fd;border:1px solid rgba(59,130,246,.28)}

/* ── Gear 4: Technological Pillar shift cards ───────────────────────────────── */
.tech-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.tech-card h3{font-size:.88rem;font-weight:600;color:var(--text-primary);margin:0 0 4px}
.tech-card p{font-size:.78rem;color:var(--text-muted);margin:4px 0 0;line-height:1.5}
.tech-badge{display:inline-block;padding:3px 8px;font-size:.65rem;font-weight:700;border-radius:4px;background:rgba(147,197,253,.12);color:#93c5fd;border:1px solid rgba(147,197,253,.28);margin-bottom:8px}
.tech-badge.gold{background:rgba(197,160,89,.12);color:var(--accent-gold);border-color:rgba(197,160,89,.28)}
.tech-banner{background:rgba(147,197,253,.1);border:1px solid rgba(147,197,253,.25);border-radius:10px;padding:18px;margin-bottom:20px}
.tech-banner h3{margin:0 0 6px;font-size:1.05rem;font-weight:700;color:#93c5fd}
.tech-banner p{margin:0;opacity:.9;font-size:.78rem;color:var(--text-muted)}

/* ── Gear 5: Governance & ESG Pillar shift cards ───────────────────────────── */
.gov-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.gov-card h3{font-size:.88rem;font-weight:600;color:var(--text-primary);margin:0 0 4px}
.gov-card p{font-size:.78rem;color:var(--text-muted);margin:4px 0 0;line-height:1.5}
.gov-badge{display:inline-block;padding:3px 8px;font-size:.65rem;font-weight:700;border-radius:4px;margin-bottom:8px}
.gov-badge.emerald{background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.28)}
.gov-badge.gold{background:rgba(251,191,36,.12);color:#fbbf24;border:1px solid rgba(251,191,36,.28)}
.gov-banner{border-radius:10px;padding:18px;margin-bottom:20px}
.gov-banner h3{margin:0 0 6px;font-size:1.05rem;font-weight:700}
.gov-banner p{margin:0;opacity:.9;font-size:.78rem;color:var(--text-muted)}
.gov-banner.emerald{background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25)}
.gov-banner.emerald h3{color:#34d399}
.gov-banner.gold{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25)}
.gov-banner.gold h3{color:#fbbf24}

@media(max-width:640px){
  .shift-actions-row{grid-template-columns:repeat(2,1fr)}
  .shift-header h2{font-size:1.05rem}
}
`

// ─── Executive Report Presentation ─────────────────────────────────────────────
// Shared by the public funding-transparency report (/transparency) and the
// admin PPFA compliance report (/admin/ppfa). MBA/PhD-grade: serif display
// headings, tabular figures, glassmorphic panels, hairline rules, KPI bands,
// cap-utilization bars, and a "prepared by" provenance footer. Pages inject
// REPORT_CSS inside their content via <style>; never re-declare .rpt-* rules
// privately.
export const REPORT_CSS = `
/* Report chrome — wider reading rail than the phone-first shell */
.rpt-wrap{max-width:780px}
.rpt{font-variant-numeric:tabular-nums;letter-spacing:.01em}
.rpt-serial{font-size:.62rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--accent-gold);margin:0 0 10px}
.rpt-title{font-family:Arial,Helvetica,sans-serif;font-size:2rem;line-height:1.1;font-weight:600;color:var(--accent-gold-light);margin:0 0 14px;letter-spacing:.01em}
.rpt-standfirst{font-size:.85rem;line-height:1.7;color:var(--text-muted);max-width:60ch;margin:0 0 20px}
.rpt-standfirst b,.rpt-standfirst strong{color:var(--accent-gold-light);font-weight:600}
/* Glassmorphic panel — the "transparent ledger" skin */
.rpt-glass{position:relative;border-radius:18px;background:linear-gradient(165deg,rgba(20,45,80,.55),rgba(9,22,41,.45) 55%,rgba(5,14,26,.55));border:1px solid rgba(255,255,255,.10);box-shadow:0 24px 60px -28px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.09);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%)}
.rpt-glass::after{content:'';position:absolute;inset:0;border-radius:18px;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.05),transparent 32%)}
.rpt-pad{padding:26px 24px}
.rpt-hero{padding:34px 28px 28px;margin-bottom:16px;overflow:hidden}
.rpt-hero::before{content:'';position:absolute;top:-60px;right:-60px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(197,160,89,.16),transparent 68%);pointer-events:none}
.rpt-hero::after{background:linear-gradient(115deg,rgba(255,255,255,.06),transparent 30%)}
.rpt-hero-meta{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.09)}
.rpt-meta-item{font-size:.68rem;color:var(--text-muted)}
.rpt-meta-item b{display:block;font-size:.78rem;color:var(--accent-gold-light);font-weight:600;font-variant-numeric:tabular-nums}
.rpt-meta-item b.green{color:var(--accent-green)}
.rpt-meta-item b.gold{color:var(--accent-gold)}
.rpt-meta-item b.red{color:#ff6b6b}
/* KPI band */
.rpt-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.rpt-kpi{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 16px 14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.rpt-kpi .l{font-size:.6rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px}
.rpt-kpi .v{font-size:1.35rem;font-weight:800;color:var(--accent-gold-light);line-height:1.05;font-variant-numeric:tabular-nums}
.rpt-kpi .v.green{color:var(--accent-green)}
.rpt-kpi .v.gold{color:var(--accent-gold)}
.rpt-kpi .v.red{color:#ff6b6b}
.rpt-kpi .s{font-size:.64rem;color:var(--text-muted);margin-top:6px;line-height:1.4}
/* Section */
.rpt-sec{margin-bottom:16px}
.rpt-sec-h{display:flex;align-items:baseline;gap:10px;margin:0 0 4px;padding-top:2px}
.rpt-sec-h .no{font-family:Arial,Helvetica,sans-serif;font-size:.85rem;color:var(--accent-gold);font-weight:600}
.rpt-sec-h h2{font-family:Arial,Helvetica,sans-serif;font-size:1.18rem;font-weight:600;color:var(--accent-gold-light);letter-spacing:.01em;margin:0}
.rpt-sec-sub{font-size:.72rem;color:var(--text-muted);margin:0 0 16px;line-height:1.6;max-width:70ch}
.rpt-sec-sub b,.rpt-sec-sub strong{color:var(--accent-gold-light);font-weight:600}
/* Tables */
.rpt-tbl{width:100%;min-width:560px;border-collapse:collapse;font-size:.78rem}
.rpt-tbl th{font-size:.58rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);text-align:left;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.14)}
.rpt-tbl td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);vertical-align:top}
.rpt-tbl tr:last-child td{border-bottom:none}
.rpt-tbl .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.rpt-tbl .code{font-weight:700;color:var(--accent-gold-light);letter-spacing:.03em;white-space:nowrap}
.rpt-tbl .muted{color:var(--text-muted)}
.rpt-tbl .pos{color:var(--accent-green);font-weight:700}
.rpt-tbl .warn{color:var(--accent-gold);font-weight:700}
.rpt-tbl .bad{color:#ff6b6b;font-weight:700}
/* Cap-utilization bar inside tables */
.rpt-ubar{margin-top:5px;min-width:96px}
.rpt-ubar .track{height:4px;border-radius:2px;background:rgba(255,255,255,.10);overflow:hidden}
.rpt-ubar .fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--accent-green),#7dffb8)}
.rpt-ubar .fill.warn{background:linear-gradient(90deg,var(--accent-gold),#e8d49a)}
.rpt-ubar .fill.bad{background:linear-gradient(90deg,#ff6b6b,#ff9d9d)}
.rpt-ubar .cap{font-size:.6rem;color:var(--text-muted);margin-top:3px;font-variant-numeric:tabular-nums}
/* Chips */
.rpt-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.56rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.rpt-chip.green{background:rgba(0,255,136,.12);color:var(--accent-green);border:1px solid rgba(0,255,136,.28)}
.rpt-chip.gold{background:rgba(197,160,89,.12);color:var(--accent-gold);border:1px solid rgba(197,160,89,.3)}
.rpt-chip.red{background:rgba(255,107,107,.12);color:#ff8f8f;border:1px solid rgba(255,107,107,.3)}
.rpt-chip.muted{background:rgba(255,255,255,.06);color:var(--text-muted);border:1px solid rgba(255,255,255,.12)}
/* Register (disclosure / over-limit lists) */
.rpt-reg{margin:0;padding:0;list-style:none}
.rpt-reg li{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 2px;border-bottom:1px solid rgba(255,255,255,.07)}
.rpt-reg li:last-child{border-bottom:none}
.rpt-reg .who{font-size:.82rem;color:var(--accent-gold-light);font-weight:600}
.rpt-reg .what{font-size:.68rem;color:var(--text-muted);margin-top:2px;line-height:1.5}
.rpt-reg .amt{font-size:.84rem;font-weight:700;color:var(--accent-gold-light);font-variant-numeric:tabular-nums;white-space:nowrap}
.rpt-reg .amt.bad{color:#ff8f8f}
.rpt-reg-empty{padding:16px 4px;font-size:.76rem;color:var(--text-muted);line-height:1.6}
/* Provenance footer — the "prepared by the office of" line */
.rpt-foot{margin-top:18px;padding:18px 22px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.03)}
.rpt-foot .line1{font-size:.68rem;color:var(--accent-gold-light);font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.rpt-foot .line2{font-size:.62rem;color:var(--text-muted);line-height:1.7;margin-top:6px;max-width:76ch}
.rpt-foot .line2 b{color:var(--accent-gold-light);font-weight:600}
.rpt-note{font-size:.62rem;color:var(--text-muted);line-height:1.6;margin:8px 2px 0}
.rpt-note b{color:var(--accent-gold-light);font-weight:600}
/* Segmented funding-mix bar */
.rpt-seg{display:flex;height:10px;border-radius:5px;overflow:hidden;margin:0 0 12px;background:rgba(255,255,255,.06)}
.rpt-seg span{height:100%}
.rpt-seg .loc{background:linear-gradient(90deg,#1f6fb2,#3b93d6)}
.rpt-seg .ent{background:linear-gradient(90deg,#c5a059,#e2c38a)}
.rpt-seg .int{background:linear-gradient(90deg,#7a4fa3,#a06fd1)}
.rpt-legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:4px}
.rpt-legend-item{display:flex;align-items:center;gap:6px;font-size:.64rem;color:var(--text-muted)}
.rpt-legend-item i{width:9px;height:9px;border-radius:3px;flex-shrink:0}
.rpt-legend-item i.loc{background:#3b93d6}
.rpt-legend-item i.ent{background:var(--accent-gold)}
.rpt-legend-item i.int{background:#a06fd1}
.rpt-legend-item b{color:var(--accent-gold-light);font-weight:700;font-variant-numeric:tabular-nums}
.rpt-reg-who{min-width:0}
.rpt-reg-who .what{overflow-wrap:break-word}
.rpt-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.rpt-actions a{flex:1;min-width:150px;text-align:center;padding:12px 14px;border-radius:10px;font-size:.76rem;font-weight:700;text-decoration:none;font-family:inherit;transition:all .15s}
.rpt-actions a:hover{text-decoration:none;transform:translateY(-1px)}
.rpt-btn-gold{background:var(--accent-gold);color:#061325}
.rpt-btn-gold:hover{background:var(--accent-gold-light)}
.rpt-btn-line{background:transparent;border:1px solid var(--border-accent);color:var(--accent-gold-light)}
.rpt-btn-line:hover{border-color:var(--accent-gold);color:var(--accent-gold)}
@media(max-width:480px){
  .rpt-title{font-size:1.6rem}
  .rpt-kpis{grid-template-columns:1fr 1fr}
  .rpt-hero{padding:26px 20px 22px}
}
/* Menu & list surfaces (phase-3 systemization) */
.menu-section-h{font-size:.85rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-gold);margin:0 0 10px}
.menu-section-h.tight{margin-bottom:4px}
.menu-section-p{color:var(--text-muted);font-size:.72rem;margin:0 0 10px}
.tight-h{margin:0 0 2px}
.muted-p{color:var(--text-muted);font-size:.8rem;margin:0}
.btn-compact{text-align:center;text-decoration:none;font-size:.72rem;padding:8px}
.btn-block{text-align:center;display:block;text-decoration:none}
.btn-share{text-align:center;font-size:.68rem;padding:7px;cursor:pointer;text-decoration:none}
.btn-back{text-align:center;display:block;text-decoration:none;font-size:.72rem;padding:6px 14px}
.cause-row{display:block;text-decoration:none;color:inherit;padding:12px;background:var(--bg-card-inner);border:1px solid var(--border);border-radius:8px;margin-bottom:10px}
.bond-row{display:block;text-decoration:none;color:inherit;padding:12px;border-radius:8px;margin-bottom:10px;background:var(--bg-card-inner);border:1px solid var(--border)}
.bond-row.gold{background:rgba(212,168,67,.08);border-color:rgba(212,168,67,.25)}
.bond-row.green{background:rgba(0,232,123,.06);border-color:rgba(0,232,123,.2)}
.bond-row.cyan{background:rgba(0,229,255,.06);border-color:rgba(0,229,255,.2)}
.row-split{display:flex;justify-content:space-between;align-items:start}
.row-split.center{align-items:center}
.row-main{flex:1}
.cause-title{margin:0 0 4px;font-size:.85rem;color:var(--text-primary)}
.cause-ward{font-size:.62rem;color:var(--text-muted)}
.cause-pct{font-size:.7rem;color:var(--accent-green);font-weight:600}
.cause-desc{font-size:.72rem;color:var(--text-muted);margin:6px 0 0;line-height:1.4}
.cause-meta{display:flex;justify-content:space-between;font-size:.68rem;color:var(--text-muted);margin-top:8px}
.bond-kicker{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
.bond-line{font-size:.82rem;font-weight:600;color:var(--text-primary)}
.bond-cta{font-size:.7rem;font-weight:600;white-space:nowrap}
/* Ward surfaces (phase-4 systemization) */
.chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.62rem;margin:2px 2px 0 0}
.chip-hit{background:rgba(197,160,89,.15);color:var(--accent-gold-light);border:1px solid rgba(197,160,89,.4)}
.chip-dim{background:rgba(255,255,255,.05);color:var(--text-muted);border:1px solid var(--border)}
.chip-more{background:transparent;color:var(--text-muted);margin:2px 2px 0 0;display:inline-block;padding:2px 8px;border-radius:10px;font-size:.62rem}
.chip-gold{background:rgba(197,160,89,.12);color:var(--accent-gold);font-weight:700}
.chip-cyan{background:rgba(0,229,255,.12);color:#00e5ff;font-weight:700}
.chip-green{background:rgba(0,255,136,.12);color:var(--accent-green);font-weight:700}
.chip-more-toggle{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.62rem;color:var(--accent-gold);cursor:pointer;border:1px dashed var(--border)}
.chip-ward{font-size:.6rem;padding:3px 8px;border-radius:12px;background:rgba(255,255,255,.05);white-space:nowrap}
.chips{margin-top:6px;line-height:1.8}
.ward-top{display:flex;justify-content:space-between;align-items:start}
.ward-main{flex:1}
.ward-name{font-size:.85rem;margin-bottom:2px}
.ward-name.lg{font-size:1rem;margin-bottom:4px}
.ward-muni{font-size:.65rem;color:var(--text-muted)}
.ward-meta{font-size:.7rem;color:var(--text-muted)}
.ward-meta.gold{color:var(--accent-gold-light)}
.ward-meta.plain{font-size:.75rem}
.ward-meta.mt{margin-top:2px}
.status-chip{font-size:.6rem;padding:3px 8px;border-radius:12px;background:rgba(255,255,255,.05);white-space:nowrap}
.score-row{display:flex;justify-content:space-between;align-items:center;font-size:.75rem}
.score-row.big{font-size:.8rem;margin-top:12px}
.score-label{font-weight:600;color:var(--accent-gold-light);font-size:.8rem}
.score-val{font-size:.75rem;font-weight:700}
.score-val.big{font-size:1.1rem}
.fund-stack{margin-top:8px}
.fund-lbl{display:flex;justify-content:space-between;align-items:center;font-size:.7rem;color:var(--text-muted)}
/* Site/doc surfaces (phase-5 systemization) */
.doc-h{font-size:.85rem;text-transform:uppercase;letter-spacing:1px;color:var(--accent-gold);margin:16px 0 8px 0}
.doc-list{margin:0;padding-left:20px;line-height:1.7}
.doc-note{font-size:.7rem;color:var(--text-muted);margin-top:16px}
.api-table{font-size:.78rem;border-collapse:collapse;width:100%}
.api-table td{padding:4px 8px}
.api-method{white-space:nowrap;color:var(--accent-gold)}
.doc-p{font-size:.82rem;color:var(--text-muted);line-height:1.6}
.li-empty{color:var(--text-muted)}
/* Utility layer (step-A codemod) */
.txt-info{color:#93c5fd}.txt-gold-l{color:var(--accent-gold-light)}.txt-muted{color:var(--text-muted)}
.txt-green{color:var(--accent-green)}.txt-gold{color:var(--accent-gold)}
.gear-box{border:1px solid #1e3352;border-radius:6px;padding:16px;margin-bottom:14px;background:#0f1d32}
.gear-box-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.gear-box-h{font-size:.88rem;font-weight:700;color:#eef2f7;margin:0}
.gear-box-p{color:#7a8da0;font-size:.72rem;line-height:1.5;margin:0}
.dot-gold{width:6px;height:6px;border-radius:50%;background:#d4a843}
.mt2{margin-top:2px}.mt6{margin-top:6px}.mt8{margin-top:8px}.mt10{margin-top:10px}.mt12{margin-top:12px}.mt16{margin-top:16px}.mt4{margin-top:4px}
.mb6{margin-bottom:6px}.mb12{margin-bottom:12px}.m0{margin:0}
.btn-75{text-align:center;text-decoration:none;font-size:.75rem}
.btn-c9{text-align:center;text-decoration:none;font-size:.7rem;padding:9px}
.btn-c8{text-align:center;text-decoration:none;font-size:.7rem;padding:8px}
.btn-c7{text-align:center;text-decoration:none;font-size:.68rem;padding:7px}
.btn-min120{text-align:center;text-decoration:none;min-width:120px}
.btn-center{text-align:center;text-decoration:none}
.blk-link{text-align:center;display:block;text-decoration:none}
.lbl-muted{font-size:.72rem;color:var(--text-muted)}
.p-muted{color:var(--text-muted);font-size:.85rem}.p-muted-sm{color:var(--text-muted);font-size:.8rem}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.h-plain{font-size:.85rem;margin:0}
.fs85{font-size:.85rem}.fs80{font-size:.8rem}.fs75{font-size:.75rem}
.lbl-dim{font-size:.7rem;color:var(--text-muted)}.lbl-tiny{font-size:.68rem;color:var(--text-muted)}
.micro-dim{color:#7a8da0;font-size:.58rem}
.note-75{color:var(--text-muted);font-size:.75rem;margin:4px 0 0 0}
.hl-border{border-color:var(--accent-gold)}
.split-wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px}
.split-75{display:flex;justify-content:space-between;font-size:.75rem}
.stat-box{text-align:center;padding:12px;background:rgba(255,255,255,.03);border-radius:8px}
.stat-box .lbl{font-size:.65rem;text-transform:uppercase;letter-spacing:.5px}
.stat-box .val{font-size:1.2rem;font-weight:700;margin-top:4px}
.grid-2.admin{margin-top:12px}
.grow{flex:1}.inline{display:inline}.scroll-x{overflow-x:auto}
.strong-pri{font-weight:600;color:var(--text-primary)}
.danger-outline{color:#ff5050;border-color:#ff5050}
.inset-panel{background:var(--bg-card-inner);border:1px solid var(--border);border-radius:8px;padding:14px;margin:10px 0;font-size:.8rem}
.bare-link{text-decoration:none;color:inherit}
.val-green{font-size:.7rem;color:var(--accent-green);font-weight:600}
.foot-note{margin-top:12px;text-align:center;font-size:.8rem}
.lbl-75{font-size:.75rem;color:var(--text-muted)}
.lbl-66{font-size:.66rem;color:var(--text-muted)}
.lbl-65{font-size:.65rem;color:var(--text-muted)}
.micro-55{color:#7a8da0;font-size:.55rem}
.split-center{display:flex;justify-content:space-between;align-items:center}
.rule-b{border-bottom:1px solid #1E2638}
.bond-card{padding:10px 0;border-bottom:1px solid var(--border)}
.bond-card-head{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap}
.bond-card-body{flex:1;min-width:0}
.bond-card-title{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px}
.bond-card-meta{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.bond-card-name{font-size:.72rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bond-dot{font-size:.52rem;color:#4a5568}
.bond-progress{width:100%;height:6px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:4px}
.bond-progress-fill{height:100%;border-radius:999px;transition:width .3s ease}
.bond-ward-tag{font-size:.55rem;color:var(--text-muted);background:var(--bg-card-inner);padding:2px 6px;border-radius:4px;border:1px solid var(--border)}
.bond-pct{font-size:.58rem;color:var(--text-muted);font-variant-numeric:tabular-nums}
.bond-action{display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;border-radius:6px;font-size:.66rem;font-weight:700;text-decoration:none;color:#0a1628;white-space:nowrap;letter-spacing:.02em;align-self:center}
.bond-series{flex:1;min-width:120px;padding:8px 10px;border-left:2px solid}
.bond-series-label{font-size:.58rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)}
.bond-series-val{font-size:.82rem;font-weight:700;margin-top:1px;font-variant-numeric:tabular-nums}
.bond-series-sub{font-size:.56rem;color:var(--text-muted)}
.bond-box{border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin-bottom:14px;background:var(--bg-card)}
.bond-box-flush{display:flex;flex-wrap:wrap;gap:0;margin-bottom:14px;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--bg-card)}
.bond-holding{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)}
.bond-hold-pri{font-size:.72rem;font-weight:700;font-variant-numeric:tabular-nums}
.bond-hold-meta{font-size:.56rem;color:var(--text-muted)}
.bond-hold-kind{font-size:.58rem;font-weight:700;letter-spacing:.06em}
.bond-total{font-size:.75rem;color:var(--text-muted)}
.bond-empty{text-align:center;padding:20px 16px}
.bond-empty-msg{color:var(--text-primary);font-size:.82rem;margin:0 0 6px;font-weight:600}
.bond-empty-sub{color:var(--text-muted);font-size:.78rem;margin:0}
/* Bond kind picker — three equal cards (invest / save / donate) */
.bond-kind-row{display:grid;grid-template-columns:1fr;gap:10px;margin:12px 0}
.bond-kind-card{display:flex;flex-direction:column;gap:8px;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--bg-card);text-decoration:none;color:inherit;min-height:140px;transition:border-color .15s,box-shadow .15s}
.bond-kind-card:hover{text-decoration:none;border-color:var(--accent-gold)}
.bond-kind-card.active{border-color:var(--accent-gold);box-shadow:0 0 0 1px var(--accent-gold) inset;background:rgba(212,168,67,.08)}
.bond-kind-k{font-size:.58rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)}
.bond-kind-title{font-size:.82rem;font-weight:700;color:var(--text-primary)}
.bond-kind-d{font-size:.7rem;color:var(--text-muted);line-height:1.5}
.bond-kind-cta{font-size:.66rem;font-weight:700;color:var(--accent-gold);letter-spacing:.04em}
/* Shared sign-in sheet + disclosure accordion (UX unity: stay on page) */
dialog.wb-auth-sheet{border:0;padding:0;background:transparent;color:inherit}
dialog.wb-auth-sheet::backdrop{background:rgba(8,12,24,.72)}
.wb-auth-sheet-inner{max-width:420px;margin:10vh auto;position:relative}
.wb-auth-x{position:absolute;top:4px;right:10px;background:none;border:none;color:var(--text-muted);font-size:1.4rem;line-height:1;cursor:pointer;padding:4px}
.wb-auth-x:hover{color:var(--accent-gold)}
.wb-disclose{margin:12px 0}
.wb-disclose>summary{cursor:pointer;list-style:none;padding:.6rem 1rem;border:1px solid var(--border);border-radius:8px;font-size:.76rem;font-weight:600;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;gap:8px}
.wb-disclose>summary::-webkit-details-marker{display:none}
.wb-disclose>summary::marker{content:''}
.wb-disclose>summary::after{content:'+';color:var(--accent-gold);font-weight:700}
.wb-disclose[open]>summary{border-color:var(--accent-gold);color:var(--accent-gold-light)}
.wb-disclose[open]>summary::after{content:'\u2212'}
.wb-disclose .card{margin:10px 0 0}
/* Desktop expansion — Track A: capped shell rail, content centers once the
   viewport grows past mobile. Mobile max-width queries above stay untouched. */
@media (min-width: 768px) {
  .top-nav, .app-top, .top-nav-inner, .app-top-inner {
    max-width: var(--shell-max);
    margin-inline: auto;
  }
  .shift-container, .landing-container {
    max-width: var(--shell-max);
  }
  .gear-explorer-chrome {
    display: flex;
    gap: 8px;
  }
  .bond-kind-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .gear-explorer-chrome { justify-content: flex-start; }
  /* Wide-Chrome latitude: page roots (incl. About's report rail) grow with the
     viewport to the --shell-max desk instead of pinning at the phone-first cap.
     Narrow caps (360/480) remain on .entity-card, .till, .ingula-card only.
     Double-class to beat the inline REPORT_CSS .rpt-wrap cap at equal weight. */
  .wrap.wrap, .wrap.rpt-wrap.rpt-wrap, .rpt-wrap.rpt-wrap {
    max-width: var(--shell-max);
  }
}
`


