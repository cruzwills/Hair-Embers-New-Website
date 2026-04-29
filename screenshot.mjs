import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "temporary screenshots");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const [, , url = "http://localhost:3000", label = ""] = process.argv;

// auto-increment
const existing = fs.readdirSync(outDir).filter(f => f.endsWith(".png"));
const nums = existing.map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] || "0")).filter(Boolean);
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(outDir, filename);

const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 800));

// Force all scroll-reveal elements visible — observer won't fire on a full-page shot
await page.evaluate(() => {
  document.querySelectorAll('.reveal, .reveal-l, .reveal-r, .reveal-left, .reveal-right').forEach(el => {
    el.style.transitionDelay = '0ms';
    el.classList.add('on', 'visible');
  });
  // Force hero words visible too
  document.querySelectorAll('.hero-word').forEach(el => {
    el.style.transitionDelay = '0ms';
    el.classList.add('on');
  });
  document.getElementById('nav')?.classList.add('scrolled');
});
await new Promise(r => setTimeout(r, 600)); // let opacity/transform settle

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${outPath}`);
