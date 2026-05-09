/* global document */

function qs(sel) {
  return document.querySelector(sel);
}

function setTextContent(el, text) {
  if (el) el.textContent = text;
}

function setYear() {
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());
}

function readDatasetPath(name, fallback) {
  const v = document.body && document.body.dataset ? document.body.dataset[name] : "";
  return (v || fallback || "").trim();
}

async function fetchJson(path) {
  const r = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function buildMailtoHref(site) {
  const mail = (site.contactEmail || "").trim();
  if (!mail) return "";

  const canonical = (site.canonicalUrl || "").trim() || "https://ymd-portfolio-site.pages.dev/";
  const subject =
    (site.contactMailSubject || "").trim() || "[ymd Portfolio 問い合わせ]";
  const footer = (site.contactMailBodyFooter || "").trim();
  const defaultFooter =
    "\n\n---\n（以下にご記入ください）\n\nお名前（任意）：\n\n\nご用件：\n\n\n";
  const body = [
    "【ポートフォリオHPから送信】",
    "この文面と件名は、このサイトの「連絡」リンクからメールを作成したときに自動で入ります。",
    `送信元URL: ${canonical}`,
    `（受信箱での振り分け例: 件名が「${subject}」で始まるもの）`,
    footer || defaultFooter,
  ].join("\n");

  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${mail}?${params.toString()}`;
}

function applySiteMeta(site) {
  if (!site || typeof site !== "object") return;

  const canonical = (site.canonicalUrl || "").trim();
  if (canonical) {
    const link = document.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute("href", canonical);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", canonical);
  }

  const metaDesc = (site.metaDescription || "").trim();
  if (metaDesc) {
    const dm = document.querySelector('meta[name="description"]');
    if (dm) dm.setAttribute("content", metaDesc);
    const ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute("content", metaDesc);
    const twd = document.querySelector('meta[name="twitter:description"]');
    if (twd) twd.setAttribute("content", metaDesc);
  }

  const ogImage = (site.ogImage || "").trim();
  if (ogImage) {
    let m = document.querySelector('meta[property="og:image"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("property", "og:image");
      document.head.appendChild(m);
    }
    m.setAttribute("content", ogImage);
  }

  const mailHref = buildMailtoHref(site);
  const a = document.getElementById("connect-mail");
  if (a && mailHref) {
    a.setAttribute("href", mailHref);
    const hint = a.querySelector(".connect-card__hint");
    if (hint) {
      hint.textContent =
        `${(site.contactEmail || "").trim()} · 件名・本文に送信元（このHP）が入ります`;
    }
  }
}

function applyBranding(d) {
  if (!d) return;
  const site = window.__SITE__ || {};
  const keepMeta = !!(site.metaDescription && String(site.metaDescription).trim());

  if (d.displayName) {
    setTextContent(document.getElementById("brand"), d.displayName);
    setTextContent(document.getElementById("footer-name"), d.displayName);
    document.title = `${d.displayName} — Portfolio`;
  }
  const dm = document.querySelector('meta[name="description"]');
  if (dm && !keepMeta) {
    dm.setAttribute(
      "content",
      `${d.displayName || "ymd"} のポートフォリオ。制作物、関心領域、連絡先をまとめています。`
    );
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getPreviewOverrideMap() {
  try {
    const raw = localStorage.getItem("portfolio_preview_overrides");
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && data.byUrl && typeof data.byUrl === "object") {
      return data;
    }
  } catch {}
  return { byUrl: {}, categoryOrder: [] };
}

function applyPreviewOverrides(list) {
  const data = getPreviewOverrideMap();
  const byUrl = data.byUrl || {};
  if (!list || !list.length) return list || [];
  return list.map((it) => {
    const rule = byUrl[it.url];
    if (!rule) return it;
    const next = { ...it };
    if (rule.displayName) next.name = rule.displayName;
    if (rule.category) next.category = rule.category;
    if (rule.visibility) next.visibility = rule.visibility;
    if (rule.accessHash) next.accessHash = rule.accessHash;
    if (rule.note) next.note = rule.note;
    if (rule.description) next.description = rule.description;
    if (rule.audience) next.audience = rule.audience;
    return next;
  });
}

async function ensureLimitedAccess(item) {
  const key = `portfolio_limited_ok:${item.url}`;
  try {
    if (sessionStorage.getItem(key) === "1") return true;
  } catch {}
  const entered = window.prompt("この制作物は限定公開です。閲覧パスワードを入力してください。", "");
  if (!entered) return false;
  const got = await sha256Hex(entered.trim());
  if (got !== String(item.accessHash || "").trim().toLowerCase()) {
    window.alert("パスワードが正しくありません。");
    return false;
  }
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
  return true;
}

const APPS_LAYOUT_KEY = "portfolio_apps_layout";
const AUDIENCE_MODE_KEY = "portfolio_audience_mode";

function inferAudience(item) {
  const raw = String(item?.audience || "").trim().toLowerCase();
  if (raw === "kid" || raw === "child") return "kid";
  if (raw === "adult" || raw === "r18") return "adult";
  const category = String(item?.category || "").toLowerCase();
  const name = String(item?.name || "").toLowerCase();
  const desc = String(item?.description || "").toLowerCase();
  const text = `${category} ${name} ${desc}`;
  if (/r-?18|成人|18\+|nsfw/.test(text)) return "adult";
  return "normal";
}

function getSavedAudienceMode() {
  try {
    const v = localStorage.getItem(AUDIENCE_MODE_KEY);
    if (v === "kid" || v === "normal" || v === "adult") return v;
  } catch {}
  return "normal";
}

function isVisibleForMode(item, mode) {
  const audience = inferAudience(item);
  if (mode === "adult") return true;
  if (mode === "kid") return audience === "kid" || audience === "normal";
  return audience !== "adult";
}

function applyAudienceMode(mode, opts = {}) {
  const rerender = opts.rerender !== false;
  const sec = document.getElementById("apps");
  if (!sec) return;
  sec.classList.remove("audience--kid", "audience--normal", "audience--adult");
  sec.classList.add(`audience--${mode}`);
  document.querySelectorAll("[data-audience-mode]").forEach((btn) => {
    const on = btn.getAttribute("data-audience-mode") === mode;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  try {
    localStorage.setItem(AUDIENCE_MODE_KEY, mode);
  } catch {}
  if (rerender && window.__APPS_DATA__) render(window.__APPS_DATA__);
}

function getSavedAppsLayout() {
  try {
    const v = localStorage.getItem(APPS_LAYOUT_KEY);
    if (v === "compact" || v === "list" || v === "cards") return v;
  } catch {}
  return "cards";
}

function applyAppsLayout(layout) {
  const sec = document.getElementById("apps");
  if (!sec) return;
  sec.classList.remove("apps-layout--cards", "apps-layout--compact", "apps-layout--list");
  sec.classList.add(`apps-layout--${layout}`);
  document.querySelectorAll("[data-apps-layout]").forEach((btn) => {
    const on = btn.getAttribute("data-apps-layout") === layout;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  try {
    localStorage.setItem(APPS_LAYOUT_KEY, layout);
  } catch {}
}

function wireAppsLayoutControls() {
  const sec = document.getElementById("apps");
  if (!sec || sec.dataset.layoutWired === "1") return;
  sec.dataset.layoutWired = "1";
  sec.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-apps-layout]");
    if (!btn) return;
    const layout = btn.getAttribute("data-apps-layout");
    if (layout) applyAppsLayout(layout);
  });
}

function wireAudienceControls() {
  const sec = document.getElementById("apps");
  if (!sec || sec.dataset.audienceWired === "1") return;
  sec.dataset.audienceWired = "1";
  sec.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-audience-mode]");
    if (!btn) return;
    const mode = btn.getAttribute("data-audience-mode");
    if (mode) applyAudienceMode(mode, { rerender: true });
  });
}

function createCard(item, index) {
  const li = document.createElement("li");
  const article = document.createElement("article");
  const vis = String(item.visibility || "public");
  article.className = "app-card";
  if (vis === "limited") article.classList.add("app-card--limited");

  const n = String(index + 1).padStart(2, "0");
  const num = document.createElement("div");
  num.className = "app-card__icon";
  num.setAttribute("aria-hidden", "true");
  num.textContent = n;
  article.appendChild(num);

  const h3 = document.createElement("h3");
  h3.className = "app-card__name";
  h3.textContent = item.name;
  article.appendChild(h3);

  const cat = document.createElement("p");
  cat.className = "app-card__meta";
  cat.textContent = item.category || "その他";
  article.appendChild(cat);

  if (vis !== "public") {
    const badge = document.createElement("p");
    badge.className = "app-card__state";
    badge.textContent = vis === "limited" ? "限定公開" : "非公開";
    article.appendChild(badge);
  }

  const p = document.createElement("p");
  p.className = "app-card__desc";
  p.textContent = item.description || "";
  article.appendChild(p);

  const a = document.createElement("a");
  a.className = "app-card__link";
  a.href = item.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  const sp = document.createElement("span");
  sp.className = "app-card__arrow";
  sp.setAttribute("aria-hidden", "true");
  sp.textContent = "↗";
  a.append(vis === "limited" ? "開く（限定）" : "開く", " ", sp);
  if (vis === "limited") {
    a.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const ok = await ensureLimitedAccess(item);
      if (!ok) return;
      window.open(item.url, "_blank", "noopener,noreferrer");
    });
  }
  if (item.kind === "repo") {
    a.setAttribute(
      "title",
      "リポジトリページです。公開サイトの URL が別にある場合は、そちらをご利用ください。"
    );
  }
  article.appendChild(a);

  li.appendChild(article);
  return li;
}

function groupedByCategory(items, order) {
  const map = new Map();
  (items || []).forEach((it) => {
    const cat = (it && it.category ? String(it.category) : "その他").trim() || "その他";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(it);
  });
  const keys = Array.from(map.keys());
  const pinned = Array.isArray(order) ? order.filter((x) => map.has(x)) : [];
  const rest = keys.filter((k) => !pinned.includes(k)).sort((a, b) => a.localeCompare(b));
  return [...pinned, ...rest].map((cat) => ({ category: cat, items: map.get(cat) || [] }));
}

function emptyState(repoUrl, profileUrl, mode) {
  const li = document.createElement("li");
  li.className = "app-grid__empty app-grid__empty--block";
  const p = document.createElement("p");
  p.className = "app-grid__empty-text";
  if (mode === "kid") {
    p.appendChild(
      document.createTextNode(
        "子供用モードで表示できる制作物がまだありません。通常用または大人用に切り替えると他の制作物も表示できます。"
      )
    );
  } else {
    p.appendChild(
      document.createTextNode(
        "ストア公開済みのアプリはまだなく、ここに載せるリンクもこれから増やしていきます。リポジトリや試作の置き場は "
      )
    );
  }
  if (mode !== "kid") {
    const repo = document.createElement("a");
    repo.className = "app-grid__empty-link";
    repo.href = repoUrl || "https://github.com/YMD-yamada/ymd-portfolio";
    repo.target = "_blank";
    repo.rel = "noopener noreferrer";
    repo.textContent = "ソースコード";
    p.appendChild(repo);
    p.appendChild(document.createTextNode(" を参照してください。"));
  }

  if (profileUrl && mode !== "kid") {
    p.appendChild(document.createTextNode(" 公開プロフィールは "));
    const prof = document.createElement("a");
    prof.className = "app-grid__empty-link";
    prof.href = profileUrl;
    prof.target = "_blank";
    prof.rel = "noopener noreferrer";
    prof.textContent = "GitHub";
    p.appendChild(prof);
    p.appendChild(document.createTextNode(" から。"));
  }

  li.appendChild(p);
  return li;
}

function errState() {
  const li = document.createElement("li");
  li.className = "app-grid__empty app-grid__empty--block";
  const p = document.createElement("p");
  p.className = "app-grid__empty-text";
  p.textContent = "一覧を読み込めませんでした。しばらくしてから再度お試しください。";
  li.appendChild(p);
  return li;
}

function render(apps) {
  const host = document.getElementById("app-grid");
  if (!host) return;
  const prevStatus = document.getElementById("app-status");
  if (prevStatus) prevStatus.remove();
  host.innerHTML = "";
  host.setAttribute("aria-busy", "false");

  const d = apps || {};
  applyBranding(d);
  setYear();

  const list = applyPreviewOverrides(d.items || []);
  const site = window.__SITE__ || {};
  const mode = getSavedAudienceMode();
  const visible = list.filter((it) => {
    if (String(it.visibility || "public") === "private") return false;
    return isVisibleForMode(it, mode);
  });
  const toolbar = document.getElementById("apps-toolbar");
  if (toolbar) toolbar.hidden = !visible.length;

  if (!visible.length) {
    host.appendChild(emptyState(site.githubRepoUrl, site.githubProfileUrl, mode));
    return;
  }
  const preview = getPreviewOverrideMap();
  const order = Array.isArray(preview.categoryOrder) && preview.categoryOrder.length
    ? preview.categoryOrder
    : d.categoryOrder;
  const groups = groupedByCategory(visible, order);
  groups.forEach((g) => {
    const wrap = document.createElement("li");
    wrap.className = "app-group";

    const head = document.createElement("div");
    head.className = "app-group__head";
    const title = document.createElement("h3");
    title.className = "app-group__title";
    title.textContent = g.category;
    const count = document.createElement("span");
    count.className = "app-group__count";
    count.textContent = `${g.items.length}件`;
    head.append(title, count);

    const grid = document.createElement("ul");
    grid.className = "app-subgrid";
    grid.setAttribute("role", "list");
    g.items.forEach((it, i) => grid.appendChild(createCard(it, i)));

    wrap.append(head, grid);
    host.appendChild(wrap);
  });

  wireAppsLayoutControls();
  wireAudienceControls();
  applyAppsLayout(getSavedAppsLayout());
  applyAudienceMode(getSavedAudienceMode(), { rerender: false });
}

async function boot() {
  setYear();
  wireAppsLayoutControls();
  wireAudienceControls();
  applyAppsLayout(getSavedAppsLayout());
  applyAudienceMode(getSavedAudienceMode(), { rerender: false });

  const sitePath = readDatasetPath("siteConfig", "config/site.json");
  const appsPath = readDatasetPath("apps", "data/apps.json");

  let site = null;
  try {
    site = await fetchJson(sitePath);
    window.__SITE__ = site;
    applySiteMeta(site);
  } catch {
    window.__SITE__ = {};
  }

  const host = document.getElementById("app-grid");
  if (host) host.setAttribute("aria-busy", "true");

  try {
    const data = await fetchJson(appsPath);
    window.__APPS_DATA__ = data;
    render(data);
  } catch {
    const tb = document.getElementById("apps-toolbar");
    if (tb) tb.hidden = true;
    if (host) {
      const prevStatus = document.getElementById("app-status");
      if (prevStatus) prevStatus.remove();
      host.innerHTML = "";
      host.appendChild(errState());
      host.setAttribute("aria-busy", "false");
    }
    applyBranding({ displayName: (qs("#brand") && qs("#brand").textContent) || "ymd" });
    setYear();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void boot();
  });
} else {
  void boot();
}
