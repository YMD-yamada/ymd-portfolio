# ymd Portfolio Runbook

このファイルは「あなたがやる操作」を最小化した手順書です。  
実装・修正・運用作業は Cursor 側で継続実施できます。

## 1) まず確認するURL

- **本番（Cloudflare Pages）**: https://ymd-portfolio-site.pages.dev/
- GitHub リポジトリ（ソース管理のみ）: https://github.com/YMD-yamada/ymd-portfolio
- 旧 GitHub Pages（無効化推奨）: https://ymd-yamada.github.io/ymd-portfolio/
- Actions: https://github.com/YMD-yamada/ymd-portfolio/actions
- Secrets 設定: https://github.com/YMD-yamada/ymd-portfolio/settings/secrets/actions
- Pages 設定: https://github.com/YMD-yamada/ymd-portfolio/settings/pages

## 2) あなたが実際にやること（チェックリスト）

### A. Cloudflare Pages 本番化（必須・初回）

1. Cloudflare で API Token を作成（推奨テンプレ: **Edit Cloudflare Workers** 相当、少なくとも **Account / Cloudflare Pages / Edit** を含む）
   - https://dash.cloudflare.com/profile/api-tokens
2. Account ID を控える（ダッシュボード右サイドバー）
   - https://dash.cloudflare.com/
3. GitHub の Secrets に登録
   - https://github.com/YMD-yamada/ymd-portfolio/settings/secrets/actions
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. GitHub Actions の **Deploy to Cloudflare Pages** を手動実行（または `master` へ push 済みなら自動）
   - https://github.com/YMD-yamada/ymd-portfolio/actions
5. デプロイ完了後、実際に割り当てられた URL を確認（通常は `https://ymd-portfolio-site.pages.dev/`）
6. **GitHub Pages を無効化**（公開 URL の二重化・混乱を避ける）
   - https://github.com/YMD-yamada/ymd-portfolio/settings/pages
   - Source を **None** に変更
7. `config/site.json` / `index.html` / `sitemap.xml` / `robots.txt` の URLが実際の Pages URL と一致しているか確認（プロジェクト名を変えた場合は要修正）

### B. 継続運用

1. `config/site.json` の `canonicalUrl` と `contactEmail` を自分用に更新（独自ドメイン運用時は必須）
2. `sitemap.xml` と `robots.txt` の URL を `canonicalUrl` に合わせて更新
3. `index.html` の `<link rel="canonical">` と `og:url` を `canonicalUrl` に合わせて更新
4. 作品一覧の自動取得を使う場合のみ、GitHub Secrets に以下を追加（不要ならスキップ）
   - `NETLIFY_AUTH_TOKEN`
   - `VERCEL_TOKEN`
   - `RENDER_API_KEY`
   - （Cloudflare Pages 用の Secrets は **A. の手順で既に登録済み**）
5. Cursor に「sync を実行してコミット・反映して」と依頼

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
