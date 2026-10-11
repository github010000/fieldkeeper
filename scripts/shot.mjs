// 사용: [CLICK=선택자] node scripts/shot.mjs <주소> <폭> <높이> <출력접두> <찍을 시점 ms,...> [모바일 0/1]
// 헤드리스 크롬을 원격 디버깅으로 띄워 폰 화면을 흉내 내고, 지정한 시점마다 캡처한다(Node 내장 WebSocket)
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const [url, w, h, out, times, mobile = "1"] = process.argv.slice(2);
const prof = mkdtempSync(join(tmpdir(), "fk-shot-"));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map(); const logs = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") logs.push("예외: " + m.params.exceptionDetails.exception?.description);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") logs.push("console.error: " + m.params.args.map((a) => a.value).join(" ")); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 2, mobile: mobile === "1" });
if (mobile === "1") await send("Emulation.setTouchEmulationEnabled", { enabled: true });
const t0 = Date.now();
await send("Page.navigate", { url });
// CLICK=선택자 — 페이지가 뜬 뒤 그 요소를 한 번 누른다(예: 카메라 화면의 「소리 켜기」 덮개)
if (process.env.CLICK) { await sleep(1200); await send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(process.env.CLICK)})?.click()` }); }
for (const t of times.split(",").map(Number)) {
  await sleep(Math.max(0, t - (Date.now() - t0)));
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${out}_${t}.png`, Buffer.from(r.result.data, "base64"));
  console.log("ok", `${out}_${t}.png`);
}
if (logs.length) console.log(logs.join("\n")); else console.log("JS 오류 없음");
ws.close(); chrome.kill(); await sleep(300); rmSync(prof, { recursive: true, force: true }); process.exit(0);
