# 新規顧客抽出ツール - プロジェクト活動記録

## 📊 プロジェクト概要
- **プロジェクト名**: 新規顧客抽出ツール (CSV Diff Tool)
- **GitHub リポジトリ**: https://github.com/katou-maker-main/CSV-comparison
- **公開URL**: https://katou-maker-main.github.io/CSV-comparison/
- **開発期間**: 2025年7月22日開始 → 2025年8月1日完成
- **技術スタック**: React + Vite + TypeScript (完全クライアントサイド)
- **目的**: 前回と今回のCSV/Excelファイルを比較し、新規顧客を抽出するWebアプリケーション

## ✅ 完了済みタスク

### 1. 技術スタック選定・アーキテクチャ決定 ✅
- **重要な決定**: サーバーレス完全クライアントサイド処理に移行
- **セキュリティ理由**: 個人情報を含むCSVファイルが外部サーバーに送信されないよう保証
- **技術選択**: 
  - フロントエンド: React + Vite + TypeScript
  - CSV処理: PapaParse (JavaScript)
  - Excel処理: SheetJS (XLSX)
  - デプロイ: GitHub Pages (静的サイト)

### 2. 文字エンコーディング対応 ✅
- **問題**: 日本語CSVファイルの文字化け問題
- **解決方法**: 複数エンコーディング自動検出システム実装
  - 対応エンコーディング: UTF-8, Shift_JIS, EUC-JP, ISO-2022-JP
  - バイナリレベルでの文字コード検出
  - 日本語文字パターンマッチング
  - 文字化け文字検出アルゴリズム
- **実装場所**: `frontend/src/services/csvProcessor.ts:36-79`

### 3. ファイル処理機能 ✅
- **CSV処理**: PapaParseベースの高度な解析機能
- **Excel処理**: SheetJSによる.xlsx/.xls対応
- **顧客比較ロジック**: 
  - 自動キー列検出（メールアドレス > 顧客名 > 会社名）
  - 複数キー組み合わせ対応
  - 大文字小文字無視の比較
- **実装場所**: `frontend/src/services/csvProcessor.ts`

### 4. UI/UX実装 ✅
- **ファイルアップロード**: ドラッグ&ドロップ対応
- **差分表示**: 新規顧客のハイライト表示
- **結果ダウンロード**: CSV形式での結果出力
- **レスポンシブデザイン**: モバイル対応
- **実装場所**: 
  - `frontend/src/components/FileUpload.tsx`
  - `frontend/src/components/DiffViewer.tsx`

### 5. GitHub Pages デプロイ ✅
- **デプロイ方法**: 手動デプロイ（GitHub Actions無効化）
- **理由**: GitHub Actions設定エラー回避
- **プロセス**: 
  1. `npm run build` でビルド実行
  2. `frontend/dist/*` を `docs/` にコピー
  3. 相対パス修正（`/CSV-comparison/assets/` → `./assets/`）
  4. Git commit & push

### 6. プロジェクト管理ファイル ✅
- **CLAUDE.md**: Claude Code用開発設定・ベストプラクティス
- **PROJECT_LOG.md**: 本活動記録ファイル
- **README.md**: ユーザー向けドキュメント

## 🎯 重要な技術的決定事項

### セキュリティ設計
- **データプライバシー**: 全処理をブラウザ内で完結
- **ネットワーク通信**: 一切のサーバー送信なし
- **ファイル処理**: ローカルFileAPI使用のみ

### 文字エンコーディング戦略
```typescript
// 複数エンコーディング対応の実装パターン
const encodings = ['UTF-8', 'Shift_JIS', 'EUC-JP', 'ISO-2022-JP']
// バイナリレベル文字コード検出
// 日本語文字パターン: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
// 文字化け検出: /[?□�\uFFFD]/g
```

### 顧客比較アルゴリズム
```typescript
// キー列検出の優先順位
const keyPriority = [
  'メールアドレス', 'email', 'Email', 'EMAIL',
  '顧客名', '氏名', '名前', 'name', 'Name', 
  '会社名', 'company', 'Company'
]
```

## 🚨 解決済み問題・トラブル記録

