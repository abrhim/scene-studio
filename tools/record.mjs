// Records any requestAnimationFrame page at a steady 30 fps without changing it: the page's clock
// and frame callbacks are taken over, then each frame is stepped and screenshotted.
// Usage: node record.mjs <page url> <out dir> <frames> [css to hide things]
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";

const [url, out, frames, hideCss = ""] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"],
  defaultViewport: { width: 1920, height: 1080 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.evaluateOnNewDocument(() => {
  let now = 0;
  const queue = [];
  performance.now = () => now;
  Date.now = () => 1.7e12 + now;
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (ms) => {
    now += ms;
    const run = queue.splice(0);
    for (const cb of run) cb(now);
  };
});
await page.goto(url, { waitUntil: "load" });
// a page that loads models can set window.__ready = false until they're in (polled on a timer: rAF is taken over)
await page.waitForFunction(() => window.__ready !== false, { polling: 100, timeout: 30000 }).catch(() => console.log("did not report ready"));
if (hideCss) await page.addStyleTag({ content: `${hideCss} { display: none !important; }` });
await page.evaluate(() => window.__step(16));
const n = Number(frames);
const started = Date.now();
for (let i = 0; i < n; i++) {
  await page.evaluate(() => window.__step(1000 / 30));
  writeFileSync(`${out}/f${String(i).padStart(5, "0")}.jpg`, await page.screenshot({ type: "jpeg", quality: 92 }));
  if (i % 150 === 0) console.log(`frame ${i}/${n} after ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
await browser.close();
console.log("done");
