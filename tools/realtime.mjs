// Real time: the page runs on its own clock and frames, as on the TV. Screenshots n frames back to back after a wait,
// and prints the stats line and every error. Use it to catch what stepped-clock shots hide (startup order, flicker).
// Usage: node tools/realtime.mjs <url> <outprefix> [n=6] [wait ms=3000]
import puppeteer from "puppeteer-core";
const [url, out, n = "6", wait = "3000"] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"], defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("page error:", e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(m.type(), m.text()); });
await page.goto(url, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, Number(wait)));
for (let i = 0; i < Number(n); i++) await page.screenshot({ path: `${out}${i}.png` });
console.log(await page.evaluate(() => (document.getElementById("fps") || {}).textContent));
await browser.close();
