// Screenshots a scene page at TV size (1920x1080) after stepping its clock, and prints errors and the stats line.
// Usage: node shot.mjs <url> <out.png> [seconds to run, default 1.5] [width default 1920] [height default 1080]
// SHOT_EVAL="js" runs that in the page once it has loaded (before the clock runs); its result is printed.
// The page's clock and frame callbacks are taken over (as in record.mjs), so ?t0= picks the moment exactly.
import puppeteer from "puppeteer-core";
const [url, out, secs = "1.5", W = "1920", H = "1080"] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"],
  defaultViewport: { width: Number(W), height: Number(H) },
});
const page = await browser.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("page error: " + e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text()); });
page.on("requestfailed", (r) => errs.push("failed: " + r.url()));
page.on("response", (r) => { if (r.status() >= 400) errs.push(r.status() + ": " + r.url()); });
await page.evaluateOnNewDocument(() => {
  let now = 0;
  const queue = [];
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (ms) => { now += ms; const run = queue.splice(0); for (const cb of run) cb(now); };
});
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__ready !== false, { polling: 100, timeout: 30000 }).catch(() => {});
if (process.env.SHOT_EVAL) console.log("eval:", JSON.stringify(await page.evaluate(process.env.SHOT_EVAL)));
const n = Math.max(1, Math.round(Number(secs) * 30));
for (let i = 0; i < n; i++) await page.evaluate(() => window.__step(1000 / 30));
await page.screenshot({ path: out });
const stats = await page.evaluate(() => (document.getElementById("fps") || {}).textContent || "");
console.log(stats.replace(/^\S+ fps · /, ""));
for (const e of [...new Set(errs)]) console.log(e);
await browser.close();
