import { useState } from 'react'
import FileUpload from './components/FileUpload'
import DiffViewer from './components/DiffViewer'
import { DiffResult } from './types'

function App() {
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<{ file1: File | undefined, file2: File | undefined }>({ file1: undefined, file2: undefined })

  const handleDiffComplete = (result: DiffResult) => {
    setDiffResult(result)
    setIsLoading(false)
  }

  const handleDiffStart = () => {
    setIsLoading(true)
    setDiffResult(null)
  }

  const handleReset = () => {
    setDiffResult(null)
    setIsLoading(false)
    setUploadedFiles({ file1: undefined, file2: undefined })
  }

  return (
    <div className="container">
      <header style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: '700', 
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-sm)'
        }}>
          新規顧客抽出ツール
        </h1>
        <p style={{ 
          color: 'var(--color-text-secondary)',
          fontSize: '1.125rem'
        }}>
          前回と今回のファイルを比較して新規顧客を抽出します
        </p>
      </header>

      {!diffResult && !isLoading && (
        <FileUpload 
          onDiffStart={handleDiffStart}
          onDiffComplete={handleDiffComplete}
          onFilesSelected={setUploadedFiles}
        />
      )}

      {isLoading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
          <div className="loading" style={{ marginRight: 'var(--spacing-sm)' }}></div>
          <span>ファイルを処理中...</span>
        </div>
      )}

      {diffResult && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600',
              color: 'var(--color-text-primary)'
            }}>
              新規顧客一覧
            </h2>
            <button className="btn btn-primary" onClick={handleReset}>
              新しいファイルを比較
            </button>
          </div>
          <DiffViewer 
            diffResult={diffResult} 
            file1={uploadedFiles.file1} 
            file2={uploadedFiles.file2} 
          />
        </div>
      )}
    </div>
  )
}

export default App