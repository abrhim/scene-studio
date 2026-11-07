// Real time: loads the page, waits, evaluates a JS expression in it and prints the result (and the console).
// Usage: node tools/rteval.mjs <url> "<js>" [wait ms=3000]
import puppeteer from "puppeteer-core";
const [url, js, wait = "3000"] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"], defaultViewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();
page.on("console", (m) => console.log("console", m.type(), m.text()));
await page.goto(url, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, Number(wait)));
console.log(JSON.stringify(await page.evaluate(js), null, 1));
await browser.close();
