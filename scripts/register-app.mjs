#!/usr/bin/env node
/**
 * ポートフォリオ（Web公開一覧）に制作物を追加する。
 * ストア申請用 personal-site とは別。こちらは自由公開の Web 作品用。
 *
 * Usage:
 *   npm run register-app -- --name "My App" --url "https://my-app.vercel.app"
 *   npm run register-app -- --name "My App" --url "https://..." --audience normal --category 公開中
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, "config", "apps.config.json");
const APPS_PATH = join(ROOT, "data", "apps.json");

function arg(flag, fallback = "") {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function normalizeUrlKey(url) {
  try {
    const u = new URL(url);
    const p =
      u.pathname === "/" || u.pathname === ""
        ? ""
        : u.pathname.replace(/\/$/, "");
    return `${u.origin.toLowerCase()}${p}`.toLowerCase();
  } catch {
    return (url || "").toLowerCase();
  }
}

function normalizeExternalUrl(s) {
  const t = (s || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/*/, "")}`;
}

const name = arg("--name");
const url = normalizeExternalUrl(arg("--url"));
const description =
  arg("--description") ||
  `${name || "この制作"} の公開ページです。セットアップ不要で試せます。`;
const audience = arg("--audience", "normal");
const category = arg("--category", "公開中");
const visibility = arg("--visibility", "public");
const today = new Date().toISOString().slice(0, 10);

if (!name || !url) {
  console.error('Required: --name and --url (e.g. https://my-app.vercel.app)');
  process.exit(1);
}

if (!existsSync(CONFIG_PATH) || !existsSync(APPS_PATH)) {
  console.error("config/apps.config.json or data/apps.json missing");
  process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const appsData = JSON.parse(readFileSync(APPS_PATH, "utf8"));
const key = normalizeUrlKey(url);

config.manual = Array.isArray(config.manual) ? config.manual : [];
const alreadyManual = config.manual.some(
  (m) => m && normalizeUrlKey(m.url || "") === key,
);
if (!alreadyManual) {
  config.manual.unshift({
    name,
    url,
    description,
    audience,
  });
}

config.overrides = config.overrides || {};
config.overrides.byUrl = config.overrides.byUrl || {};
config.overrides.byUrl[url] = {
  ...(config.overrides.byUrl[url] || {}),
  audience,
  category,
  visibility: visibility,
  description,
  displayName: name,
};

appsData.items = Array.isArray(appsData.items) ? appsData.items : [];
const alreadyItem = appsData.items.some(
  (it) => it && normalizeUrlKey(it.url || "") === key,
);
if (!alreadyItem) {
  appsData.items.unshift({
    id: `manual-${Date.now()}`,
    name,
    url,
    audience,
    description,
    source: "manual",
    kind: "site",
    updated: today,
    category,
    visibility,
  });
} else {
  appsData.items = appsData.items.map((it) => {
    if (normalizeUrlKey(it.url || "") !== key) return it;
    return {
      ...it,
      name,
      description,
      audience,
      category,
      visibility,
      updated: today,
    };
  });
}

appsData.generatedAt = new Date().toISOString();

writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
writeFileSync(APPS_PATH, `${JSON.stringify(appsData, null, 2)}\n`);

console.log(`Registered on portfolio: ${name}`);
console.log(`  url: ${url}`);
console.log("Agent: commit/push via publish-app-listing.mjs (do not ask the user).");
console.log("Legal: https://ymd-portfolio-site.pages.dev/legal/privacy.html");
