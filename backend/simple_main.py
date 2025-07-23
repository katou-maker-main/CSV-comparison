import sys
sys.path.insert(0, '../Lib/site-packages')

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import pandas as pd
import io
from datetime import datetime

app = FastAPI(title="Simple CSV Diff API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Simple CSV Diff API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/compare")
async def compare_simple(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    try:
        print(f"Received files: {file1.filename}, {file2.filename}")
        
        # Read files
        file1_content = await file1.read()
        file2_content = await file2.read()
        
        print(f"File 1 size: {len(file1_content)} bytes")
        print(f"File 2 size: {len(file2_content)} bytes")
        
        # Simple CSV reading
        try:
            df1 = pd.read_csv(io.StringIO(file1_content.decode('utf-8')))
        except:
            try:
                df1 = pd.read_csv(io.StringIO(file1_content.decode('cp932')))
            except:
                df1 = pd.read_csv(io.StringIO(file1_content.decode('latin-1')))
                
        try:
            df2 = pd.read_csv(io.StringIO(file2_content.decode('utf-8')))
        except:
            try:
                df2 = pd.read_csv(io.StringIO(file2_content.decode('cp932')))
            except:
                df2 = pd.read_csv(io.StringIO(file2_content.decode('latin-1')))
        
        print(f"DataFrame 1 shape: {df1.shape}")
        print(f"DataFrame 2 shape: {df2.shape}")
        print(f"DataFrame 1 columns: {list(df1.columns)}")
        print(f"DataFrame 2 columns: {list(df2.columns)}")
        
        # Simple comparison - find rows in df2 not in df1
        # Use first column as ID
        if len(df1.columns) > 0 and len(df2.columns) > 0:
            id_col = df1.columns[0]
            print(f"Using ID column: {id_col}")
            
            # Get IDs
            old_ids = set(df1[id_col].astype(str))
            new_ids = set(df2[id_col].astype(str))
            
            print(f"Old IDs count: {len(old_ids)}")
            print(f"New IDs count: {len(new_ids)}")
            
            # Find new customers
            added_ids = new_ids - old_ids
            print(f"Added IDs: {added_ids}")
            
            # Create result
            new_customers = []
            for idx, row in df2.iterrows():
                if str(row[id_col]) in added_ids:
                    row_data = {}
                    for col in df2.columns:
                        row_data[col] = str(row[col])
                    new_customers.append({
                        "rowIndex": idx,
                        "status": "added",
                        "newData": row_data,
                        "oldData": None,
                        "changedColumns": []
                    })
            
            return {
                "summary": {
                    "totalRows": len(new_customers),
                    "addedRows": len(new_customers),
                    "removedRows": 0,
                    "modifiedRows": 0,
                    "unchangedRows": 0
                },
                "columnNames": list(df2.columns),
                "rows": new_customers,
                "file1Name": file1.filename,
                "file2Name": file2.filename
            }
        else:
            return {
                "summary": {
                    "totalRows": 0,
                    "addedRows": 0,
                    "removedRows": 0,
                    "modifiedRows": 0,
                    "unchangedRows": 0
                },
                "columnNames": [],
                "rows": [],
                "file1Name": file1.filename,
                "file2Name": file2.filename
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"エラー: {str(e)}")

@app.post("/api/download-csv")
async def download_new_customers_csv(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    try:
        print(f"Download request received: {file1.filename}, {file2.filename}")
        
        # Read files (same logic as compare endpoint)
        file1_content = await file1.read()
        file2_content = await file2.read()
        
        # Simple CSV reading
        try:
            df1 = pd.read_csv(io.StringIO(file1_content.decode('utf-8')))
        except:
            try:
                df1 = pd.read_csv(io.StringIO(file1_content.decode('cp932')))
            except:
                df1 = pd.read_csv(io.StringIO(file1_content.decode('latin-1')))
                
        try:
            df2 = pd.read_csv(io.StringIO(file2_content.decode('utf-8')))
        except:
            try:
                df2 = pd.read_csv(io.StringIO(file2_content.decode('cp932')))
            except:
                df2 = pd.read_csv(io.StringIO(file2_content.decode('latin-1')))
        
        # Find new customers (same logic as compare endpoint)
        if len(df1.columns) > 0 and len(df2.columns) > 0:
            id_col = df1.columns[0]
            old_ids = set(df1[id_col].astype(str))
            new_ids = set(df2[id_col].astype(str))
            added_ids = new_ids - old_ids
            
            # Create DataFrame with new customers only
            new_customers_data = []
            for idx, row in df2.iterrows():
                if str(row[id_col]) in added_ids:
                    new_customers_data.append(row.to_dict())
            
            if not new_customers_data:
                raise HTTPException(status_code=404, detail="新規顧客が見つかりませんでした")
            
            new_customers_df = pd.DataFrame(new_customers_data)
            
            # Generate CSV content with Shift_JIS encoding for Japanese Excel compatibility
            output = io.StringIO()
            new_customers_df.to_csv(output, index=False)
            csv_content = output.getvalue()
            
            # Create filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"new_customers_{timestamp}.csv"
            
            # Convert to bytes with Shift_JIS encoding for Japanese Excel
            try:
                csv_bytes = csv_content.encode('shift_jis')
                content_type = "text/csv; charset=shift_jis"
            except UnicodeEncodeError:
                # Fallback to UTF-8 with BOM if Shift_JIS fails
                csv_bytes = '\ufeff'.encode('utf-8') + csv_content.encode('utf-8')
                content_type = "text/csv; charset=utf-8"
            
            print(f"Generated CSV with {len(new_customers_data)} new customers")
            
            return StreamingResponse(
                io.BytesIO(csv_bytes),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Type": content_type
                }
            )
        else:
            raise HTTPException(status_code=400, detail="ファイルにデータが見つかりません")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Download error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"ダウンロードエラー: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)