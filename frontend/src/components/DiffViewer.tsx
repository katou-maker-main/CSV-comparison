import { useState } from 'react'
import { DiffResult } from '../types'
import { downloadNewCustomersCSV } from '../services/api'

interface DiffViewerProps {
  diffResult: DiffResult
  file1?: File
  file2?: File
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffResult, file1, file2 }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)
  const itemsPerPage = 50

  // Column name beautification
  const beautifyColumnName = (columnName: string): string => {
    // Common column name mappings
    const columnMappings: Record<string, string> = {
      'id': 'ID',
      'name': '名前',
      'age': '年齢',
      'department': '部署',
      'email': 'メール',
      'phone': '電話番号',
      'address': '住所',
      'date': '日付',
      'created_at': '作成日時',
      'updated_at': '更新日時',
      'status': 'ステータス',
      'price': '価格',
      'amount': '金額',
      'quantity': '数量'
    }

    // Check for direct mapping
    const lowerColumn = columnName.toLowerCase()
    if (columnMappings[lowerColumn]) {
      return columnMappings[lowerColumn]
    }

    // If no mapping found, return original with better formatting
    return columnName
      .replace(/_/g, ' ')  // Replace underscores with spaces
      .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Only show added rows (new customers)
  const newCustomers = diffResult.rows.filter(row => row.status === 'added')

  const totalPages = Math.ceil(newCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRows = newCustomers.slice(startIndex, startIndex + itemsPerPage)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'var(--color-success)'
      case 'removed': return 'var(--color-error)'
      case 'modified': return 'var(--color-warning)'
      default: return 'var(--color-text-secondary)'
    }
  }

  const getRowClass = (status: string) => {
    switch (status) {
      case 'added': return 'diff-added'
      case 'removed': return 'diff-removed'
      case 'modified': return 'diff-modified'
      default: return 'diff-unchanged'
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDownloadCSV = async () => {
    if (!file1 || !file2) {
      alert('ダウンロードするには元のファイルが必要です')
      return
    }

    setIsDownloading(true)
    try {
      await downloadNewCustomersCSV(file1, file2)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'ダウンロード中にエラーが発生しました')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div>
      {/* File Information */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1rem', fontWeight: '600' }}>
          データファイル情報
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 'var(--spacing-md)',
          fontSize: '0.875rem'
        }}>
          <div>
            <strong>前回データ:</strong> {diffResult.file1Name}
          </div>
          <div>
            <strong>今回データ:</strong> {diffResult.file2Name}
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1rem', fontWeight: '600' }}>
          新規顧客について
        </h3>
        <div style={{ 
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
            <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>🆕</span>
            <span>前回データにはなく、今回データに新しく追加された顧客のみを表示しています</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
            ※ 既存顧客のデータ変更は表示されません
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-xl)' 
      }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--color-success)' }}>
            {diffResult.summary.addedRows}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: '600' }}>新規顧客数</div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', marginTop: 'var(--spacing-xs)' }}>
            前回から増加した顧客
          </div>
        </div>
        
        {/* Download Button Card */}
        {file1 && file2 && diffResult.summary.addedRows > 0 && (
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: 'var(--spacing-md)' 
          }}>
            <button
              className="btn btn-primary"
              onClick={handleDownloadCSV}
              disabled={isDownloading}
              style={{
                fontSize: '1rem',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                marginBottom: 'var(--spacing-xs)',
                opacity: isDownloading ? 0.6 : 1,
                cursor: isDownloading ? 'not-allowed' : 'pointer'
              }}
            >
              {isDownloading ? '📥 ダウンロード中...' : '📥 CSV ダウンロード'}
            </button>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', textAlign: 'center' }}>
              新規顧客データをCSVファイルでダウンロード
            </div>
          </div>
        )}
      </div>


      {/* Diff Table */}
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="diff-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>行番号</th>
              <th style={{ width: '80px' }}>状態</th>
              {diffResult.columnNames.map((column, index) => (
                <th key={index} title={`元の列名: ${column}`}>
                  {beautifyColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, index) => (
              <tr key={`${row.rowIndex}-${index}`} className={getRowClass(row.status)}>
                <td style={{ fontWeight: '500' }}>{row.rowIndex + 1}</td>
                <td>
                  <span style={{ 
                    color: getStatusColor(row.status),
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    fontSize: '0.75rem'
                  }}>
                    {row.status === 'added' ? '追加' : row.status === 'removed' ? '削除' : row.status === 'modified' ? '変更' : '未変更'}
                  </span>
                </td>
                {diffResult.columnNames.map((column, colIndex) => {
                  const oldValue = row.oldData?.[column]
                  const newValue = row.newData?.[column]
                  const hasChanged = row.changedColumns?.includes(column)
                  
                  return (
                    <td key={colIndex} style={{ 
                      position: 'relative',
                      fontWeight: hasChanged ? '600' : 'normal'
                    }}>
                      {row.status === 'removed' ? (
                        <span>{oldValue !== undefined ? String(oldValue) : ''}</span>
                      ) : row.status === 'added' ? (
                        <span>{newValue !== undefined ? String(newValue) : ''}</span>
                      ) : (
                        <div>
                          {row.status === 'modified' && hasChanged ? (
                            <div>
                              <div style={{ 
                                textDecoration: 'line-through', 
                                color: 'var(--color-diff-removed-text)',
                                fontSize: '0.75rem'
                              }}>
                                {oldValue !== undefined ? String(oldValue) : ''}
                              </div>
                              <div style={{ 
                                color: 'var(--color-diff-added-text)',
                                fontWeight: '600'
                              }}>
                                {newValue !== undefined ? String(newValue) : ''}
                              </div>
                            </div>
                          ) : (
                            <span>{newValue !== undefined ? String(newValue) : (oldValue !== undefined ? String(oldValue) : '')}</span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        {paginatedRows.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-2xl)',
            color: 'var(--color-text-secondary)'
          }}>
            新規顧客はありません
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          marginTop: 'var(--spacing-lg)'
        }}>
          <button
            className="btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            前へ
          </button>
          
          <span style={{ 
            padding: '0 var(--spacing-md)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem'
          }}>
            {currentPage} / {totalPages} ページ ({newCustomers.length} 件の新規顧客)
          </span>
          
          <button
            className="btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}

export default DiffViewer