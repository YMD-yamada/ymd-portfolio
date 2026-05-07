/* global document, window, fetch, btoa, localStorage, crypto */

function q(id) {
  return document.getElementById(id);
}

function datasetPath(name, fallback) {
  const v = document.body?.dataset?.[name] || "";
  return (v || fallback).trim();
}

async function fetchJson(path) {
  const r = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

function ghApi(path, token, init = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeCategory(v) {
  return String(v || "").trim();
}

function normalizeVisibility(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "private" || s === "limited") return s;
  return "public";
}

function setStatus(msg, isError) {
  const el = q("status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "#ff8d8d" : "#6fe6b6";
}

function categoryPool(config) {
  const set = new Set(config?.categoryOrder || []);
  Object.values(config?.overrides?.byUrl || {}).forEach((v) => {
    if (v?.category) set.add(v.category);
  });
  return Array.from(set).filter(Boolean);
}

function renderCategoryChips(config) {
  const host = q("category-chips");
  host.innerHTML = "";
  categoryPool(config).forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = cat;
    b.addEventListener("click", () => {
      const active = document.activeElement;
      if (active && active.classList && active.classList.contains("entry__cat")) {
        active.value = cat;
      }
    });
    host.appendChild(b);
  });
}

function buildRows(items, config) {
  const host = q("editor");
  host.innerHTML = "";
  host.className = "grid";
  const byUrl = config?.overrides?.byUrl || {};

  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "entry";
    row.dataset.url = it.url;

    const info = document.createElement("div");
    info.className = "entry__info";
    info.innerHTML = `<strong>${it.name}</strong><div class="entry__url">${it.url}</div>`;

    const open = document.createElement("a");
    open.className = "entry__open";
    open.href = it.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "新タブで確認";
    info.appendChild(open);

    const nameInput = document.createElement("input");
    nameInput.placeholder = "表示名（空なら自動）";
    nameInput.value = byUrl[it.url]?.displayName || "";
    nameInput.className = "entry__name";

    const catInput = document.createElement("input");
    catInput.placeholder = "カテゴリ（例: 公開中）";
    catInput.value = byUrl[it.url]?.category || it.category || "";
    catInput.className = "entry__cat";

    const vis = document.createElement("select");
    vis.className = "entry__vis";
    ["public", "private", "limited"].forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v === "public" ? "公開" : v === "private" ? "非公開" : "限定公開";
      vis.appendChild(o);
    });
    vis.value = normalizeVisibility(byUrl[it.url]?.visibility || it.visibility || "public");

    const pw = document.createElement("input");
    pw.className = "entry__pw";
    pw.type = "password";
    pw.placeholder = "限定公開パスワード（変更時のみ入力）";
    pw.dataset.hash = byUrl[it.url]?.accessHash || it.accessHash || "";

    const note = document.createElement("p");
    note.className = "entry__note";
    note.textContent = byUrl[it.url]?.note || it.note || "";

    const right = document.createElement("div");
    right.className = "entry__right";
    right.append(catInput, vis, pw, note);

    vis.addEventListener("change", () => {
      pw.style.display = vis.value === "limited" ? "block" : "none";
    });
    pw.style.display = vis.value === "limited" ? "block" : "none";

    row.append(info, nameInput, right);
    host.appendChild(row);
  });
}

async function collectOverrides() {
  const rows = Array.from(document.querySelectorAll(".entry"));
  const byUrl = {};
  for (const row of rows) {
    const url = row.dataset.url;
    const displayName = row.querySelector(".entry__name").value.trim();
    const category = normalizeCategory(row.querySelector(".entry__cat").value);
    const visibility = normalizeVisibility(row.querySelector(".entry__vis").value);
    const pwInput = row.querySelector(".entry__pw");
    let accessHash = String(pwInput.dataset.hash || "");
    const rawPw = pwInput.value.trim();
    if (visibility === "limited" && rawPw) {
      accessHash = await sha256Hex(rawPw);
    }
    if (displayName || category || visibility !== "public" || accessHash) {
      byUrl[url] = {
        displayName,
        category,
        visibility,
        accessHash: visibility === "limited" ? accessHash : "",
      };
    }
  }
  return byUrl;
}

