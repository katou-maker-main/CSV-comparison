@echo off
echo CSV比較ツール - 開発サーバー起動中...
echo.
echo ブラウザで以下のURLを開いてください:
echo http://localhost:5173/CSV-comparison/
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo.

cd /d "%~dp0frontend"
npm run dev

pause