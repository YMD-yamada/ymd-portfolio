# ymd Portfolio Runbook

このファイルは「あなたがやる操作」を最小化した手順書です。  
実装・修正・運用作業は Cursor 側で継続実施できます。

## 1) まず確認するURL

- 公開サイト: https://ymd-yamada.github.io/ymd-portfolio/
- GitHub リポジトリ: https://github.com/YMD-yamada/ymd-portfolio
- Actions: https://github.com/YMD-yamada/ymd-portfolio/actions
- Secrets 設定: https://github.com/YMD-yamada/ymd-portfolio/settings/secrets/actions
- Pages 設定: https://github.com/YMD-yamada/ymd-portfolio/settings/pages

## 2) あなたが実際にやること（チェックリスト）

1. 上の公開サイトURLを開き、表示を確認
2. `config/site.json` の `canonicalUrl` と `contactEmail` を自分用に更新（独自ドメイン運用時は必須）
3. `sitemap.xml` と `robots.txt` の URL を `canonicalUrl` に合わせて更新
4. `index.html` の `<link rel="canonical">` と `og:url` を `canonicalUrl` に合わせて更新（初期は GitHub Pages URL）
5. GitHub の Pages 設定で `Deploy from a branch` / `master` / `/ (root)` を確認
6. GitHub Secrets に以下を登録（使うサービスだけでOK）
   - `NETLIFY_AUTH_TOKEN`
   - `VERCEL_TOKEN`
   - `RENDER_API_KEY`
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
7. Cloudflare account id を確認して `CLOUDFLARE_ACCOUNT_ID` にセット
8. Cursor に「sync を実行してコミット・反映して」と依頼

## 3) 各サービスの発行URL（作成・確認先）

- Netlify token: https://app.netlify.com/user/applications#personal-access-tokens
- Vercel token: https://vercel.com/account/tokens
- Render API key: https://dashboard.render.com/account
- Cloudflare token: https://dash.cloudflare.com/profile/api-tokens
- Cloudflare account id: https://dash.cloudflare.com/ （右サイドバーの Account ID）

## 4) 運用ルール（AIドリブン前提）

- **データ更新**: `npm run sync:apps` を Cursor に実行させる
- **変更反映**: Cursor に「コミットして push」まで依頼する
- **確認**: 公開URLで見た目とリンク遷移のみ最終確認
- **障害時**: Cursor に「RUNBOOK基準で復旧して」と依頼（ログ収集→修正→再デプロイ）

## 5) セキュリティ方針（最低限）

- トークンは **GitHub Secrets のみ** に保存（`config` や `data` に書かない）
- `.env` はローカル専用、リポジトリには含めない
- API token は Read 権限最小化（特に Cloudflare）
- 外部リンクは `https` のみ（スクリプト側で URL 正規化）

## 6) デザイン運用方針

- 文字修正・色調整・カードレイアウト変更は Cursor に都度依頼でOK
- 追加したい世界観（例: レトロ感を強める、DIY感を上げる）をテキストで指示
- A/B パターン比較も Cursor で実施可能

## 7) 独自ドメインで「GitHub 丸出し」を避ける（推奨）

訪問者向け URL を `github.io` 以外にしたい場合の王道は次のどちらかです。

### A. GitHub Pages のまま、独自ドメインだけ載せる

1. ドメインを取得（例: Cloudflare Registrar）
2. DNS で `CNAME` を作成
   - 名前: `www`（または `@ を ALIAS/ANAME 対応 DNS の場合`）
   - 値: `ymd-yamada.github.io`
3. GitHub リポジトリの Pages 設定で Custom domain を入力し、HTTPS を有効化
   - https://github.com/YMD-yamada/ymd-portfolio/settings/pages
4. リポジトリ直下に `CNAME` ファイルを追加（GitHub が案内するホスト名）
5. `config/site.json` / `index.html` / `sitemap.xml` / `robots.txt` の URL を新ドメインへ更新

### B. Cloudflare Pages をフロントに置く（CDN・ルールが欲しい場合）

1. Cloudflare Pages に同じ静的サイトを接続（Git 連携）
2. Custom domain を Cloudflare 側で設定
3. GitHub Pages は停止するか、301 リダイレクト方針を決める
4. `config/site.json` などの URL を新ドメインへ更新

## 8) 公開面の品質（プロ向けの最低ライン）

- 訪問者向け文言は `index.html`、運用用の詳細は `<details>` と `RUNBOOK.md` に分離済み
- `robots.txt` / `sitemap.xml` / `favicon.svg` / OGP を用意
- 連絡先メールは `config/site.json` の `contactEmail` で差し替え可能
