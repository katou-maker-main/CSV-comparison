import pytest
import pandas as pd
import io
from csv_diff import CSVDiffer, DiffResult, DiffRow, DiffSummary

class TestCSVDiffer:
    def setup_method(self):
        self.differ = CSVDiffer()
    
    def test_identical_csvs(self):
        """Test comparing identical CSV files."""
        data = {
            'id': [1, 2, 3],
            'name': ['Alice', 'Bob', 'Charlie'],
            'age': [25, 30, 35]
        }
        df1 = pd.DataFrame(data)
        df2 = pd.DataFrame(data)
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        assert result.summary.total_rows == 3
        assert result.summary.unchanged_rows == 3
        assert result.summary.added_rows == 0
        assert result.summary.removed_rows == 0
        assert result.summary.modified_rows == 0
        assert all(row.status == 'unchanged' for row in result.rows)
    
    def test_added_rows(self):
        """Test detecting added rows."""
        df1 = pd.DataFrame({
            'id': [1, 2],
            'name': ['Alice', 'Bob']
        })
        df2 = pd.DataFrame({
            'id': [1, 2, 3],
            'name': ['Alice', 'Bob', 'Charlie']
        })
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        assert result.summary.total_rows == 3
        assert result.summary.added_rows == 1
        assert result.summary.unchanged_rows == 2
    
    def test_removed_rows(self):
        """Test detecting removed rows."""
        df1 = pd.DataFrame({
            'id': [1, 2, 3],
            'name': ['Alice', 'Bob', 'Charlie']
        })
        df2 = pd.DataFrame({
            'id': [1, 2],
            'name': ['Alice', 'Bob']
        })
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        assert result.summary.total_rows == 3
        assert result.summary.removed_rows == 1
        assert result.summary.unchanged_rows == 2
    
    def test_modified_rows(self):
        """Test detecting modified rows."""
        df1 = pd.DataFrame({
            'id': [1, 2, 3],
            'name': ['Alice', 'Bob', 'Charlie'],
            'age': [25, 30, 35]
        })
        df2 = pd.DataFrame({
            'id': [1, 2, 3],
            'name': ['Alice', 'Bob', 'Charlie'],
            'age': [26, 30, 36]  # Modified ages for id 1 and 3
        })
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        assert result.summary.total_rows == 3
        assert result.summary.modified_rows == 2
        assert result.summary.unchanged_rows == 1
        
        # Check that changed columns are correctly identified
        modified_rows = [row for row in result.rows if row.status == 'modified']
        for row in modified_rows:
            assert 'age' in (row.changed_columns or [])
    
    def test_empty_dataframes(self):
        """Test comparing empty DataFrames."""
        df1 = pd.DataFrame()
        df2 = pd.DataFrame()
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        assert result.summary.total_rows == 0
        assert len(result.rows) == 0
        assert len(result.column_names) == 0
    
    def test_different_columns(self):
        """Test comparing DataFrames with different columns."""
        df1 = pd.DataFrame({
            'id': [1, 2],
            'name': ['Alice', 'Bob']
        })
        df2 = pd.DataFrame({
            'id': [1, 2],
            'email': ['alice@example.com', 'bob@example.com']
        })
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        # Should include all unique columns
        assert 'id' in result.column_names
        assert 'name' in result.column_names
        assert 'email' in result.column_names
        assert len(result.column_names) == 3
    
    def test_normalize_dataframe(self):
        """Test DataFrame normalization."""
        df = pd.DataFrame({
            'name': ['  Alice  ', 'Bob'],
            'value': [1.0, None]
        })
        
        normalized = self.differ._normalize_dataframe(df)
        
        # Check that whitespace is stripped
        assert normalized['name'].iloc[0] == 'Alice'
        # Check that NaN is converted to empty string
        assert normalized['value'].iloc[1] == ''
    
    def test_find_key_columns(self):
        """Test automatic key column detection."""
        df1 = pd.DataFrame({
            'id': [1, 2, 3],  # Unique values - good key column
            'name': ['Alice', 'Bob', 'Charlie'],  # Unique values - good key column
            'category': ['A', 'A', 'B']  # Not unique - poor key column
        })
        df2 = pd.DataFrame({
            'id': [1, 2, 4],
            'name': ['Alice', 'Bob', 'David'],
            'category': ['A', 'A', 'C']
        })
        
        key_columns = self.differ._find_key_columns(df1, df2)
        
        # Should identify id and name as key columns
        assert 'id' in key_columns
        assert 'name' in key_columns
    
    def test_create_row_hash(self):
        """Test row hash creation."""
        row = pd.Series([1, 'Alice', 25])
        hash1 = self.differ._create_row_hash(row)
        hash2 = self.differ._create_row_hash(row)
        
        # Same row should produce same hash
        assert hash1 == hash2
        
        # Different row should produce different hash
        different_row = pd.Series([2, 'Bob', 30])
        hash3 = self.differ._create_row_hash(different_row)
        assert hash1 != hash3
    
    def test_whitespace_handling(self):
        """Test that whitespace differences are handled correctly."""
        df1 = pd.DataFrame({
            'name': ['Alice', 'Bob  '],
            'value': ['  123', '456']
        })
        df2 = pd.DataFrame({
            'name': ['Alice', 'Bob'],
            'value': ['123  ', '456']
        })
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        # After normalization, these should be considered unchanged
        assert result.summary.unchanged_rows == 2
        assert result.summary.modified_rows == 0
    
    def test_to_dict_methods(self):
        """Test serialization methods."""
        data = {
            'id': [1, 2],
            'name': ['Alice', 'Bob']
        }
        df1 = pd.DataFrame(data)
        df2 = pd.DataFrame(data)
        
        result = self.differ.compare(df1, df2, 'file1.csv', 'file2.csv')
        
        # Test that result can be converted to dict
        result_dict = result.to_dict()
        
        assert 'summary' in result_dict
        assert 'columnNames' in result_dict
        assert 'rows' in result_dict
        assert 'file1Name' in result_dict
        assert 'file2Name' in result_dict
        
        # Test summary dict
        summary_dict = result_dict['summary']
        assert 'totalRows' in summary_dict
        assert 'addedRows' in summary_dict
        assert 'removedRows' in summary_dict
        assert 'modifiedRows' in summary_dict
        assert 'unchangedRows' in summary_dict