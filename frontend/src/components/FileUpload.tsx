import { useState, useCallback } from 'react'
import { DiffResult } from '../types'
import { compareFiles } from '../services/api'

interface FileUploadProps {
  onDiffStart: () => void
  onDiffComplete: (result: DiffResult) => void
  onFilesSelected: (files: { file1: File | undefined, file2: File | undefined }) => void
}

const FileUpload: React.FC<FileUploadProps> = ({ onDiffStart, onDiffComplete, onFilesSelected }) => {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [error, setError] = useState<string>('')

  const handleFileChange = (fileNumber: 1 | 2) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && !file.name.toLowerCase().match(/\.(csv|xlsx|xls)$/)) {
      setError('CSV、Excel（.xlsx、.xls）ファイルのみを選択してください')
      return
    }
    
    setError('')
    if (fileNumber === 1) {
      setFile1(file || null)
      onFilesSelected({ file1: file || undefined, file2: file2 || undefined })
    } else {
      setFile2(file || null)
      onFilesSelected({ file1: file1 || undefined, file2: file || undefined })
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
  }, [])

  const handleDrop = (fileNumber: 1 | 2) => (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    
    const files = e.dataTransfer.files
    const file = files[0]
    
    if (file && !file.name.toLowerCase().match(/\.(csv|xlsx|xls)$/)) {
      setError('CSV、Excel（.xlsx、.xls）ファイルのみを選択してください')
      return
    }

    setError('')
    if (fileNumber === 1) {
      setFile1(file || null)
      onFilesSelected({ file1: file || undefined, file2: file2 || undefined })
    } else {
      setFile2(file || null)
      onFilesSelected({ file1: file1 || undefined, file2: file || undefined })
    }
  }

  const handleCompare = async () => {
    if (!file1 || !file2) {
      setError('両方のファイルを選択してください')
      return
    }

    try {
      onDiffStart()
      const result = await compareFiles(file1, file2)
      onDiffComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ファイル比較中にエラーが発生しました')
      onDiffComplete({
        summary: { totalRows: 0, addedRows: 0, removedRows: 0, modifiedRows: 0, unchangedRows: 0 },
        columnNames: [],
        rows: [],
        file1Name: file1.name,
        file2Name: file2.name
      })
    }
  }

  return (
    <div className="card">
      <h2 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        marginBottom: 'var(--spacing-lg)',
        color: 'var(--color-text-primary)'
      }}>
        ファイルのアップロード
      </h2>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        {/* File 1 Upload */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: 'var(--spacing-sm)',
            fontWeight: '500',
            color: 'var(--color-text-secondary)'
          }}>
            前回データ (CSV/Excel)
          </label>
          <div 
            className="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(1)}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange(1)}
              style={{ display: 'none' }}
              id="file1"
            />
            <label htmlFor="file1" style={{ cursor: 'pointer' }}>
              {file1 ? (
                <div>
                  <div style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-xs)' }}>
                    ✓ {file1.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                    クリックでファイルを変更
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-xs)' }}>
                    📄
                  </div>
                  <div style={{ fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>
                    クリックでアップロードまたはドラッグ&ドロップ
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                    CSV/Excelファイル
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* File 2 Upload */}
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: 'var(--spacing-sm)',
            fontWeight: '500',
            color: 'var(--color-text-secondary)'
          }}>
            今回データ (CSV/Excel)
          </label>
          <div 
            className="file-upload"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(2)}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange(2)}
              style={{ display: 'none' }}
              id="file2"
            />
            <label htmlFor="file2" style={{ cursor: 'pointer' }}>
              {file2 ? (
                <div>
                  <div style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-xs)' }}>
                    ✓ {file2.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                    クリックでファイルを変更
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-xs)' }}>
                    📄
                  </div>
                  <div style={{ fontWeight: '500', marginBottom: 'var(--spacing-xs)' }}>
                    クリックでアップロードまたはドラッグ&ドロップ
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                    CSV/Excelファイル
                  </div>
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          color: 'var(--color-error)', 
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-sm)',
          backgroundColor: 'var(--color-diff-removed)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleCompare}
        disabled={!file1 || !file2}
        style={{
          width: '100%',
          fontSize: '1rem',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          opacity: !file1 || !file2 ? 0.6 : 1,
          cursor: !file1 || !file2 ? 'not-allowed' : 'pointer'
        }}
      >
        ファイルを比較
      </button>
    </div>
  )
}

export default FileUpload