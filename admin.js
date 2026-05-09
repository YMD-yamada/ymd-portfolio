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

function normalizeAudience(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "kid" || s === "child") return "kid";
  if (s === "adult" || s === "r18") return "adult";
  return "normal";
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
  if (!set.size) {
    ["公開中", "学習中", "実験中", "その他"].forEach((c) => set.add(c));
  }
  return Array.from(set).filter(Boolean);
}

function renderCategoryManager() {
  const host = q("category-manager");
  host.innerHTML = "";
  const list = window.__studioCategories || [];
  list.forEach((cat, i) => {
    const row = document.createElement("div");
    row.className = "cat-row";
    row.dataset.index = String(i);

    const name = document.createElement("span");
    name.className = "cat-row__name";
    name.textContent = cat;

    const actions = document.createElement("div");
    actions.className = "cat-row__actions";
    actions.innerHTML =
      `<button type="button" class="cat-up">↑</button>
       <button type="button" class="cat-down">↓</button>
       <button type="button" class="cat-del">削除</button>`;
    row.append(name, actions);
    host.appendChild(row);
  });
}

function categoryOptions(selected) {
  const cats = window.__studioCategories || [];
  const opts = cats
    .map((c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`)
    .join("");
  return `<select class="entry__cat-select">${opts}</select>`;
}

function refreshAllCategorySelects() {
  const rows = Array.from(document.querySelectorAll(".entry"));
  rows.forEach((row) => {
    const current = row.querySelector(".entry__cat-select")?.value || "";
    const wrapper = row.querySelector(".entry__cat-wrap");
    if (!wrapper) return;
    wrapper.innerHTML = categoryOptions(current);
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

    const descInput = document.createElement("textarea");
    descInput.className = "entry__desc";
    descInput.placeholder = "説明（用途・利点。空のときは同期で入った文面）";
    descInput.rows = 2;
    descInput.value = (byUrl[it.url]?.description || it.description || "").trim();

    const mid = document.createElement("div");
    mid.className = "entry__mid";
    mid.append(nameInput, descInput);

    const catWrap = document.createElement("div");
    catWrap.className = "entry__cat-wrap";
    catWrap.innerHTML = categoryOptions(byUrl[it.url]?.category || it.category || "");

    const vis = document.createElement("select");
    vis.className = "entry__vis";
    ["public", "private", "limited"].forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v === "public" ? "公開" : v === "private" ? "非公開" : "限定公開";
      vis.appendChild(o);
    });
    vis.value = normalizeVisibility(byUrl[it.url]?.visibility || it.visibility || "public");

    const audience = document.createElement("select");
    audience.className = "entry__aud";
    [
      ["normal", "通常用"],
      ["kid", "子供用"],
      ["adult", "大人用（R18含む）"],
    ].forEach(([v, label]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      audience.appendChild(o);
    });
    const fallbackAudience =
      /r-?18|成人|18\+|nsfw/i.test(`${it.category || ""} ${it.name || ""} ${it.description || ""}`)
        ? "adult"
        : "normal";
    audience.value = normalizeAudience(byUrl[it.url]?.audience || it.audience || fallbackAudience);

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
    right.append(catWrap, vis, audience, pw, note);

    vis.addEventListener("change", () => {
      pw.style.display = vis.value === "limited" ? "block" : "none";
    });
    pw.style.display = vis.value === "limited" ? "block" : "none";

    row.append(info, mid, right);
    host.appendChild(row);
  });
}

async function collectOverrides() {
  const rows = Array.from(document.querySelectorAll(".entry"));
  const byUrl = {};
  for (const row of rows) {
    const url = row.dataset.url;
    const displayName = row.querySelector(".entry__name").value.trim();
    const description = row.querySelector(".entry__desc")?.value.trim() || "";
    const category = normalizeCategory(row.querySelector(".entry__cat-select").value);
    const visibility = normalizeVisibility(row.querySelector(".entry__vis").value);
    const audience = normalizeAudience(row.querySelector(".entry__aud").value);
    const pwInput = row.querySelector(".entry__pw");
    let accessHash = String(pwInput.dataset.hash || "");
    const rawPw = pwInput.value.trim();
    if (visibility === "limited" && rawPw) {
      accessHash = await sha256Hex(rawPw);
    }
    if (displayName || description || category || visibility !== "public" || accessHash || audience !== "normal") {
      const entry = {
        displayName,
        category,
        visibility,
        audience,
        accessHash: visibility === "limited" ? accessHash : "",
      };
      if (description) entry.description = description;
      byUrl[url] = entry;
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
  const publishHash = String(site.adminPublishHash || "").trim().toLowerCase();

  window.__studioCategories = categoryPool(config);
  buildRows(apps.items || [], config);
  renderCategoryManager();
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
    window.__studioCategories = categoryPool(window.__adminData.config || {});
    renderCategoryManager();
    setStatus("一覧を再生成しました");
  });

  q("add-category").addEventListener("click", () => {
    const input = q("new-category");
    const value = normalizeCategory(input.value);
    if (!value) return;
    if (!window.__studioCategories.includes(value)) {
      window.__studioCategories.push(value);
      renderCategoryManager();
      refreshAllCategorySelects();
      setStatus(`カテゴリ「${value}」を追加しました`);
    }
    input.value = "";
  });

  q("category-manager").addEventListener("click", (ev) => {
    const row = ev.target.closest(".cat-row");
    if (!row) return;
    const idx = Number(row.dataset.index);
    if (!Number.isFinite(idx)) return;
    const cats = window.__studioCategories;
    if (ev.target.classList.contains("cat-up") && idx > 0) {
      [cats[idx - 1], cats[idx]] = [cats[idx], cats[idx - 1]];
    } else if (ev.target.classList.contains("cat-down") && idx < cats.length - 1) {
      [cats[idx + 1], cats[idx]] = [cats[idx], cats[idx + 1]];
    } else if (ev.target.classList.contains("cat-del")) {
      if (cats.length <= 1) return setStatus("カテゴリは最低1つ必要です", true);
      cats.splice(idx, 1);
    } else {
      return;
    }
    renderCategoryManager();
    refreshAllCategorySelects();
  });

  async function composeConfig() {
    const next = structuredClone(window.__adminData.config || {});
    next.categoryOrder = [...(window.__studioCategories || [])];
    next.overrides = next.overrides || {};
    next.overrides.byUrl = await collectOverrides();
    return next;
  }

  q("apply-local").addEventListener("click", async () => {
    const configNext = await composeConfig();
    savePreviewLocal(configNext.categoryOrder || [], configNext.overrides.byUrl || {});
    setStatus("ローカル反映しました（GitHub未更新）。公開ページを再読み込みして確認できます。");
  });

  async function publishGithub() {
    const token = q("gh-token").value.trim();
    if (!token) return setStatus("GitHub公開には Token が必要です", true);
    if (!publishHash) return setStatus("adminPublishHash が未設定です。site.json を確認してください。", true);

    const pass = q("publish-pass").value.trim();
    if (!pass) return setStatus("公開用パスワードを入力してください", true);
    const got = await sha256Hex(pass);
    if (got.toLowerCase() !== publishHash) {
      return setStatus("公開用パスワードが一致しません", true);
    }

    const message = q("commit-message").value.trim() || "Update app overrides from studio";
    const configNext = await composeConfig();
    setStatus("ローカル反映 → GitHub保存 → 再デプロイを実行中…");
    try {
      savePreviewLocal(configNext.categoryOrder || [], configNext.overrides.byUrl || {});
      await updateConfigOnGithub(configNext, token, owner, repo, branch, message);
      window.__adminData.config = configNext;
      await triggerDeployWorkflow(token, owner, repo, branch);
      setStatus("GitHub公開を開始しました。Actions を確認してください。");
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  }

  q("publish-github").addEventListener("click", () => {
    void publishGithub();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void boot();
  });
} else {
  void boot();
}
