/**
 * Records the desktop layout, or checks it has not moved.
 *
 *   node scripts/layout-baseline.mjs save     # write the baseline
 *   node scripts/layout-baseline.mjs check    # fail if anything shifted
 *
 * Mobile work must not disturb the desktop by a single pixel, and eyeballing
 * cannot prove that. This measures real geometry in a real browser.
 */
const [, , mode = 'check'] = process.argv;
const PORT = 9333;
const URL_ = process.env.PAGE || 'http://localhost:8888/e/hfechqdp6r';
const FILE = new URL('./layout-baseline.json', import.meta.url);

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let n = 0;
const send = (method, params) =>
  new Promise((res) => {
    const id = ++n;
    const h = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === id) { ws.removeEventListener('message', h); res(m.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

await new Promise((r) => ws.addEventListener('open', r));
await send('Emulation.clearDeviceMetricsOverride', {});
await send('Emulation.setDeviceMetricsOverride',
  { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: URL_ });
await new Promise((r) => setTimeout(r, 3500));

const expr = `(() => {
  const SELECTORS = ['.navbar', '.navbar-heading', '.sharebar', '.share-url',
    '.event-layout', '.panel-head', '.panel-title', '.panel-head-actions',
    '.panel-note', '.panel-body', '.grid-scroll', '.grid', '.grid-colhead',
    '.grid-rowlabel', '.grid-cell', '.panel-actions'];
  const out = { docH: document.documentElement.scrollHeight, winH: innerHeight,
                scrolls: document.documentElement.scrollHeight > innerHeight };
  for (const sel of SELECTORS) {
    out[sel] = [...document.querySelectorAll(sel)].map((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10,
              Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
    });
  }
  return JSON.stringify(out);
})()`;
const { result } = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
const now = JSON.parse(result.value);
ws.close();

const fs = await import('node:fs');
if (mode === 'save') {
  fs.writeFileSync(FILE, JSON.stringify(now, null, 1));
  console.log(`  baseline saved — ${Object.keys(now).length - 3} selectors, docH ${now.docH}`);
  process.exit(0);
}

const before = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const diffs = [];
for (const key of Object.keys(before)) {
  const a = JSON.stringify(before[key]);
  const b = JSON.stringify(now[key]);
  if (a !== b) diffs.push(`  ${key}\n      was ${a}\n      now ${b}`);
}
if (diffs.length) {
  console.log(`DESKTOP MOVED — ${diffs.length} difference(s):\n` + diffs.join('\n'));
  process.exit(1);
}
console.log('  desktop layout identical to baseline (every element, to 0.1px)');
