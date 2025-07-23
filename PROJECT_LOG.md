# CSV比較アプリ - プロジェクト活動記録

## 📊 プロジェクト概要
- **プロジェクト名**: CSV Diff Tool
- **開発期間**: 2025年7月22日開始
- **技術スタック**: React + Vite + TypeScript (Frontend) / FastAPI + Pandas (Backend)
- **目的**: 2つのCSVファイルを比較し、差分を視覚化するWebアプリケーション

## ✅ 完了済みタスク

### 1. フロントエンド開発 ✅
- **React + Vite + TypeScript** セットアップ完了
- **UI コンポーネント** 実装完了:
  - `App.tsx` - メインアプリケーション
  - `FileUpload.tsx` - ファイルアップロード機能（ドラッグ&ドロップ対応）
  - `DiffViewer.tsx` - 差分表示テーブル（フィルター・ページネーション機能付き）
- **デザインシステム** 実装完了:
  - CSS カスタムプロパティによる色トークン管理
  - 差分表示用カラーコード（緑=追加、赤=削除、黄=変更、白=未変更）
  - レスポンシブデザイン対応
- **API統合** 完了: Axiosベースのサービス層

### 2. バックエンド開発 ✅
- **FastAPI + Pandas** セットアップ完了
- **CSV差分アルゴリズム** 実装完了 (`csv_diff.py`):
  - 自動キー列検出機能
  - 行レベル・セルレベルの変更検出
  - データ正規化（空白文字処理、NULL値処理）
  - ハッシュベース高速比較
- **REST API** 実装完了:
  - `POST /api/compare` - CSV比較エンドポイント
  - エラーハンドリング・バリデーション
  - CORS設定

### 3. テスト実装 ✅
- **バックエンドテスト**: pytest
  - `test_csv_diff.py` - 差分アルゴリズムの単体テスト
  - `test_main.py` - API エンドポイントテスト
- **フロントエンドテスト**: Vitest + Testing Library
  - `App.test.tsx` - メインコンポーネントテスト
  - `api.test.ts` - API サービステスト

### 4. プロジェクト構成 ✅
- **ディレクトリ構造** 整備完了
- **設定ファイル** 作成完了: 
  - `vite.config.ts`, `tsconfig.json`, `package.json`
  - `requirements.txt`, `pytest.ini`
- **ドキュメント** 作成完了: `README.md`
- **配布パッケージ** 作成完了: `csv-diff-tool.zip`

## 🚨 現在の課題・問題

### 1. Python環境の問題 🔥 **最優先**
- **問題**: `python`コマンドが認識されない
- **症状**: `ERR_CONNECTION_REFUSED` でローカルホストにアクセスできない
- **原因**: Python未インストールまたはPATH設定問題
- **対処方法**:
  1. Python 3.8+ のインストール確認
  2. 環境変数PATH設定確認
  3. Windows の場合は `py` ランチャーの使用検討

### 2. 依存関係の問題
- **バックエンド**: `pip install -r requirements.txt` 未実行
- **フロントエンド**: `npm install` 未実行（Node.js環境確認必要）

## 🎯 次回セッション時の優先タスク

### 即座に実行すべき項目（優先度：高）

1. **Python環境確認・セットアップ**
   ```bash
   # 以下コマンドで確認
   python --version  # または py --version
   pip --version
   ```

2. **依存関係インストール**
   ```bash
   # バックエンド
   cd backend
   pip install -r requirements.txt
   
   # フロントエンド  
   cd frontend
   npm install
   ```

3. **サーバー起動テスト**
   ```bash
   # バックエンド起動
   cd backend
   python main.py  # または py main.py
   
   # 別ターミナルでフロントエンド起動
   cd frontend
   npm run dev
   ```

### 確認すべき項目（優先度：中）

4. **ポート使用状況確認**
   - ポート8000（バックエンド）が使用可能か
   - ポート3000（フロントエンド）が使用可能か

5. **ファイアウォール設定確認**
   - ローカルホスト接続がブロックされていないか

## 📋 トラブルシューティングガイド

### Python関連エラー
- **`Python was not found`**: Python未インストール → Python公式サイトからダウンロード
- **`pip is not recognized`**: pip未インストール → `python -m ensurepip --upgrade`
- **ImportError**: 依存関係未インストール → `pip install -r requirements.txt`

### Node.js関連エラー  
- **`npm not found`**: Node.js未インストール → Node.js公式サイトからダウンロード
- **依存関係エラー**: `npm install` 実行

### ネットワーク関連エラー
- **ERR_CONNECTION_REFUSED**: サーバー未起動 → バックエンド起動確認
- **CORS エラー**: プロキシ設定確認 → vite.config.tsのproxy設定

## 🔧 開発環境要件

### 必須ソフトウェア
- **Python 3.8+** （pandas、FastAPI対応）
- **Node.js 18+** （React、Vite対応）
- **npm または yarn** （パッケージ管理）

### 推奨IDE設定
- **VSCode** + Python拡張機能 + TypeScript拡張機能
- **ESLint** + **Prettier** （コード品質管理）

## 📁 ファイル構造マップ

```
CAV vs CSV/
├── frontend/
│   ├── src/
│   │   ├── components/     # React コンポーネント
│   │   ├── services/       # API クライアント
│   │   ├── styles/         # CSS・デザイントークン
│   │   ├── types/          # TypeScript 型定義
│   │   └── tests/          # フロントエンドテスト
│   ├── package.json        # npm依存関係
│   ├── vite.config.ts      # Viteビルド設定
│   └── vitest.config.ts    # テスト設定
├── backend/
│   ├── main.py            # FastAPI メインアプリ
│   ├── csv_diff.py        # CSV比較ロジック
│   ├── requirements.txt   # Python依存関係
│   ├── pytest.ini         # テスト設定
│   └── tests/             # バックエンドテスト
├── README.md              # プロジェクト説明書
├── PROJECT_LOG.md         # 本ファイル
└── csv-diff-tool.zip      # 配布用アーカイブ
```

## 🎯 将来の拡張予定

### 機能追加候補
- **エクスポート機能**: 差分結果をCSV/Excel形式で出力
- **差分ハイライト**: セル単位での詳細な変更表示
- **大容量ファイル対応**: ストリーミング処理・チャンク分割
- **履歴管理**: 比較結果の保存・管理機能
- **API認証**: セキュリティ強化

### パフォーマンス改善
- **メモリ最適化**: 大容量CSV処理の効率化
- **UI最適化**: 仮想スクロール・遅延読み込み
- **キャッシュ機能**: 比較結果のブラウザキャッシュ

---

**最終更新**: 2025年7月22日  
**次回確認事項**: Python環境セットアップ状況  
**緊急度**: 🔥 高（アプリ起動不可のため）