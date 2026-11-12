/**
 * 品質ゲート: config/quality.json のランクが minRank 以上のアプリだけをホームページに残す。
 * ランクの無いアプリ（未評価）は載せない。
 *
 * sync-apps.mjs から呼ばれるほか、単体でも動く:
 *   node scripts/quality-gate.mjs   … いまの data/apps.json を基準で絞り直す（ネット不要）
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const QUALITY_PATH = join(ROOT, "config", "quality.json");
const OUT_PATH = join(ROOT, "data", "apps.json");

function urlKey(url) {
  try {
    const u = new URL(url);
    const p = u.pathname === "/" || u.pathname === "" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.origin}${p}`.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

export function loadQualityConfig(path = QUALITY_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** quality が null（ファイル無し）のときは何もしない（後方互換）。 */
export function applyQualityGate(items, quality) {
  if (!quality) return { items, note: "quality: config/quality.json なし（絞り込みなし）" };
  const order = Array.isArray(quality.rankOrder) && quality.rankOrder.length ? quality.rankOrder : ["S", "A", "B", "C"];
  const minIdx = order.indexOf(String(quality.minRank || "A"));
  const limit = minIdx < 0 ? order.indexOf("A") : minIdx;
  const ranks = {};
  for (const [u, v] of Object.entries(quality.ranks || {})) {
    ranks[urlKey(u)] = v && typeof v === "object" ? String(v.rank || "") : String(v || "");
  }
  const kept = [];
  const dropped = [];
  for (const it of items || []) {
    const r = ranks[urlKey(it.url || "")] || "";
    const idx = order.indexOf(r);
    if (idx >= 0 && idx <= limit) kept.push({ ...it, rank: r });
    else dropped.push(`${it.name || it.url}(${r || "未評価"})`);
  }
  // S を先頭に（同ランク内は元の順）
  kept.sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
  return {
    items: kept,
    note: `quality: ${order[limit]} 以上 ${kept.length} 件を掲載` + (dropped.length ? ` / 外した ${dropped.join(", ")}` : ""),
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const data = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  const res = applyQualityGate(data.items || [], loadQualityConfig());
  data.items = res.items;
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(res.note);
}
