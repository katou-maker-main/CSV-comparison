import pytest
import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestMainAPI:
    def test_root_endpoint(self):
        """Test the root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "CSV Diff API is running"}
    
    def test_health_endpoint(self):
        """Test the health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_compare_identical_files(self):
        """Test comparing identical CSV files."""
        csv_content = "id,name,age\n1,Alice,25\n2,Bob,30"
        
        file1 = io.BytesIO(csv_content.encode())
        file2 = io.BytesIO(csv_content.encode())
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("test1.csv", file1, "text/csv"),
                "file2": ("test2.csv", file2, "text/csv")
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "columnNames" in data
        assert "rows" in data
        assert data["summary"]["totalRows"] == 2
        assert data["summary"]["unchangedRows"] == 2
        assert data["summary"]["addedRows"] == 0
        assert data["summary"]["removedRows"] == 0
        assert data["summary"]["modifiedRows"] == 0
    
    def test_compare_different_files(self):
        """Test comparing different CSV files."""
        csv1 = "id,name,age\n1,Alice,25\n2,Bob,30"
        csv2 = "id,name,age\n1,Alice,26\n2,Bob,30\n3,Charlie,35"
        
        file1 = io.BytesIO(csv1.encode())
        file2 = io.BytesIO(csv2.encode())
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("test1.csv", file1, "text/csv"),
                "file2": ("test2.csv", file2, "text/csv")
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["summary"]["totalRows"] == 3
        assert data["summary"]["addedRows"] == 1
        assert data["summary"]["modifiedRows"] == 1
        assert data["summary"]["unchangedRows"] == 1
    
    def test_invalid_file_type(self):
        """Test uploading non-CSV files."""
        file1 = io.BytesIO(b"not a csv")
        file2 = io.BytesIO(b"also not a csv")
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("test.txt", file1, "text/plain"),
                "file2": ("test2.txt", file2, "text/plain")
            }
        )
        
        assert response.status_code == 400
        assert "must be a CSV file" in response.json()["detail"]
    
    def test_malformed_csv(self):
        """Test handling malformed CSV files."""
        csv1 = "id,name,age\n1,Alice,25\n2,Bob,30"
        malformed_csv = "id,name,age\n1,Alice\n2,Bob,30,extra"
        
        file1 = io.BytesIO(csv1.encode())
        file2 = io.BytesIO(malformed_csv.encode())
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("test1.csv", file1, "text/csv"),
                "file2": ("test2.csv", file2, "text/csv")
            }
        )
        
        # Should handle gracefully and return a response
        # The CSV parser is quite forgiving, so this might still succeed
        assert response.status_code in [200, 400]
    
    def test_empty_files(self):
        """Test handling empty CSV files."""
        empty_csv = ""
        
        file1 = io.BytesIO(empty_csv.encode())
        file2 = io.BytesIO(empty_csv.encode())
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("empty1.csv", file1, "text/csv"),
                "file2": ("empty2.csv", file2, "text/csv")
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["totalRows"] == 0
    
    def test_missing_files(self):
        """Test API behavior when files are missing."""
        csv_content = "id,name\n1,Alice"
        file1 = io.BytesIO(csv_content.encode())
        
        # Only provide one file
        response = client.post(
            "/api/compare",
            files={"file1": ("test1.csv", file1, "text/csv")}
        )
        
        assert response.status_code == 422  # Unprocessable Entity
    
    def test_column_names_in_response(self):
        """Test that column names are correctly returned."""
        csv1 = "id,name,age\n1,Alice,25"
        csv2 = "id,name,age,city\n1,Alice,25,NYC"
        
        file1 = io.BytesIO(csv1.encode())
        file2 = io.BytesIO(csv2.encode())
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("test1.csv", file1, "text/csv"),
                "file2": ("test2.csv", file2, "text/csv")
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        column_names = data["columnNames"]
        assert "id" in column_names
        assert "name" in column_names
        assert "age" in column_names
        assert "city" in column_names
    
    def test_file_names_in_response(self):
        """Test that file names are included in the response."""
        csv_content = "id,name\n1,Alice"
        
        file1 = io.BytesIO(csv_content.encode())
        file2 = io.BytesIO(csv_content.encode())
        
        response = client.post(
            "/api/compare",
            files={
                "file1": ("original.csv", file1, "text/csv"),
                "file2": ("modified.csv", file2, "text/csv")
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["file1Name"] == "original.csv"
        assert data["file2Name"] == "modified.csv"