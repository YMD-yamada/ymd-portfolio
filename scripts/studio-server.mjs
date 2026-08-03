#!/usr/bin/env node
/**
 * ローカル専用 Portfolio Studio。
 * - 127.0.0.1 のみ待受
 * - 起動時にブラウザを開く（既に起動中なら再利用）
 * - 「本番に反映」= 設定保存 → sync → commit → push（ブラウザに Token は不要）
 *
 * Usage: npm run studio
 */
import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8791);
const CONFIG_PATH = join(ROOT, "config", "apps.config.json");
const SITE_PATH = join(ROOT, "config", "site.json");
const APPS_PATH = join(ROOT, "data", "apps.json");
const CANDIDATES_PATH = join(ROOT, "data", "candidates.json");
const STUDIO_URL = `http://${HOST}:${PORT}/admin.html`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(payload);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj, null, 2), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function isLocalSocket(req) {
  const ra = req.socket?.remoteAddress || "";
  return ra === "127.0.0.1" || ra === "::1" || ra === "::ffff:127.0.0.1";
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const rel = decoded.replace(/^\/+/, "").replace(/\\/g, "/");
  const full = normalize(join(root, rel || "index.html"));
  const rootNorm = normalize(root + sep);
  if (full !== normalize(root) && !full.startsWith(rootNorm)) return null;
  return full;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return null;
  return JSON.parse(raw);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateConfig(config) {
  if (!config || typeof config !== "object") throw new Error("config が不正です");
  if (!config.overrides || typeof config.overrides !== "object") config.overrides = {};
  if (!config.overrides.byUrl || typeof config.overrides.byUrl !== "object") {
    config.overrides.byUrl = {};
  }
  if (!Array.isArray(config.categoryOrder)) config.categoryOrder = [];
  if (!config.selection || typeof config.selection !== "object") {
    config.selection = { mode: "allowlist", urls: [] };
  }
  config.selection.mode = "allowlist";
  if (!Array.isArray(config.selection.urls)) config.selection.urls = [];
  return config;
}

async function runSync() {
  await execFileAsync(process.execPath, [join(ROOT, "scripts", "sync-apps.mjs")], {
    cwd: ROOT,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  const apps = existsSync(APPS_PATH) ? readJson(APPS_PATH) : { items: [] };
  const candidates = existsSync(CANDIDATES_PATH) ? readJson(CANDIDATES_PATH) : { items: [] };
  return {
    published: Array.isArray(apps.items) ? apps.items.length : 0,
    candidates: Array.isArray(candidates.items) ? candidates.items.length : 0,
  };
}

async function sh(cmd, args) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    cwd: ROOT,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });
  return `${stdout || ""}${stderr || ""}`.trim();
}

async function shipGit(message) {
  const steps = [];
  await sh("git", ["add", "config/apps.config.json", "data/apps.json", "data/candidates.json"]);
  steps.push("git add");

  let committed = false;
  try {
    await sh("git", [
      "commit",
      "-m",
      message || "Update portfolio publish selection",
    ]);
    committed = true;
    steps.push("commit");
  } catch (e) {
    const msg = String(e?.stderr || e?.message || e);
    if (/nothing to commit/i.test(msg)) {
      steps.push("commit: nothing to commit");
    } else {
      // Windows git may put message in error
      if (/no changes added|nothing to commit|clean working tree/i.test(msg)) {
        steps.push("commit: nothing to commit");
      } else {
        throw e;
      }
    }
  }

  await sh("git", ["push"]);
  steps.push("push");

  try {
    await sh("gh", [
      "workflow",
      "run",
      "Deploy to Cloudflare Pages",
      "--repo",
      "YMD-yamada/ymd-portfolio",
    ]);
    steps.push("workflow");
  } catch {
    steps.push("workflow: skipped (push may still deploy)");
  }

  return { committed, steps };
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  }
}

async function probeExistingStudio() {
  try {
    const r = await fetch(`http://${HOST}:${PORT}/api/health`, { cache: "no-store" });
    if (!r.ok) return false;
    const j = await r.json();
    return Boolean(j?.ok && j?.studio);
  } catch {
    return false;
  }
}

function serveStatic(req, res, pathname) {
  let filePath = safeJoin(ROOT, pathname);
  if (!filePath) return sendJson(res, 400, { ok: false, error: "bad path" });
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
  const data = readFileSync(filePath);
  const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  send(res, 200, data, { "Content-Type": type });
}

const server = http.createServer(async (req, res) => {
  if (!isLocalSocket(req)) {
    return sendJson(res, 403, { ok: false, error: "localhost only" });
  }

  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, studio: true, host: HOST, port: PORT, cwd: ROOT });
    }

    if (req.method === "GET" && pathname === "/api/state") {
      const site = existsSync(SITE_PATH) ? readJson(SITE_PATH) : {};
      const config = existsSync(CONFIG_PATH) ? readJson(CONFIG_PATH) : {};
      const apps = existsSync(APPS_PATH) ? readJson(APPS_PATH) : { items: [] };
      const candidates = existsSync(CANDIDATES_PATH)
        ? readJson(CANDIDATES_PATH)
        : { items: apps.items || [] };
      return sendJson(res, 200, { ok: true, site, config, apps, candidates });
    }

    if (req.method === "POST" && pathname === "/api/save-config") {
      const body = await readBody(req);
      const config = validateConfig(body?.config);
      writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      return sendJson(res, 200, {
        ok: true,
        saved: "config/apps.config.json",
        selected: config.selection.urls.length,
      });
    }

    if (req.method === "POST" && pathname === "/api/publish") {
      const body = await readBody(req);
      const config = validateConfig(body?.config);
      writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      const counts = await runSync();
      return sendJson(res, 200, {
        ok: true,
        saved: "config/apps.config.json",
        regenerated: "data/apps.json",
        selected: config.selection.urls.length,
        ...counts,
      });
    }

    if (req.method === "POST" && pathname === "/api/ship") {
      const body = await readBody(req);
      const config = validateConfig(body?.config);
      writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      const counts = await runSync();
      const git = await shipGit(
        body?.message ||
          `Publish ${config.selection.urls.length} apps on portfolio`
      );
      return sendJson(res, 200, {
        ok: true,
        selected: config.selection.urls.length,
        ...counts,
        git,
        note: "本番デプロイを開始しました。数分後に公開ページを確認してください。",
      });
    }

    if (req.method === "POST" && pathname === "/api/refresh-candidates") {
      const counts = await runSync();
      return sendJson(res, 200, { ok: true, ...counts });
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(req, res, pathname === "/" ? "/index.html" : pathname);
    }

    return sendJson(res, 405, { ok: false, error: "method not allowed" });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: String(e?.message || e) });
  }
});

async function main() {
  if (await probeExistingStudio()) {
    console.log(`既存の Studio を開きます: ${STUDIO_URL}`);
    openBrowser(STUDIO_URL);
    return;
  }

  server.listen(PORT, HOST, () => {
    console.log(`Portfolio Studio: ${STUDIO_URL}`);
    console.log("チェック →「本番に反映」だけです（Token 入力なし）。");
    openBrowser(STUDIO_URL);
  });

  server.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
