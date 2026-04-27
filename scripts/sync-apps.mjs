/**
 * GitHub 公開 API / (任意) Netlify / Vercel / Render / Cloudflare から
 * 作品一覧を集め、 data/apps.json を上書きします。
 *
 * 使い方: personal-site 直下で
 *   node scripts/sync-apps.mjs
 *
 * トークン（環境変数。任意）:
 *   GITHUB_TOKEN または GH_TOKEN  — GitHub API の速度制限を緩和
 *   NETLIFY_AUTH_TOKEN            — Netlify のサイト一覧
 *   VERCEL_TOKEN                  — Vercel のプロジェクト／デプロイ
 *   RENDER_API_KEY                — Render API キー
 *   CLOUDFLARE_API_TOKEN          — Cloudflare API token（Pages Read）
 *   CLOUDFLARE_ACCOUNT_ID         — Cloudflare account id（config 未指定時の fallback）
 *
 * ローカルは file:// だと index から data/apps.json を取れないので、
 * 簡易サーバで: npx -y http-server -p 8080 .
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const CONFIG_PATH = join(ROOT, "config", "apps.config.json");
const OUT_PATH = join(ROOT, "data", "apps.json");

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
const vercelToken = process.env.VERCEL_TOKEN;
const renderToken = process.env.RENDER_API_KEY;
const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
const cloudflareAccountIdFromEnv = process.env.CLOUDFLARE_ACCOUNT_ID;

const ghHeaders = () => {
  const h = {
    "User-Agent": "ymd-personal-site-sync",
    Accept: "application/vnd.github+json",
  };
  if (githubToken) h.Authorization = `token ${githubToken}`;
  return h;
};

function normalizeUrlKey(url) {
  try {
    const u = new URL(url);
    const p = u.pathname === "/" || u.pathname === "" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.origin.toLowerCase()}${p}`.toLowerCase();
  } catch {
    return (url || "").toLowerCase();
  }
}

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, text };
  } catch (e) {
    return { ok: false, status: 0, data: null, text: String(e && e.message ? e.message : e) };
  }
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`設定が見つかりません: ${CONFIG_PATH}`);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

function sortByUpdated(a, b) {
  return (b.updated || "").localeCompare(a.updated || "");
}

/**
 * 手動を先頭に。同一 URL は先に来た行を残す（手動が他ソースより先）。
 */
