export interface DiffRow {
  rowIndex: number
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  oldData?: Record<string, any>
  newData?: Record<string, any>
  changedColumns?: string[]
}

export interface DiffResult {
  summary: {
    totalRows: number
    addedRows: number
    removedRows: number
    modifiedRows: number
    unchangedRows: number
  }
  columnNames: string[]
  rows: DiffRow[]
  file1Name: string
  file2Name: string
}

export interface ComparisonRequest {
  file1: File
  file2: File
}