async function updateConfigOnGithub(config, token, owner, repo, branch, message) {
  const path = "config/apps.config.json";
  const getRes = await ghApi(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, token);
  if (!getRes.ok) throw new Error(`config取得失敗: ${getRes.status}`);
  const current = await getRes.json();
  const body = {
    message,
    content: utf8ToBase64(`${JSON.stringify(config, null, 2)}\n`),
    sha: current.sha,
    branch,
  };
  const putRes = await ghApi(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!putRes.ok) {
    const t = await putRes.text();
    throw new Error(`config保存失敗: ${putRes.status} ${t.slice(0, 240)}`);
  }
}

async function triggerDeployWorkflow(token, owner, repo, branch) {
  const workflow = "deploy-cloudflare-pages.yml";
  const res = await ghApi(
    `/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ ref: branch }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`workflow起動失敗: ${res.status} ${t.slice(0, 240)}`);
  }
}

function showStudioUI() {
  ["studio-card", "apps-card", "save-card"].forEach((id) => {
    q(id).classList.remove("hidden");
  });
  q("gate-card").classList.add("hidden");
}

function savePreviewLocal(categoryOrder, byUrl) {
  localStorage.setItem(
    "portfolio_preview_overrides",
    JSON.stringify({ categoryOrder, byUrl, updatedAt: Date.now() })
  );
}

async function boot() {
  const sitePath = datasetPath("siteConfig", "config/site.json");
  const appsPath = datasetPath("apps", "data/apps.json");
  const configPath = datasetPath("appConfig", "config/apps.config.json");

  const [site, apps, config] = await Promise.all([
    fetchJson(sitePath),
    fetchJson(appsPath),
    fetchJson(configPath),
  ]);
  window.__adminData = { site, apps, config };

  const owner = site.adminRepoOwner || "YMD-yamada";
  const repo = site.adminRepoName || "ymd-portfolio";
  const branch = site.adminRepoBranch || "master";

  q("category-order").value = (config.categoryOrder || []).join(", ");
  buildRows(apps.items || [], config);
  renderCategoryChips(config);
  setStatus("読み込み完了");

  q("unlock-admin").addEventListener("click", async () => {
    const raw = q("admin-pass").value.trim();
    const expected = String(site.adminAccessHash || "").toLowerCase();
    if (!expected) {
      showStudioUI();
      return setStatus("認証なしモードで編集できます。");
    }
    if (!raw) return setStatus("管理パスワードを入力してください", true);
    const got = await sha256Hex(raw);
    if (!expected || got !== expected) return setStatus("認証に失敗しました", true);
    showStudioUI();
    setStatus("認証しました。編集できます。");
  });

  if (!String(site.adminAccessHash || "").trim()) {
    showStudioUI();
    setStatus("認証なしモードで編集できます。");
  }

  q("reload").addEventListener("click", () => {
    buildRows(window.__adminData.apps.items || [], window.__adminData.config);
    renderCategoryChips(window.__adminData.config || {});
    setStatus("一覧を再生成しました");
  });

  async function composeConfig() {
    const next = structuredClone(window.__adminData.config || {});
    next.categoryOrder = q("category-order")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    next.overrides = next.overrides || {};
    next.overrides.byUrl = await collectOverrides();
    return next;
  }

  q("apply-local").addEventListener("click", async () => {
    const configNext = await composeConfig();
    savePreviewLocal(configNext.categoryOrder || [], configNext.overrides.byUrl || {});
    setStatus("このブラウザで適用しました。公開ページを再読み込みして確認できます。");
  });

  async function save(triggerSync) {
    const token = q("gh-token").value.trim();
    if (!token) return setStatus("保存には GitHub Token が必要です", true);

    const message = q("commit-message").value.trim() || "Update app overrides from studio";
    const configNext = await composeConfig();

    setStatus("まずブラウザ内へ適用し、続いて GitHub へ保存します…");
    try {
      savePreviewLocal(configNext.categoryOrder || [], configNext.overrides.byUrl || {});
      await updateConfigOnGithub(configNext, token, owner, repo, branch, message);
      window.__adminData.config = configNext;
      if (triggerSync) {
        await triggerDeployWorkflow(token, owner, repo, branch);
        setStatus("保存＋再デプロイを開始しました。Actions を確認してください。");
      } else {
        setStatus("保存しました。次回デプロイ時に公開へ反映されます。");
      }
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  q("save-config").addEventListener("click", () => {
    void save(false);
  });
  q("save-and-sync").addEventListener("click", () => {
    void save(true);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void boot();
  });
} else {
  void boot();
}