function buildFinalList(manual, autoEntries) {
  const seen = new Set();
  const out = [];
  for (const e of manual) {
    if (!e || !e.url || !e.name) continue;
    const k = normalizeUrlKey(e.url);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  const rest = autoEntries.filter(Boolean).sort(sortByUpdated);
  for (const e of rest) {
    if (!e || !e.url || !e.name) continue;
    const k = normalizeUrlKey(e.url);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function looksLikeWebUrl(s) {
  if (!s) return false;
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) return true;
  if (/[.\/]/.test(t) && /[\w-]+\.[\w.-]+/i.test(t)) return true;
  return false;
}

function normalizeExternalUrl(s) {
  const t = (s || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/*/, "")}`;
}

function isoDate(v) {
  if (!v) return "";
  const s = String(v);
  if (s.length >= 10) return s;
  return "";
}

async function fetchAllGithubRepos(user) {
  const all = [];
  for (let page = 1; page < 20; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&page=${page}&sort=updated&direction=desc`;
    const res = await fetch(url, { headers: ghHeaders() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub: ${res.status} ${text.slice(0, 400)}`);
    }
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) break;
    all.push(...list);
    if (list.length < 100) break;
  }
  return all;
}

function toGithubAppEntries(repos, cfg) {
  const g = cfg.github;
  if (!g) return [];
  const out = [];
  for (const r of repos) {
    if (r.archived && g.includeArchived === false) continue;
    if (r.fork && g.includeForks === false) continue;
    if (g.excludeNames && g.excludeNames.includes(r.name)) continue;

    const homepage = (r.homepage || "").trim();
    const useH = looksLikeWebUrl(homepage);
    const normalizedH = useH ? normalizeExternalUrl(homepage) : "";
    let url = useH && normalizedH
      ? normalizedH
      : g.includeRepoAsFallbackUrl
        ? r.html_url
        : null;
    if (!url) continue;

    const fromSite = useH && normalizedH;
    const baseDesc = (r.description || "").trim();
    const desc = baseDesc
      || (fromSite ? "Web（GitHub の homepage フィールド）" : "リポジトリ（homepage 未設定）");

    out.push({
      id: `github-${r.id}`,
      name: r.name,
      url,
      description: desc,
      source: "github",
      kind: fromSite ? "site" : "repo",
      updated: r.pushed_at || r.updated_at || "",
    });
  }
  return out;
}

function normalizeManual(manual) {
  if (!Array.isArray(manual)) return [];
  return manual
    .filter((x) => x && x.url && x.name)
    .map((x, i) => ({
      id: x.id || `manual-${i}`,
      name: x.name,
      url: x.url,
      description: (x.description || "").trim() || "手動登録",
      source: "manual",
      kind: "site",
      updated: new Date().toISOString().slice(0, 10),
    }));
}

async function fetchNetlifyEntries(enabled) {
  if (!enabled) return { entries: [], note: "Netlify: オフ" };
  if (!netlifyToken) {
    return { entries: [], note: "Netlify: スキップ（トークンなし）" };
  }
  const res = await fetch("https://api.netlify.com/api/v1/sites?filter=all&per_page=100", {
    headers: { Authorization: `Bearer ${netlifyToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    return { entries: [], note: `Netlify: 取得失敗 ${res.status} ${t.slice(0, 200)}` };
  }
  const sites = await res.json();
  if (!Array.isArray(sites)) {
    return { entries: [], note: "Netlify: 想定外の応答" };
  }
  const out = sites
    .map((s) => {
      const siteUrl = (s.ssl_url || s.url || "").toString();
      if (!siteUrl) return null;
      return {
        id: `netlify-${s.id || s.name}`,
        name: s.name || s.site_id || "Netlify site",
        url: siteUrl,
        description: s.description ? String(s.description) : "Netlify",
        source: "netlify",
        kind: "site",
        updated: s.updated_at || s.created_at || "",
      };
    })
    .filter(Boolean);
  return { entries: out, note: `Netlify: ${out.length} 件` };
}

function productionDeploymentUrl(dep) {
  if (!dep) return null;
  const alias = Array.isArray(dep.alias) ? dep.alias.find((a) => /^https:\/\//.test(a)) : null;
  if (alias) return alias;
  if (dep.url) {
    return dep.url.startsWith("http") ? dep.url : `https://${dep.url}`;
  }
  return null;
}

async function fetchVercelEntries(cfg) {
  if (cfg?.vercel?.enabled === false) {
    return { entries: [], note: "Vercel: オフ" };
  }
  if (!vercelToken) {
    return { entries: [], note: "Vercel: スキップ（トークンなし）" };
  }
  const listRes = await fetch("https://api.vercel.com/v9/projects?limit=200", {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });
  if (!listRes.ok) {
    const t = await listRes.text();
    return { entries: [], note: `Vercel: プロジェクト取得失敗 ${listRes.status} ${t.slice(0, 200)}` };
  }
  const { projects = [] } = (await listRes.json()) || {};
  const out = [];
  for (const p of projects) {
    const { name, id: projectId } = p;
    if (!projectId || !name) continue;

    let url;
    const depRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=5&target=PRODUCTION&state=READY`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    if (depRes.ok) {
      const depJson = await depRes.json();
      const deployments = Array.isArray(depJson?.deployments) ? depJson.deployments : [];
      for (const d of deployments) {
        url = productionDeploymentUrl(d);
        if (url) break;
      }
    }
    if (!url && cfg.vercel?.deploymentUrlFallback !== false) {
      url = `https://${name}.vercel.app`;
    }
    if (!url) continue;

    out.push({
      id: `vercel-${projectId}`,
      name,
      url,
      description: p.description ? String(p.description) : "Vercel",
      source: "vercel",
      kind: "site",
      updated: p.updatedAt || p.createdAt || "",
    });
  }
  return { entries: out, note: `Vercel: ${out.length} 件` };
}

function normalizeStaticEntries(list, source) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((x) => x && x.url && x.name)
    .map((x, i) => ({
      id: x.id || `${source}-static-${i}`,
      name: String(x.name),
      url: normalizeExternalUrl(String(x.url)),
      description: (x.description || "").trim() || source,
      source,
      kind: "site",
      updated: isoDate(x.updated) || new Date().toISOString(),
    }));
}

async function fetchRenderEntries(cfg) {
  const rcfg = cfg?.render || {};
  if (rcfg.enabled === false) return { entries: [], note: "Render: オフ" };

  const staticOnly = normalizeStaticEntries(rcfg.static || [], "render");
  if (!renderToken) {
    return {
      entries: staticOnly,
      note: staticOnly.length
        ? `Render: API スキップ（トークンなし）/ static ${staticOnly.length} 件`
        : "Render: スキップ（トークンなし）",
    };
  }

  const res = await safeFetchJson("https://api.render.com/v1/services", {
    headers: { Authorization: `Bearer ${renderToken}` },
  });
  if (!res.ok || !Array.isArray(res.data)) {
    const msg = res.text ? String(res.text).slice(0, 200) : "unknown";
    return {
      entries: staticOnly,
      note: `Render: API取得失敗 ${res.status} ${msg}`,
    };
  }

  const out = [];
  for (const s of res.data) {
    const name = s?.name || s?.service?.name || s?.slug;
    const slug = s?.slug || s?.service?.slug;
    const updated = s?.updatedAt || s?.updated_at || s?.createdAt || s?.created_at || "";

    const candidates = [
      s?.serviceDetails?.url,
      s?.url,
      s?.dashboardUrl,
      s?.liveUrl,
      slug ? `https://${slug}.onrender.com` : null,
    ].filter(Boolean);
    const url = candidates.find((u) => looksLikeWebUrl(String(u)));
    if (!name || !url) continue;

    out.push({
      id: `render-${s?.id || slug || name}`,
      name: String(name),
      url: normalizeExternalUrl(String(url)),
      description: (s?.serviceDetails?.plan || s?.type || "Render").toString(),
      source: "render",
      kind: "site",
      updated: isoDate(updated),
    });
  }

  return {
    entries: [...staticOnly, ...out],
    note: `Render: ${out.length} 件（static ${staticOnly.length} 件）`,
  };
}

async function fetchCloudflareEntries(cfg) {
  const ccfg = cfg?.cloudflare || {};
  if (ccfg.enabled === false) return { entries: [], note: "Cloudflare: オフ" };

  const staticOnly = normalizeStaticEntries(ccfg.static || [], "cloudflare");
  const accountId = ccfg.accountId || cloudflareAccountIdFromEnv;
  if (!cloudflareToken || !accountId) {
    return {
      entries: staticOnly,
      note: staticOnly.length
        ? "Cloudflare: API スキップ（token/accountId なし）/ static あり"
        : "Cloudflare: スキップ（token/accountId なし）",
    };
  }

  const res = await safeFetchJson(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects`,
    {
      headers: {
        Authorization: `Bearer ${cloudflareToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok || !res.data || !Array.isArray(res.data.result)) {
    const msg = res.text ? String(res.text).slice(0, 200) : "unknown";
    return {
      entries: staticOnly,
      note: `Cloudflare: API取得失敗 ${res.status} ${msg}`,
    };
  }

  const out = [];
  for (const p of res.data.result) {
    const name = p?.name;
    if (!name) continue;
    const customDomain = Array.isArray(p?.domains) ? p.domains[0] : null;
    const fallbackSubdomain = p?.subdomain ? `https://${p.subdomain}` : `https://${name}.pages.dev`;
    const url = customDomain ? normalizeExternalUrl(customDomain) : fallbackSubdomain;
    out.push({
      id: `cloudflare-${name}`,
      name: String(name),
      url,
      description: "Cloudflare Pages",
      source: "cloudflare",
      kind: "site",
      updated: isoDate(
        p?.latest_deployment?.modified_on
          || p?.latest_deployment?.created_on
          || p?.created_on
      ),
    });
  }

  return {
    entries: [...staticOnly, ...out],
    note: `Cloudflare: ${out.length} 件（static ${staticOnly.length} 件）`,
  };
}

async function run() {
  const config = readConfig();
  const log = [];
  const manual = normalizeManual(config.manual || []);
  const ghUser = (config.github && config.github.user) || "";
  let fromGithub = [];
  if (ghUser) {
    try {
      const repos = await fetchAllGithubRepos(ghUser);
      fromGithub = toGithubAppEntries(repos, config);
      log.push(
        `GitHub @${ghUser}: カード用 ${fromGithub.length} 件 / 取得リポ ${repos.length} 件（公開）`
      );
    } catch (e) {
      log.push(`GitHub: 失敗 — ${e.message}`);
    }
  } else {
    log.push("GitHub: 設定なし。スキップ。");
  }

  const nRes = await fetchNetlifyEntries(
    !config.netlify || config.netlify.enabled !== false
  );
  log.push(nRes.note);
  nRes.entries.forEach((e) => log.push(`  · ${e.name}`));

  const vRes = await fetchVercelEntries(config);
  log.push(vRes.note);
  vRes.entries.forEach((e) => log.push(`  · ${e.name}`));

  const rRes = await fetchRenderEntries(config);
  log.push(rRes.note);
  rRes.entries.forEach((e) => log.push(`  · ${e.name}`));

  const cRes = await fetchCloudflareEntries(config);
  log.push(cRes.note);
  cRes.entries.forEach((e) => log.push(`  · ${e.name}`));

  const autoParts = [
    ...fromGithub,
    ...nRes.entries,
    ...vRes.entries,
    ...rRes.entries,
    ...cRes.entries,
  ];

  const finalList = buildFinalList(manual, autoParts);
  const out = {
    displayName: (config.profile && config.profile.displayName) || "ymd",
    githubUser: (config.github && config.github.user) || "",
    generatedAt: new Date().toISOString(),
    items: finalList,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  return { ...out, log };
}

run()
  .then((out) => {
    const n = out && out.items ? out.items.length : 0;
    console.log(`完了: data/apps.json に ${n} 件書き出しました。`);
    (out && out.log ? out.log : []).forEach((l) => console.log(" —", l));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
