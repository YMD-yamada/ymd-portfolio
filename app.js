/* global document */
const APPS_PATH = "data/apps.json";

function setTextContent(el, text) {
  if (el) el.textContent = text;
}

function setYear() {
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());
}

function applyBranding(d) {
  if (!d) return;
  if (d.displayName) {
    setTextContent(document.getElementById("brand"), d.displayName);
    setTextContent(document.getElementById("footer-name"), d.displayName);
    document.title = `${d.displayName} — 作品と雑多な趣味`;
  }
  const dm = document.querySelector('meta[name="description"]');
  if (dm) {
    const g = d.githubUser ? ` GitHub: @${d.githubUser}。` : "";
    dm.setAttribute(
      "content",
      `${d.displayName || "ymd"} — 作った作品と自己紹介。${g}`.trim()
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
    a.setAttribute("title", "GitHub 上のリポジトリ。homepage にデプロイ URL を入れるとサイトとして表示されます。");
  }
  article.appendChild(a);

  li.appendChild(article);
  return li;
}

function emptyState(ghUser) {
  const li = document.createElement("li");
  li.className = "app-grid__empty app-grid__empty--block";
  const p = document.createElement("p");
  p.className = "app-grid__empty-text";
  const profile = document.createElement("a");
  profile.className = "app-grid__empty-link";
  profile.href = `https://github.com/${ghUser || "ymd"}`;
  profile.target = "_blank";
  profile.rel = "noopener noreferrer";
  profile.textContent = "GitHub プロフィール";
  p.appendChild(
    document.createTextNode("まだ一覧に出せる作品がありません。リポに ")
  );
  const c = document.createElement("code");
  c.className = "app-grid__code";
  c.textContent = "Website";
  p.appendChild(c);
  p.appendChild(
    document.createTextNode("（homepage）を書くか、")
  );
  p.appendChild(profile);
  p.appendChild(
    document.createTextNode(" をのぞくか。デプロイ前に")
  );
  const cmd = document.createElement("code");
  cmd.className = "app-grid__code";
  cmd.textContent = "npm run sync:apps";
  p.appendChild(cmd);
  p.appendChild(document.createTextNode(" も合わせてください。"));
  li.appendChild(p);
  return li;
}

function errState() {
  const li = document.createElement("li");
  li.className = "app-grid__empty app-grid__empty--block";
  const p = document.createElement("p");
  p.className = "app-grid__empty-text";
  p.textContent =
    "作品データを読めませんでした。HTTPS で配信したとき、または同じ階層に data/apps.json があるか確認してください。";
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
  if (!list || !list.length) {
    host.appendChild(emptyState(d.githubUser));
    return;
  }
  list.forEach((it, i) => host.appendChild(createCard(it, i)));
}

async function load() {
  const host = document.getElementById("app-grid");
  if (host) host.setAttribute("aria-busy", "true");
  let data = null;
  try {
    const r = await fetch(`${APPS_PATH}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch {
    if (host) {
      const prevStatus = document.getElementById("app-status");
      if (prevStatus) prevStatus.remove();
      host.innerHTML = "";
      host.appendChild(errState());
      host.setAttribute("aria-busy", "false");
    }
    setYear();
    return;
  }
  render(data);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setYear();
    void load();
  });
} else {
  setYear();
  void load();
}
