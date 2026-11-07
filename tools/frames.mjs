// Stepped clock: n consecutive frames 1/30 s apart after a warm-up, for comparing frame to frame (pops, seams).
// Usage: node tools/frames.mjs <url> <outprefix> [n=4] [warm seconds=1.5]
import puppeteer from "puppeteer-core";
const [url, out, n = "4", warm = "1.5"] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"], defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("page error:", e.message));
await page.evaluateOnNewDocument(() => { let now = 0; const q = []; performance.now = () => now; window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {}; window.__step = (ms) => { now += ms; const r = q.splice(0); for (const cb of r) cb(now); }; });
await page.goto(url, { waitUntil: "load" });
for (let i = 0; i < Math.round(Number(warm) * 30); i++) await page.evaluate(() => window.__step(1000 / 30));
for (let i = 0; i < Number(n); i++) { await page.evaluate(() => window.__step(1000 / 30)); await page.screenshot({ path: `${out}${i}.png` }); }
await browser.close();
