/**
 * The shared layout — one shell for every page.
 *
 * The surface is server-rendered: the HTML Bun returns is the whole page. There is no
 * client framework, no bundler and no build step, and the only script on any page is
 * a copy-to-clipboard affordance that works without JavaScript too.
 *
 * The style is inline in one place, so the pages look like one product without a
 * stylesheet request, and nothing is fetched from a CDN.
 */

import { escape } from './html.ts'
import { RECEIVING_ADDRESS, VENUE_NAME } from '../venue.ts'

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'The exchange' },
  { href: '/listings', label: 'Listings' },
  { href: '/agents', label: 'Agents' },
  { href: '/trace', label: 'Trace' },
]

const STYLE = `
:root {
  --ink: #14181d;
  --muted: #5b6672;
  --line: #d8dee5;
  --paper: #fbfcfd;
  --card: #ffffff;
  --accent: #0b5d3b;
  --warn: #8a4b00;
  --bad: #8c1d18;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--ink);
  background: var(--paper);
}
a { color: var(--accent); }
header {
  border-bottom: 1px solid var(--line);
  background: var(--card);
}
.wrap { max-width: 62rem; margin: 0 auto; padding: 0 1.25rem; }
.masthead { display: flex; flex-wrap: wrap; gap: .75rem 1.5rem; align-items: baseline; padding: 1.1rem 0 .9rem; }
.masthead h1 { font-size: 1.22rem; margin: 0; letter-spacing: -0.01em; }
.masthead p { margin: 0; color: var(--muted); font-size: .9rem; }
nav { border-top: 1px solid var(--line); }
nav ul { list-style: none; display: flex; flex-wrap: wrap; gap: 0; margin: 0; padding: 0; }
nav li { margin: 0; }
nav a {
  display: block; padding: .6rem .9rem; font-size: .92rem; text-decoration: none;
  color: var(--muted); border-bottom: 2px solid transparent;
}
nav a:hover { color: var(--ink); }
nav a[aria-current="page"] { color: var(--ink); border-bottom-color: var(--accent); font-weight: 600; }
main { padding: 1.75rem 0 3rem; }
h2 { font-size: 1.12rem; margin: 2rem 0 .6rem; letter-spacing: -0.01em; }
h2:first-child { margin-top: 0; }
h3 { font-size: 1rem; margin: 1.4rem 0 .4rem; }
p { margin: .55rem 0; }
.lede { font-size: 1.02rem; color: var(--muted); max-width: 46rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: .8rem; margin: 1rem 0; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: .85rem .95rem; }
.card .n { font-size: 1.65rem; font-weight: 650; line-height: 1.1; letter-spacing: -0.02em; }
.card .k { font-size: .8rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
table { border-collapse: collapse; width: 100%; margin: .9rem 0; font-size: .92rem; background: var(--card); }
th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .86em; }
.pill {
  display: inline-block; padding: .1rem .5rem; border-radius: 999px; font-size: .76rem;
  border: 1px solid var(--line); background: var(--paper); white-space: nowrap;
}
.pill.published, .pill.accept, .pill.ok { color: var(--accent); border-color: #a9cbb9; background: #f1f8f4; }
.pill.held, .pill.hold, .pill.escalated, .pill.warn { color: var(--warn); border-color: #e0c39a; background: #fdf6ec; }
.pill.fallback, .pill.degraded, .pill.bad { color: var(--bad); border-color: #e0b0ad; background: #fdf1f0; }
.muted { color: var(--muted); }
.small { font-size: .85rem; }
.callout { border: 1px solid var(--line); border-left: 3px solid var(--accent); background: var(--card); border-radius: 6px; padding: .8rem 1rem; margin: 1rem 0; }
.callout.warn { border-left-color: var(--warn); }
.callout.bad { border-left-color: var(--bad); }
pre {
  background: var(--card); border: 1px solid var(--line); border-radius: 6px;
  padding: .75rem .85rem; overflow-x: auto; font-size: .84rem; line-height: 1.5;
}
footer { border-top: 1px solid var(--line); background: var(--card); padding: 1.1rem 0 1.6rem; color: var(--muted); font-size: .85rem; }
footer .addr { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.copy { border: 0; background: #eef1f4; border-radius: 4px; padding: .05rem .35rem; font-size: .78rem; cursor: pointer; color: var(--muted); }
`

const COPY_SCRIPT = `
document.addEventListener('click', function (event) {
  var button = event.target.closest('[data-copy]');
  if (!button) return;
  var value = button.getAttribute('data-copy') || '';
  if (navigator.clipboard) navigator.clipboard.writeText(value);
  var was = button.textContent;
  button.textContent = 'copied';
  setTimeout(function () { button.textContent = was; }, 1200);
});
`

export interface PageOptions {
  title: string
  /** The current path, so the nav can mark where we are. */
  path: string
  /** The page's own heading. */
  heading: string
  /** The line under the heading. */
  lede?: string
  /** The page body. */
  body: string
  /** Extra markup for the `<head>`. */
  head?: string
}

/** The page, as a whole document. Every page in the surface goes through here. */
export const page = (options: PageOptions): string => {
  const nav = NAV.map((item) => {
    const current = item.href === options.path ? ' aria-current="page"' : ''
    return `<li><a href="${escape(item.href)}"${current}>${escape(item.label)}</a></li>`
  }).join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(options.title)} — Conquest</title>
<style>${STYLE}</style>
${options.head ?? ''}
</head>
<body>
<header>
  <div class="wrap masthead">
    <h1>Conquest — the agent exchange</h1>
    <p>Value moves only through settlement. The certificate is the product.</p>
  </div>
  <nav><div class="wrap"><ul>${nav}</ul></div></nav>
</header>
<main><div class="wrap">
<h2>${escape(options.heading)}</h2>
${options.lede ? `<p class="lede">${escape(options.lede)}</p>` : ''}
${options.body}
</div></main>
<footer><div class="wrap">
  <p><strong>${escape(VENUE_NAME)}</strong> — every rand the exchange receives is received at
  <span class="addr">${escape(RECEIVING_ADDRESS)}</span>
  <button class="copy" data-copy="${escape(RECEIVING_ADDRESS)}" type="button">copy</button></p>
  <p class="small">The settlement rail here is an in-process escrow and the payment facilitator
  is a local stub: no chain and no provider is contacted. A certificate verifies from its own
  bytes and the published key at <code>/.well-known/avc-jwks.json</code>.</p>
</div></footer>
<script>${COPY_SCRIPT}</script>
</body>
</html>
`
}
