/* global document, window, fetch, crypto */

function q(id) {
  return document.getElementById(id);
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
  if (s === "kid" || s === "child" || s === "kids") return "kid";
  if (s === "adult" || s === "r18") return "adult";
  return "normal";
}

function normalizeUrlKey(url) {
  try {
    const u = new URL(url);
    const p = u.pathname === "/" || u.pathname === "" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.origin.toLowerCase()}${p}`.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
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
  if (!set.size) ["公開中", "学習中", "実験中", "その他"].forEach((c) => set.add(c));
  return Array.from(set).filter(Boolean);
}

function selectedUrlSet(config) {
  const urls = Array.isArray(config?.selection?.urls) ? config.selection.urls : [];
  return new Set(urls.map((u) => normalizeUrlKey(u)).filter(Boolean));
}

function mergeCandidateItems(candidates, apps, config) {
  const byKey = new Map();
  const push = (it) => {
    if (!it?.url) return;
    const k = normalizeUrlKey(it.url);
    if (!byKey.has(k)) byKey.set(k, { ...it });
  };
  (candidates?.items || []).forEach(push);
  (apps?.items || []).forEach(push);
  Object.keys(config?.overrides?.byUrl || {}).forEach((url) => {
    if (!byKey.has(normalizeUrlKey(url))) {
      const o = config.overrides.byUrl[url] || {};
      push({
        name: o.displayName || url,
        url,
        description: o.description || "",
        category: o.category || "",
        visibility: o.visibility || "public",
        audience: o.audience || "normal",
        source: "override",
      });
    }
  });
  (config?.manual || []).forEach((m) => push({ ...m, source: m.source || "manual" }));
  return Array.from(byKey.values());
}

function renderCategoryManager() {
  const host = q("category-manager");
  if (!host) return;
  host.innerHTML = "";
  (window.__studioCategories || []).forEach((cat, i) => {
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
  return (window.__studioCategories || [])
    .map((c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`)
    .join("");
}

function refreshAllCategorySelects() {
  document.querySelectorAll(".entry").forEach((row) => {
    const current = row.querySelector(".entry__cat-select")?.value || "";
    const wrapper = row.querySelector(".entry__cat-wrap");
    if (!wrapper) return;
    wrapper.innerHTML = `<select class="entry__cat-select">${categoryOptions(current)}</select>`;
  });
}

function updateSelectionCount() {
  const total = document.querySelectorAll(".entry").length;
  const n = document.querySelectorAll(".entry__select:checked").length;
  const el = q("selection-count");
  if (el) el.textContent = `選択 ${n} / ${total}`;
  const btn = q("ship");
  if (btn) btn.disabled = n === 0;
}

function buildRows(items, config) {
  const host = q("editor");
  host.innerHTML = "";
  host.className = "grid";
  const byUrl = config?.overrides?.byUrl || {};
  const selected = selectedUrlSet(config);

  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "entry entry--simple";
    row.dataset.url = it.url;

    const top = document.createElement("div");
    top.className = "entry__top";

    const pick = document.createElement("label");
    pick.className = "entry__pick";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "entry__select";
    cb.checked = selected.has(normalizeUrlKey(it.url));
    cb.addEventListener("change", updateSelectionCount);
    const title = document.createElement("strong");
    title.textContent = byUrl[it.url]?.displayName || it.name || it.url;
    pick.append(cb, title);

    const open = document.createElement("a");
    open.className = "entry__open";
    open.href = it.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.textContent = "開く";

    top.append(pick, open);

    const urlLine = document.createElement("div");
    urlLine.className = "entry__url";
    urlLine.textContent = it.url;

    const details = document.createElement("details");
    details.className = "entry__more";
    const summary = document.createElement("summary");
    summary.textContent = "表示名・説明・カテゴリなど";
    details.appendChild(summary);

    const nameInput = document.createElement("input");
    nameInput.placeholder = "表示名（空なら自動）";
    nameInput.value = byUrl[it.url]?.displayName || "";
    nameInput.className = "entry__name";

    const descInput = document.createElement("textarea");
    descInput.className = "entry__desc";
    descInput.placeholder = "説明";
    descInput.rows = 2;
    descInput.value = (byUrl[it.url]?.description || it.description || "").trim();

    const catWrap = document.createElement("div");
    catWrap.className = "entry__cat-wrap";
    catWrap.innerHTML = `<select class="entry__cat-select">${categoryOptions(
      byUrl[it.url]?.category || it.category || ""
    )}</select>`;

    const vis = document.createElement("select");
    vis.className = "entry__vis";
    [
      ["public", "公開"],
      ["private", "非公開"],
      ["limited", "限定公開"],
    ].forEach(([v, label]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      vis.appendChild(o);
    });
    vis.value = normalizeVisibility(byUrl[it.url]?.visibility || it.visibility || "public");

    const audience = document.createElement("select");
    audience.className = "entry__aud";
    [
      ["normal", "通常モード"],
      ["kid", "子供モード"],
      ["adult", "大人モード"],
    ].forEach(([v, label]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      audience.appendChild(o);
    });
    const override = byUrl[it.url];
    const fromOverrideAudience =
      override && Object.prototype.hasOwnProperty.call(override, "audience")
        ? override.audience
        : null;
    audience.value = normalizeAudience(fromOverrideAudience ?? it.audience ?? "normal");

    const pw = document.createElement("input");
    pw.className = "entry__pw";
    pw.type = "password";
    pw.placeholder = "限定公開パスワード（変更時のみ）";
    pw.dataset.hash = byUrl[it.url]?.accessHash || it.accessHash || "";
    pw.style.display = vis.value === "limited" ? "block" : "none";
    vis.addEventListener("change", () => {
      pw.style.display = vis.value === "limited" ? "block" : "none";
    });

    const moreBody = document.createElement("div");
    moreBody.className = "entry__more-body";
    moreBody.append(nameInput, descInput, catWrap, vis, audience, pw);
    details.appendChild(moreBody);

    row.append(top, urlLine, details);
    host.appendChild(row);
  });
  updateSelectionCount();
}

