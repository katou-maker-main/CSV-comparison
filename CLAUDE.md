# Claude Code 開発用設定ファイル

このファイルは Claude Code が参照するプロジェクト設定とベストプラクティスを記録します。

## プロジェクト基本情報

### プロジェクト設定
```
プロジェクト名: [プロジェクト名を記入]
開発言語: [主要言語を記入]
フレームワーク: [使用フレームワークを記入]
データベース: [DB種類を記入]
デプロイ先: [デプロイ環境を記入]
```

### よく使うコマンド
```bash
# 開発サーバー起動
npm run dev
# または
python main.py

# ビルド
npm run build

# テスト実行
npm test
# または
pytest

# lint/フォーマット
npm run lint
ruff check .
```

## 開発パターン・ベストプラクティス

### 文字化け対策（日本語プロジェクト）
```typescript
// 複数エンコーディング対応
const encodings = ['UTF-8', 'Shift_JIS', 'EUC-JP', 'ISO-2022-JP']

// 文字化け検出パターン
const corruptedPattern = /[?□�\uFFFD]/g
const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/

// バイナリレベルでの文字コード検出
const detectEncoding = (buffer: ArrayBuffer) => {
  // Shift_JIS バイト列パターン検出
  // (0x81-0x9F, 0xE0-0xFC) + (0x40-0x7E, 0x80-0xFC)
}
```

### ファイル処理パターン
```typescript
// CSV/Excel統合処理
class FileProcessor {
  async parseFile(file: File) {
    if (file.name.endsWith('.csv')) return this.parseCSV(file)
    if (file.name.match(/\.(xlsx|xls)$/)) return this.parseExcel(file)
    throw new Error('サポートされていないファイル形式')
  }
}
```

### API設計パターン
```python
# FastAPI + CORS設定
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# エラーハンドリング
@app.exception_handler(Exception)
async def exception_handler(request, exc):
    return {"error": str(exc)}
```

## Git/GitHub 設定

### よく使うGitコマンド
```bash
# 基本フロー
git add .
git commit -m "機能追加: 新規機能の説明"
git push origin main

# ブランチ作業
git checkout -b feature/new-feature
git merge feature/new-feature
```

### GitHub Pages デプロイ
```bash
# 手動デプロイパターン（推奨）
npm run build
cp -r dist/* docs/
git add docs/
git commit -m "デプロイ: GitHub Pagesに更新版をデプロイ"
git push origin main
```

## トラブルシューティング

### よくある問題と解決策

#### 文字化け問題
- 原因: エンコーディング不一致
- 解決: 複数エンコーディング自動検出機能を実装
- 予防: UTF-8を基本とし、日本語ファイルはShift_JISもサポート

#### CORS エラー  
- 原因: ブラウザのセキュリティ制限
- 解決: サーバー側でCORSミドルウェア設定
- 代替: クライアントサイド処理への移行

#### ビルドエラー
- 原因: TypeScript設定やモジュール不足
- 解決: 依存関係の再インストール、設定ファイル確認
- 予防: package.jsonとtsconfig.jsonの整合性維持

#### デプロイ失敗
- 原因: GitHub Actions設定ミス
- 解決: 手動デプロイへの切り替え
- 代替: Vercel, Netlify等の利用検討

## 技術スタック別設定例

### React + TypeScript + Vite
```json
// package.json の重要な設定
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Python + FastAPI
```python
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
python-multipart==0.0.6

# 起動コマンド
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Node.js + Express
```javascript
// 基本設定
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())
```

## セキュリティ設定

### 環境変数管理
```bash
# .env ファイル（Gitにコミットしない）
API_KEY=your_api_key
DATABASE_URL=your_db_url
```

### よくあるセキュリティ対策
- APIキーは環境変数で管理
- CORSの適切な設定
- 入力値のバリデーション
- SQLインジェクション対策

## パフォーマンス最適化

### フロントエンド
- 画像最適化（WebP形式推奨）
- コード分割（dynamic import）
- キャッシュ戦略
- バンドルサイズ監視

### バックエンド  
- データベースインデックス
- クエリ最適化
- レスポンス圧縮
- キャッシュレイヤー

## 参考リンク・ドキュメント

### 公式ドキュメント
- [React公式](https://react.dev/)
- [FastAPI公式](https://fastapi.tiangolo.com/)
- [Vite公式](https://vitejs.dev/)

### 今回のプロジェクト成果物
- リポジトリ: https://github.com/katou-maker-main/CSV-comparison
- デプロイ先: https://katou-maker-main.github.io/CSV-comparison/

---

## 使用方法

1. 新しいプロジェクト開始時に、このファイルをプロジェクトルートにコピー
2. プロジェクト固有の情報を追記・修正
3. Claude Code との会話で「CLAUDE.mdの設定を参考に」と指示
4. 開発中に学んだベストプラクティスを随時追記

このファイルを参照することで、過去の成功パターンを新しいプロジェクトで活用できます。