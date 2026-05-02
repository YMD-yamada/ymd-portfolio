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

function createCard(item, index) {
  const li = document.createElement("li");
  const article = document.createElement("article");
  article.className = "app-card";

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
  a.append("開く", " ", sp);
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

function emptyState(repoUrl, profileUrl) {
  const li = document.createElement("li");
  li.className = "app-grid__empty app-grid__empty--block";
  const p = document.createElement("p");
  p.className = "app-grid__empty-text";
  p.appendChild(
    document.createTextNode(
      "ストア公開済みのアプリはまだなく、ここに載せるリンクもこれから増やしていきます。リポジトリや試作の置き場は "
    )
  );
  const repo = document.createElement("a");
  repo.className = "app-grid__empty-link";
  repo.href = repoUrl || "https://github.com/YMD-yamada/ymd-portfolio";
  repo.target = "_blank";
  repo.rel = "noopener noreferrer";
  repo.textContent = "ソースコード";
  p.appendChild(repo);
  p.appendChild(document.createTextNode(" を参照してください。"));

  if (profileUrl) {
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
  p.textContent =
    "一覧データを読み込めませんでした。HTTPS で公開されているか、データファイルの配置をご確認ください。";
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

  const list = d.items;
  const site = window.__SITE__ || {};
  if (!list || !list.length) {
    host.appendChild(emptyState(site.githubRepoUrl, site.githubProfileUrl));
    return;
  }
  list.forEach((it, i) => host.appendChild(createCard(it, i)));
}

async function boot() {
  setYear();

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
    render(data);
  } catch {
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
