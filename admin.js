/* global document, window, fetch, btoa */

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

function parseOwnerRepo(url) {
  try {
    const u = new URL(url);
    const segs = u.pathname.replace(/^\/+/, "").split("/");
    if (segs.length >= 2) return { owner: segs[0], repo: segs[1] };
  } catch {}
  return { owner: "", repo: "" };
}

function normalizeCategory(v) {
  const s = String(v || "").trim();
  return s || "";
}

function setStatus(msg, isError) {
  const el = q("status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "#ff8d8d" : "#6fe6b6";
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

    const url = document.createElement("div");
    url.innerHTML = `<strong>${it.name}</strong><div class="entry__url">${it.url}</div>`;

    const nameInput = document.createElement("input");
    nameInput.placeholder = "表示名（空なら自動）";
    nameInput.value = byUrl[it.url]?.displayName || "";
    nameInput.className = "entry__name";

    const catInput = document.createElement("input");
    catInput.placeholder = "カテゴリ（例: 公開中）";
    catInput.value = byUrl[it.url]?.category || it.category || "";
    catInput.className = "entry__cat";

    row.append(url, nameInput, catInput);
    host.appendChild(row);
  });
}

function collectOverrides() {
  const rows = Array.from(document.querySelectorAll(".entry"));
  const byUrl = {};
  rows.forEach((row) => {
    const url = row.dataset.url;
    const displayName = row.querySelector(".entry__name").value.trim();
    const category = normalizeCategory(row.querySelector(".entry__cat").value);
    if (displayName || category) byUrl[url] = { displayName, category };
  });
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

  const { owner, repo } = parseOwnerRepo(site.githubRepoUrl || "");
  q("repo-owner").value = owner || "YMD-yamada";
  q("repo-name").value = repo || "ymd-portfolio";
  q("category-order").value = (config.categoryOrder || []).join(", ");

  buildRows(apps.items || [], config);
  setStatus("読み込み完了");

  q("reload").addEventListener("click", () => {
    buildRows(window.__adminData.apps.items || [], window.__adminData.config);
    setStatus("編集中のフォームを再生成しました");
  });

  async function save(triggerSync) {
    const token = q("gh-token").value.trim();
    const ownerVal = q("repo-owner").value.trim();
    const repoVal = q("repo-name").value.trim();
    const branch = q("repo-branch").value.trim() || "master";
    if (!token || !ownerVal || !repoVal) {
      setStatus("Token / Owner / Repository は必須です", true);
      return;
    }
    const message = q("commit-message").value.trim() || "Update app overrides";
    const config = structuredClone(window.__adminData.config || {});
    config.categoryOrder = q("category-order")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    config.overrides = config.overrides || {};
    config.overrides.byUrl = collectOverrides();

    setStatus("GitHubへ保存中…");
    try {
      await updateConfigOnGithub(config, token, ownerVal, repoVal, branch, message);
      window.__adminData.config = config;
      if (triggerSync) {
        setStatus("保存完了。デプロイワークフローを起動しています…");
        await triggerDeployWorkflow(token, ownerVal, repoVal, branch);
        setStatus("保存＋同期を開始しました。Actions を確認してください。");
      } else {
        setStatus("config/apps.config.json を保存しました。");
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
