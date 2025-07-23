import pandas as pd
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
import hashlib

@dataclass
class DiffRow:
    row_index: int
    status: str  # 'added', 'removed', 'modified', 'unchanged'
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    changed_columns: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rowIndex": self.row_index,
            "status": self.status,
            "oldData": self.old_data,
            "newData": self.new_data,
            "changedColumns": self.changed_columns or []
        }

@dataclass
class DiffSummary:
    total_rows: int
    added_rows: int
    removed_rows: int
    modified_rows: int
    unchanged_rows: int

    def to_dict(self) -> Dict[str, int]:
        return {
            "totalRows": self.total_rows,
            "addedRows": self.added_rows,
            "removedRows": self.removed_rows,
            "modifiedRows": self.modified_rows,
            "unchangedRows": self.unchanged_rows
        }

@dataclass
class DiffResult:
    summary: DiffSummary
    column_names: List[str]
    rows: List[DiffRow]
    file1_name: str
    file2_name: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "summary": self.summary.to_dict(),
            "columnNames": self.column_names,
            "rows": [row.to_dict() for row in self.rows],
            "file1Name": self.file1_name,
            "file2Name": self.file2_name
        }

class CSVDiffer:
    def __init__(self):
        self.key_columns: Optional[List[str]] = None
        self.customer_mode: bool = False  # Flag for customer comparison mode
    
    def _normalize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize DataFrame for comparison."""
        # Convert all columns to string type for consistent comparison
        df = df.astype(str)
        
        # Replace NaN values with empty strings
        df = df.fillna('')
        
        # Strip whitespace from string columns and ensure proper encoding
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].str.strip()
                # Simple string conversion
                df[col] = df[col].apply(lambda x: str(x) if pd.notna(x) and str(x) != 'nan' else '')
        
        return df
    
    def _create_row_hash(self, row: pd.Series) -> str:
        """Create a hash for a row to enable fast lookups."""
        row_str = '|'.join(str(val) for val in row.values)
        return hashlib.md5(row_str.encode()).hexdigest()
    
    def _find_key_columns(self, df1: pd.DataFrame, df2: pd.DataFrame) -> List[str]:
        """Automatically detect key columns for matching rows."""
        common_columns = list(set(df1.columns) & set(df2.columns))
        
        if not common_columns:
            return []
        
        # Try to find columns that could serve as unique identifiers
        potential_keys = []
        
        for col in common_columns:
            # Check if column has relatively high uniqueness in both dataframes
            if len(df1) > 0 and len(df2) > 0:
                uniqueness1 = len(df1[col].unique()) / len(df1)
                uniqueness2 = len(df2[col].unique()) / len(df2)
                
                # If both dataframes have high uniqueness for this column
                if uniqueness1 > 0.8 and uniqueness2 > 0.8:
                    potential_keys.append(col)
        
        # If no good key columns found, use first few columns
        if not potential_keys:
            potential_keys = common_columns[:min(3, len(common_columns))]
        
        return potential_keys[:3]  # Limit to 3 key columns for performance
    
    def _match_rows_by_keys(self, df1: pd.DataFrame, df2: pd.DataFrame, 
                           key_columns: List[str]) -> Dict[str, tuple]:
        """Match rows using key columns."""
        matches = {}
        
        # Create lookup dictionaries
        df1_lookup = {}
        df2_lookup = {}
        
        for idx, row in df1.iterrows():
            key = tuple(row[col] for col in key_columns)
            df1_lookup[key] = (idx, row)
        
        for idx, row in df2.iterrows():
            key = tuple(row[col] for col in key_columns)
            df2_lookup[key] = (idx, row)
        
        # Find matches
        all_keys = set(df1_lookup.keys()) | set(df2_lookup.keys())
        
        for key in all_keys:
            old_row = df1_lookup.get(key)
            new_row = df2_lookup.get(key)
            matches[str(key)] = (old_row, new_row)
        
        return matches
    
    def _compare_rows(self, old_row: Optional[pd.Series], new_row: Optional[pd.Series],
                     all_columns: List[str], row_index: int) -> DiffRow:
        """Compare two rows and determine their diff status."""
        
        if old_row is None and new_row is not None:
            # Added row
            new_data = {col: new_row.get(col, '') for col in all_columns}
            return DiffRow(
                row_index=row_index,
                status='added',
                new_data=new_data
            )
        
        elif old_row is not None and new_row is None:
            # Removed row
            old_data = {col: old_row.get(col, '') for col in all_columns}
            return DiffRow(
                row_index=row_index,
                status='removed',
                old_data=old_data
            )
        
        elif old_row is not None and new_row is not None:
            # Compare for modifications
            old_data = {col: old_row.get(col, '') for col in all_columns}
            new_data = {col: new_row.get(col, '') for col in all_columns}
            
            changed_columns = []
            for col in all_columns:
                old_val = str(old_data.get(col, '')).strip()
                new_val = str(new_data.get(col, '')).strip()
                if old_val != new_val:
                    changed_columns.append(col)
            
            status = 'modified' if changed_columns else 'unchanged'
            
            return DiffRow(
                row_index=row_index,
                status=status,
                old_data=old_data,
                new_data=new_data,
                changed_columns=changed_columns if changed_columns else None
            )
        
        # This shouldn't happen, but just in case
        return DiffRow(row_index=row_index, status='unchanged')
    
    def compare_customers(self, df1: pd.DataFrame, df2: pd.DataFrame, 
                         file1_name: str, file2_name: str, 
                         customer_id_column: str = None) -> DiffResult:
        """Compare customer data focusing on new customers (additions only)."""
        
        if df1.empty and df2.empty:
            return DiffResult(
                summary=DiffSummary(0, 0, 0, 0, 0),
                column_names=[],
                rows=[],
                file1_name=file1_name,
                file2_name=file2_name
            )
        
        # Normalize DataFrames
        df1_normalized = self._normalize_dataframe(df1.copy())
        df2_normalized = self._normalize_dataframe(df2.copy())
        
        # Get all unique column names
        all_columns = list(set(df1_normalized.columns) | set(df2_normalized.columns))
        all_columns.sort()
        
        # Auto-detect customer ID column if not provided
        if customer_id_column is None:
            potential_id_columns = ['id', 'customer_id', 'user_id', 'merchant_id', 
                                  'merchant-display-name', 'merchant-public-id']
            for col in potential_id_columns:
                if col in all_columns:
                    customer_id_column = col
                    break
            
            # If still not found, use first column
            if customer_id_column is None and all_columns:
                customer_id_column = all_columns[0]
        
        if not customer_id_column or customer_id_column not in all_columns:
            # Fallback to regular comparison
            return self.compare(df1, df2, file1_name, file2_name)
        
        # Get customer IDs from both files
        old_customers = set(df1_normalized[customer_id_column].astype(str))
        new_customers = set(df2_normalized[customer_id_column].astype(str))
        
        # DEBUG: Print customer ID information
        print(f"DEBUG: Customer ID column used: {customer_id_column}")
        print(f"DEBUG: Old customers count: {len(old_customers)}")
        print(f"DEBUG: New customers count: {len(new_customers)}")
        print(f"DEBUG: Sample old customers: {list(old_customers)[:5]}")
        print(f"DEBUG: Sample new customers: {list(new_customers)[:5]}")
        
        # Find new customers (in df2 but not in df1)
        added_customer_ids = new_customers - old_customers
        print(f"DEBUG: Added customer IDs count: {len(added_customer_ids)}")
        print(f"DEBUG: Sample added customers: {list(added_customer_ids)[:5]}")
        
        # Create diff rows only for new customers
        diff_rows = []
        row_index = 0
        
        for idx, row in df2_normalized.iterrows():
            customer_id = str(row[customer_id_column])
            if customer_id in added_customer_ids:
                new_data = {col: row.get(col, '') for col in all_columns}
                diff_row = DiffRow(
                    row_index=row_index,
                    status='added',
                    new_data=new_data
                )
                diff_rows.append(diff_row)
                row_index += 1
        
        # Calculate summary
        added_count = len(diff_rows)
        
        summary = DiffSummary(
            total_rows=added_count,
            added_rows=added_count,
            removed_rows=0,
            modified_rows=0,
            unchanged_rows=0
        )
        
        return DiffResult(
            summary=summary,
            column_names=all_columns,
            rows=diff_rows,
            file1_name=file1_name,
            file2_name=file2_name
        )

    def compare(self, df1: pd.DataFrame, df2: pd.DataFrame, 
                file1_name: str, file2_name: str) -> DiffResult:
        """Compare two CSV DataFrames and return detailed diff results."""
        
        if df1.empty and df2.empty:
            return DiffResult(
                summary=DiffSummary(0, 0, 0, 0, 0),
                column_names=[],
                rows=[],
                file1_name=file1_name,
                file2_name=file2_name
            )
        
        # Normalize DataFrames
        df1_normalized = self._normalize_dataframe(df1.copy())
        df2_normalized = self._normalize_dataframe(df2.copy())
        
        # Get all unique column names
        all_columns = list(set(df1_normalized.columns) | set(df2_normalized.columns))
        all_columns.sort()  # Sort for consistent ordering
        
        # Find key columns for matching
        key_columns = self._find_key_columns(df1_normalized, df2_normalized)
        
        diff_rows = []
        
        if key_columns:
            # Use key-based matching
            matches = self._match_rows_by_keys(df1_normalized, df2_normalized, key_columns)
            
            row_index = 0
            for match_key, (old_match, new_match) in matches.items():
                old_row = old_match[1] if old_match else None
                new_row = new_match[1] if new_match else None
                
                diff_row = self._compare_rows(old_row, new_row, all_columns, row_index)
                diff_rows.append(diff_row)
                row_index += 1
        
        else:
            # Fallback to position-based comparison
            max_rows = max(len(df1_normalized), len(df2_normalized))
            
            for i in range(max_rows):
                old_row = df1_normalized.iloc[i] if i < len(df1_normalized) else None
                new_row = df2_normalized.iloc[i] if i < len(df2_normalized) else None
                
                diff_row = self._compare_rows(old_row, new_row, all_columns, i)
                diff_rows.append(diff_row)
        
        # Calculate summary statistics
        added_count = sum(1 for row in diff_rows if row.status == 'added')
        removed_count = sum(1 for row in diff_rows if row.status == 'removed')
        modified_count = sum(1 for row in diff_rows if row.status == 'modified')
        unchanged_count = sum(1 for row in diff_rows if row.status == 'unchanged')
        
        summary = DiffSummary(
            total_rows=len(diff_rows),
            added_rows=added_count,
            removed_rows=removed_count,
            modified_rows=modified_count,
            unchanged_rows=unchanged_count
        )
        
        return DiffResult(
            summary=summary,
            column_names=all_columns,
            rows=diff_rows,
            file1_name=file1_name,
            file2_name=file2_name
        )