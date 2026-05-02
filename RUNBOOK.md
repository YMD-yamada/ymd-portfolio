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

#### API Token の権限チェックリスト（ここを外すと Deploy が 100% 失敗します）

GitHub Actions のログに `Authentication error [code: 10000]` と出る場合、**ほぼトークンの権限またはスコープ**が原因です。**Workers 用テンプレだけ**だと **Pages 権限が足りない**ことがよくあります。

1. Cloudflare → Create Custom Token（カスタムトークンを作成）  
   https://dash.cloudflare.com/profile/api-tokens
2. Permissions に **必ず**次を入れる（両方推奨）：
   - **Account** → **Cloudflare Pages** → **Edit**（必須）
   - **User** → **User Details** → **Read**（推奨／Wrangler の警告を減らせます）
3. Account Resources：**Include** → **Specific account** → デプロイ対象アカウントを選択（All accounts は避ける）
4. 期限（TTL）を設定し、作成したトークンを **GitHub の Repository secrets にだけ**保存（ファイルに書かない）

上記を満たしたうえで、`CLOUDFLARE_API_TOKEN` を **作り直したトークンで上書き保存**してください。

5. Account ID を控える（ダッシュボード右サイドバー）
   - https://dash.cloudflare.com/
6. GitHub の **Repository secrets** に登録（Environments ではない）
   - https://github.com/YMD-yamada/ymd-portfolio/settings/secrets/actions
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
7. GitHub Actions の **Deploy to Cloudflare Pages** を手動実行（または `master` へ push で自動）
   - https://github.com/YMD-yamada/ymd-portfolio/actions
8. デプロイ完了後、実際に割り当てられた URL を確認（通常は `https://ymd-portfolio-site.pages.dev/`）
9. **GitHub Pages を無効化**（公開 URL の二重化・混乱を避ける）
   - https://github.com/YMD-yamada/ymd-portfolio/settings/pages
   - Source を **None** に変更
10. `config/site.json` / `index.html` / `sitemap.xml` / `robots.txt` の URLが実際の Pages URL と一致しているか確認（プロジェクト名を変えた場合は要修正）

#### デプロイ失敗時の見分け方（AI 任せ運用のリスク把握用）

| ログの症状 | 意味 | 対応 |
|-------------|------|------|
| `Authentication error [code: 10000]` | API Token の権限不足・スコープ違い・誤った Token | 上のチェックリストで作り直す |
| Environment secrets のみに Token | GitHub Actions が読めない | **Repository secrets** に置く |
| `npx ... wrangler@... NO` 類 | CI 上の一時的な取得失敗／古い action | ワークフローは `npm ci` で wrangler を固定済み |

**セキュリティ上の注意**：トークン・Account ID はチャットや Issue に貼らない。漏れたら Cloudflare 側で即トークン削除→作り直し。

### B. メール（問い合わせの振り分け）

1. 連絡欄のメールリンクは `config/site.json` の `contactEmail`・`contactMailSubject`・送信本文テンプレを参照します（ビルド不要・ブラウザで `config/site.json` を読み込み後に `mailto:` が組み立てられます）。
2. **Gmail で自動振り分け**する例：
   - 条件：**件名**に `[ymd Portfolio 問い合わせ]` が含まれる  
   - ラベル：`Portfolio/問い合わせ` など任意  
   （件名はサイトからの送信だと判別しやすいよう固定プリフィックスにしています。）

### C. SNS（X / Instagram / TikTok）

1. **アカウント作成は本人が各サービス上で行う必要があります**（電話番号認証・利用規約など）。このリポジトリだけではアカウントを代行作成できません。
2. アカウントができたら、`index.html` の該当ブロック（`connect-card--soon`）を `<a href="公開プロフィールURL">` に差し替え、`aria-disabled` は外してください。

### D. 継続運用

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
