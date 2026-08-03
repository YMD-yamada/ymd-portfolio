# CURSOR_HANDOFF

## 目的

申請不要の Web 制作物ポートフォリオ。ストア法務ハブ（personal-site）とは別。

## 自動化

- CI: push / 日次 `sync-apps` → Cloudflare Pages（デプロイ前に Studio 本体を除外）
- エージェント: `scripts/publish-app-listing.mjs`（register → selection 追加 → push → deploy）
- ローカル編集: `npm run studio`（ブラウザ自動起動）→ チェック →「本番に反映」1ボタン
- 公開リスト: `config/apps.config.json` の `selection.urls` のみが `data/apps.json` に載る
- 「本番に反映」= 保存 → sync → commit/push（ブラウザに Token なし）
- 法務: `/legal/privacy|terms|support.html`、カード表記、`legal/embed-snippet.html`

## セキュリティ

- 本番では Admin 編集・GitHub Token 入力なし（stub のみ）
- Studio は 127.0.0.1 のみ。ブラウザから GitHub API は呼ばない

## 本番

https://ymd-portfolio-site.pages.dev/