### 1. 文字化け問題 ✅ 解決済み
- **症状**: 日本語CSVファイルで文字化け発生
- **原因**: エンコーディング不一致（Shift_JIS vs UTF-8）
- **解決**: 複数エンコーディング自動検出システム実装

### 2. GitHub Actions デプロイエラー ✅ 解決済み
- **症状**: "Missing environment" エラーでデプロイ失敗
- **原因**: GitHub Actions設定問題
- **解決**: GitHub Actionsを無効化し手動デプロイに切り替え

### 3. GitHub Pages パスエラー ✅ 解決済み
- **症状**: 公開サイトでCSS/JSファイルが404エラー
- **原因**: 絶対パス（`/CSV-comparison/assets/`）使用
- **解決**: 相対パス（`./assets/`）に修正

### 4. サーバー依存からの脱却 ✅ 解決済み
- **旧構成**: FastAPI + Python バックエンド
- **問題**: サーバー運用・CORS・セキュリティ懸念
- **解決**: 完全クライアントサイド処理に移行

## 📋 次回起動時の作業手順

### 即座に確認すべき項目
1. **現在の公開状況確認**
   ```bash
   # ブラウザで確認
   https://katou-maker-main.github.io/CSV-comparison/
   ```

2. **開発環境確認**
   ```bash
   cd frontend
   npm install  # 依存関係確認
   npm run dev  # 開発サーバー起動
   ```

3. **最新ビルド＆デプロイ手順**
   ```bash
   cd frontend
   npm run build
   cp -r dist/* ../docs/
   # docs/index.html のパスを相対パスに修正
   git add .
   git commit -m "最新版デプロイ"
   git push origin main
   ```

### 機能追加・修正時の手順
1. `frontend/src/` で開発
2. `npm run build` でビルド
3. `docs/` フォルダに手動コピー
4. パス修正（必要に応じて）
5. Git commit & push

## 🔧 開発環境・依存関係

### フロントエンド (frontend/)
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "papaparse": "^5.4.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5",
    "typescript": "^5.0.2"
  }
}
```

### 開発コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run preview  # ビルド結果プレビュー
```

## 📁 重要ファイル構造

```
CAV vs CSV/
├── frontend/                    # メイン開発フォルダ
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.tsx   # ファイルアップロード UI
│   │   │   └── DiffViewer.tsx   # 差分表示 UI
│   │   ├── services/
│   │   │   └── csvProcessor.ts  # 🔥 メインロジック
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript型定義
│   │   └── App.tsx              # メインアプリ
│   ├── dist/                    # ビルド出力
│   └── package.json
├── docs/                        # 🔥 GitHub Pages デプロイ用
│   ├── assets/
│   └── index.html               # 相対パス要確認
├── backend/                     # 🚫 現在未使用（過去の遺産）
├── CLAUDE.md                    # 🔥 Claude Code 設定
├── PROJECT_LOG.md               # 🔥 本ファイル
└── README.md
```

## 🎯 将来の改善・拡張案

### 優先度：高
- **大容量ファイル対応**: Web Workers使用による非同期処理
- **エクスポート機能強化**: Excel形式出力対応
- **UI改善**: プログレスバー、エラー表示の向上

### 優先度：中
- **差分詳細表示**: セルレベルでの変更内容表示
- **設定保存**: ローカルストレージ活用
- **テーマ機能**: ダーク/ライトモード切り替え

### 優先度：低
- **多言語対応**: 英語版UI作成
- **PWA化**: オフライン対応
- **統計機能**: 差分データの統計表示

## 🔒 セキュリティ・プライバシー保証

- ✅ **完全クライアントサイド処理**: データはブラウザ外に送信されない
- ✅ **静的サイトホスティング**: サーバー側データ処理なし
- ✅ **HTTPS通信**: GitHub Pages標準対応
- ✅ **ログ記録なし**: アクセス・ファイル内容の記録なし

---

**最終更新**: 2025年8月1日  
**プロジェクト状態**: ✅ 完成・本番運用中  
**次回確認事項**: 公開サイトの動作確認・ユーザーフィードバック収集  

**🎉 プロジェクト完了**: 個人情報保護に配慮した安全な新規顧客抽出ツールとして完成