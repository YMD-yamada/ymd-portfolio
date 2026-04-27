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
2. GitHub の Pages 設定で `Deploy from a branch` / `master` / `/ (root)` を確認
3. GitHub Secrets に以下を登録（使うサービスだけでOK）
   - `NETLIFY_AUTH_TOKEN`
   - `VERCEL_TOKEN`
   - `RENDER_API_KEY`
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Cloudflare account id を確認して `CLOUDFLARE_ACCOUNT_ID` にセット
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