async function collectOverridesAndSelection() {
  const rows = Array.from(document.querySelectorAll(".entry"));
  const byUrl = {};
  const urls = [];
  for (const row of rows) {
    const url = row.dataset.url;
    const selected = row.querySelector(".entry__select")?.checked;
    const displayName = row.querySelector(".entry__name").value.trim();
    const description = row.querySelector(".entry__desc")?.value.trim() || "";
    const category = normalizeCategory(row.querySelector(".entry__cat-select").value);
    const visibility = normalizeVisibility(row.querySelector(".entry__vis").value);
    const audience = normalizeAudience(row.querySelector(".entry__aud").value);
    const pwInput = row.querySelector(".entry__pw");
    let accessHash = String(pwInput.dataset.hash || "");
    const rawPw = pwInput.value.trim();
    if (visibility === "limited" && rawPw) accessHash = await sha256Hex(rawPw);

    const entry = { audience, category, visibility };
    if (displayName) entry.displayName = displayName;
    if (description) entry.description = description;
    if (visibility === "limited" && accessHash) entry.accessHash = accessHash;
    byUrl[url] = entry;
    if (selected) urls.push(url);
  }
  return { byUrl, urls };
}

async function composeConfig() {
  const next = structuredClone(window.__adminData.config || {});
  next.categoryOrder = [...(window.__studioCategories || [])];
  next.overrides = next.overrides || {};
  const collected = await collectOverridesAndSelection();
  next.overrides.byUrl = collected.byUrl;
  next.selection = { mode: "allowlist", urls: collected.urls };
  return next;
}

function showStudioUI() {
  ["apps-card", "studio-card", "save-card"].forEach((id) => q(id)?.classList.remove("hidden"));
  q("gate-card")?.classList.add("hidden");
}

function applyState(state) {
  window.__adminData = {
    site: state.site || {},
    apps: state.apps || { items: [] },
    candidates: state.candidates || { items: [] },
    config: state.config || {},
  };
  window.__studioCategories = categoryPool(window.__adminData.config);
  const items = mergeCandidateItems(
    window.__adminData.candidates,
    window.__adminData.apps,
    window.__adminData.config
  );
  buildRows(items, window.__adminData.config);
  renderCategoryManager();
}

async function api(path, init) {
  const r = await fetch(path, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) throw new Error(data.error || `${path}: ${r.status}`);
  return data;
}

async function boot() {
  const gateStatus = q("gate-status");
  try {
    await api("/api/health");
  } catch {
    if (gateStatus) {
      gateStatus.textContent = "Studio が止まっています。エージェントに「studio を開いて」と依頼してください。";
      gateStatus.style.color = "#ff8d8d";
    }
    return;
  }

  try {
    applyState(await api("/api/state"));
    showStudioUI();
    setStatus("チェックして「本番に反映」を押すだけです。");
  } catch (e) {
    if (gateStatus) {
      gateStatus.textContent = String(e.message || e);
      gateStatus.style.color = "#ff8d8d";
    }
    return;
  }

  q("refresh-candidates")?.addEventListener("click", async () => {
    setStatus("候補を更新中…");
    try {
      const result = await api("/api/refresh-candidates", { method: "POST", body: "{}" });
      applyState(await api("/api/state"));
      setStatus(`候補 ${result.candidates} / 公開 ${result.published}`);
    } catch (e) {
      setStatus(String(e.message || e), true);
    }
  });

  q("add-category")?.addEventListener("click", () => {
    const input = q("new-category");
    const value = normalizeCategory(input.value);
    if (!value) return;
    if (!window.__studioCategories.includes(value)) {
      window.__studioCategories.push(value);
      renderCategoryManager();
      refreshAllCategorySelects();
    }
    input.value = "";
  });

  q("category-manager")?.addEventListener("click", (ev) => {
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
    } else return;
    renderCategoryManager();
    refreshAllCategorySelects();
  });

  q("select-all")?.addEventListener("click", () => {
    document.querySelectorAll(".entry__select").forEach((el) => {
      el.checked = true;
    });
    updateSelectionCount();
  });

  q("select-none")?.addEventListener("click", () => {
    document.querySelectorAll(".entry__select").forEach((el) => {
      el.checked = false;
    });
    updateSelectionCount();
  });

  q("ship")?.addEventListener("click", async () => {
    const btn = q("ship");
    if (btn) btn.disabled = true;
    setStatus("本番に反映中…（保存→一覧生成→push）");
    try {
      const config = await composeConfig();
      if (!config.selection.urls.length) {
        setStatus("1件以上チェックしてください", true);
        return;
      }
      const res = await api("/api/ship", {
        method: "POST",
        body: JSON.stringify({ config }),
      });
      window.__adminData.config = config;
      applyState(await api("/api/state"));
      setStatus(`反映しました（公開 ${res.published} 件）。本番は数分で更新されます。`);
    } catch (e) {
      setStatus(String(e.message || e), true);
    } finally {
      updateSelectionCount();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void boot();
  });
} else {
  void boot();
}
