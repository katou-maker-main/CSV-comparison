import sys
sys.path.insert(0, '../Lib/site-packages')

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
import io
from typing import List, Dict, Any, Optional
from csv_diff import CSVDiffer, DiffResult
import traceback

app = FastAPI(title="CSV Diff API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CSV差分比較APIが動作中です"}

@app.get("/health")
async def health_check():
    return {"status": "正常"}

@app.get("/api/info")
async def api_info():
    return {
        "name": "CSV差分比較API",
        "version": "1.0.0",
        "description": "CSVファイルやExcelファイルの差分を比較するAPI",
        "supported_formats": ["csv", "xlsx", "xls"],
        "endpoints": {
            "/": "ルート",
            "/health": "ヘルスチェック",
            "/api/compare": "ファイル比較",
            "/api/info": "API情報"
        }
    }

@app.post("/api/test")
async def test_upload():
    """Simple test endpoint"""
    return {"status": "ok", "message": "API接続テスト成功"}

@app.post("/api/compare")
async def compare_csv_files(
    file1: UploadFile = File(..., description="First CSV file"),
    file2: UploadFile = File(..., description="Second CSV file")
):
    try:
        # Validate file types
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        if not any(file1.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(status_code=400, detail="ファイル1はCSVまたはExcelファイルである必要があります")
        if not any(file2.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(status_code=400, detail="ファイル2はCSVまたはExcelファイルである必要があります")

        # Read file contents
        file1_content = await file1.read()
        file2_content = await file2.read()

        # Convert to pandas DataFrames
        def read_file_to_dataframe(file_content, filename):
            if filename.lower().endswith(('.xlsx', '.xls')):
                # Excel file
                return pd.read_excel(io.BytesIO(file_content))
            else:
                # CSV file - try multiple encodings
                encodings = ['utf-8', 'utf-8-sig', 'cp932', 'shift_jis', 'latin-1', 'iso-2022-jp']
                
                for encoding in encodings:
                    try:
                        decoded_content = file_content.decode(encoding)
                        # Use explicit encoding in pandas
                        df = pd.read_csv(io.StringIO(decoded_content), encoding=None)
                        
                        # Basic string handling
                        for col in df.columns:
                            if df[col].dtype == 'object':
                                df[col] = df[col].astype(str)
                        
                        print(f"Successfully decoded with {encoding}")
                        print(f"Columns: {list(df.columns)}")
                        print(f"Sample data: {df.head(1).to_dict()}")
                        return df
                    except (UnicodeDecodeError, UnicodeError):
                        continue
                    except Exception as e:
                        print(f"Error with {encoding}: {str(e)}")
                        continue
                
                # If all encodings fail, try with error handling
                try:
                    decoded_content = file_content.decode('utf-8', errors='replace')
                    return pd.read_csv(io.StringIO(decoded_content))
                except Exception as e:
                    raise Exception(f"CSVファイルの読み込みエラー: すべてのエンコーディングで失敗しました。{str(e)}")
        
        try:
            df1 = read_file_to_dataframe(file1_content, file1.filename)
            df2 = read_file_to_dataframe(file2_content, file2.filename)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"ファイル解析エラー: {str(e)}")

        # Create CSV differ and perform customer comparison (new customers only)
        differ = CSVDiffer()
        diff_result = differ.compare_customers(df1, df2, file1.filename, file2.filename)

        # Ensure proper UTF-8 encoding in response
        result_dict = diff_result.to_dict()
        
        # Debug: Print sample data to check encoding
        if result_dict.get('rows') and len(result_dict['rows']) > 0:
            print("Sample row data:")
            sample_row = result_dict['rows'][0]
            print(f"Sample new data: {sample_row.get('newData', {})}")
        
        return JSONResponse(
            content=result_dict,
            media_type="application/json; charset=utf-8"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"予期しないエラー: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"内部サーバーエラー: {str(e)}")

@app.post("/api/download-csv")
async def download_new_customers_csv(
    file1: UploadFile = File(..., description="Previous data file"),
    file2: UploadFile = File(..., description="Current data file")
):
    """Download new customers as CSV file"""
    try:
        # Same processing as compare endpoint
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        if not any(file1.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(status_code=400, detail="ファイル1はCSVまたはExcelファイルである必要があります")
        if not any(file2.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(status_code=400, detail="ファイル2はCSVまたはExcelファイルである必要があります")

        file1_content = await file1.read()
        file2_content = await file2.read()

        def read_file_to_dataframe(file_content, filename):
            if filename.lower().endswith(('.xlsx', '.xls')):
                return pd.read_excel(io.BytesIO(file_content))
            else:
                encodings = ['utf-8', 'utf-8-sig', 'cp932', 'shift_jis', 'latin-1', 'iso-2022-jp']
                for encoding in encodings:
                    try:
                        decoded_content = file_content.decode(encoding)
                        df = pd.read_csv(io.StringIO(decoded_content), encoding=None)
                        # Basic string handling
                        for col in df.columns:
                            if df[col].dtype == 'object':
                                df[col] = df[col].astype(str)
                        return df
                    except (UnicodeDecodeError, UnicodeError):
                        continue
                    except Exception as e:
                        continue
                
                try:
                    decoded_content = file_content.decode('utf-8', errors='replace')
                    return pd.read_csv(io.StringIO(decoded_content))
                except Exception as e:
                    raise Exception(f"CSVファイルの読み込みエラー: すべてのエンコーディングで失敗しました。{str(e)}")
        
        df1 = read_file_to_dataframe(file1_content, file1.filename)
        df2 = read_file_to_dataframe(file2_content, file2.filename)

        # Get new customers data
        differ = CSVDiffer()
        diff_result = differ.compare_customers(df1, df2, file1.filename, file2.filename)
        
        # Create DataFrame for new customers only
        new_customers_data = []
        for row in diff_result.rows:
            if row.status == 'added':
                new_customers_data.append(row.new_data)
        
        if not new_customers_data:
            raise HTTPException(status_code=404, detail="新規顧客が見つかりませんでした")
        
        new_customers_df = pd.DataFrame(new_customers_data)
        
        # Generate CSV with proper encoding
        output = io.StringIO()
        new_customers_df.to_csv(output, index=False)
        csv_content = output.getvalue()
        
        # Create filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"new_customers_{timestamp}.csv"
        
        # Convert to bytes with UTF-8 encoding
        csv_bytes = csv_content.encode('utf-8')
        
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ダウンロードエラー: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ダウンロードエラー: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)