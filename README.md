# 新規顧客抽出ツール

前回と今回のCSV/Excelファイルを比較して、新規に追加された顧客を抽出するWebアプリケーションです。

## 🚀 デモ

GitHub Pages: [https://[YOUR-USERNAME].github.io/CAV-vs-CSV/](https://[YOUR-USERNAME].github.io/CAV-vs-CSV/)

## ✨ 機能

- 📊 CSV/Excelファイルの比較
- 🆕 新規顧客の自動抽出
- 📥 結果のCSVダウンロード
- 🌐 日本語対応
- 📱 レスポンシブデザイン

## 🛠️ 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite
- CSS Variables

### バックエンド
- FastAPI
- Pandas
- Python 3.13

## 📋 使用方法

1. **ファイルのアップロード**
   - 前回データ（CSV/Excel）をアップロード
   - 今回データ（CSV/Excel）をアップロード

2. **比較実行**
   - 「ファイルを比較」ボタンをクリック

3. **結果確認**
   - 新規顧客の一覧が表示されます
   - 「CSVダウンロード」ボタンで結果を保存

## 🔧 開発環境セットアップ

### 前提条件
- Node.js 18以上
- Python 3.13
- Git

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

### バックエンド
```bash
cd backend
pip install fastapi uvicorn pandas openpyxl
python simple_main.py
```

## 📁 プロジェクト構造

```
CAV-vs-CSV/
├── frontend/           # React フロントエンド
│   ├── src/
│   │   ├── components/ # React コンポーネント
│   │   ├── services/   # API通信
│   │   └── types/      # TypeScript型定義
│   ├── public/
│   └── package.json
├── backend/            # FastAPI バックエンド
│   ├── simple_main.py  # メインAPIサーバー
│   ├── csv_diff.py     # CSV比較ロジック
│   └── main.py         # 従来版（非推奨）
├── .github/workflows/  # GitHub Actions
└── README.md
```

## 🎯 対応ファイル形式

- CSV (.csv)
- Excel (.xlsx, .xls)

## 🔍 比較ロジック

1. **顧客ID検出**: 最初の列を顧客IDとして使用
2. **新規顧客抽出**: 前回データに存在しない顧客IDを検出
3. **結果出力**: 新規顧客の全情報を出力

## 📄 文字エンコーディング

- **入力**: UTF-8, Shift_JIS, CP932, Latin-1に対応
- **出力**: Shift_JIS（Excel互換性のため）

## 🚀 GitHub Pagesへのデプロイ

1. GitHubリポジトリを作成
2. コードをpush
3. Settings > Pages で「GitHub Actions」を選択
4. 自動的にデプロイされます

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューを歓迎します！

## 📞 サポート

問題が発生した場合は、GitHubのIssuesでお知らせください。