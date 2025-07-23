import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { DiffResult, DiffRow } from '../types'

interface CsvData {
  data: Record<string, string>[]
  fileName: string
}

export class ClientSideCSVProcessor {
  /**
   * ファイルを読み込んでCSVデータに変換
   */
  async readFile(file: File): Promise<CsvData> {
    const fileName = file.name
    const data = await this.parseFile(file)
    return { data, fileName }
  }

  /**
   * ファイル形式に応じて解析
   */
  private async parseFile(file: File): Promise<Record<string, string>[]> {
    if (file.name.toLowerCase().endsWith('.csv')) {
      return this.parseCSVFile(file)
    } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      return this.parseExcelFile(file)
    } else {
      throw new Error('サポートされていないファイル形式です')
    }
  }

  /**
   * CSVファイルの解析
   */
  private async parseCSVFile(file: File): Promise<Record<string, string>[]> {
    const encodings = ['UTF-8', 'Shift_JIS', 'EUC-JP', 'ISO-2022-JP']
    
    for (const encoding of encodings) {
      try {
        console.log(`${encoding}で解析を試行中...`)
        
        let result: Record<string, string>[]
        
        if (encoding === 'UTF-8') {
          result = await this.tryParseWithEncoding(file, encoding)
        } else {
          // Shift_JIS、EUC-JP等はFileReaderで明示的に読み込み
          const text = await this.readFileWithEncoding(file, encoding)
          result = await this.parseCSVText(text)
        }
        
        if (this.isValidJapaneseText(result)) {
          console.log(`${encoding}での解析が成功しました`)
          return result
        } else {
          console.log(`${encoding}は文字化けが検出されました`)
        }
      } catch (error) {
        console.log(`${encoding}での解析に失敗:`, error)
      }
    }

    // 全てのエンコーディングが失敗した場合、バイナリデータとして読み込んで文字コード検出を試行
    try {
      console.log('自動文字コード検出を試行中...')
      const arrayBuffer = await this.readFileAsArrayBuffer(file)
      const detectedText = this.detectAndDecodeText(arrayBuffer)
      if (detectedText) {
        return await this.parseCSVText(detectedText)
      }
    } catch (error) {
      console.log('自動検出も失敗:', error)
    }

    // 最終フォールバック：UTF-8
    console.log('最終フォールバック: UTF-8で強制解析')
    return this.tryParseWithEncoding(file, 'UTF-8')
  }

  private async tryParseWithEncoding(file: File, encoding: string): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: encoding,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn(`${encoding}解析警告:`, results.errors)
          }
          resolve(results.data as Record<string, string>[])
        },
        error: (error) => {
          reject(new Error(`${encoding}解析エラー: ${error.message}`))
        }
      })
    })
  }

  private async readFileWithEncoding(file: File, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'))
      reader.readAsText(file, encoding)
    })
  }

  /**
   * CSVテキストを解析
   */
  private async parseCSVText(text: string): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as Record<string, string>[])
        },
        error: (error) => {
          reject(new Error(`CSV解析エラー: ${error.message}`))
        }
      })
    })
  }

  /**
   * ファイルをArrayBufferとして読み込み
   */
  private async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * バイナリデータから文字コードを検出してデコード
   */
  private detectAndDecodeText(buffer: ArrayBuffer): string | null {
    const uint8Array = new Uint8Array(buffer)
    
    // Shift_JIS の BOM チェック
    if (uint8Array.length >= 2) {
      // Shift_JIS特有のバイト列パターンをチェック
      let hasShiftJISPattern = false
      for (let i = 0; i < Math.min(1000, uint8Array.length - 1); i++) {
        const byte1 = uint8Array[i]
        const byte2 = uint8Array[i + 1]
        // Shift_JIS の2バイト文字範囲をチェック
        if ((byte1 >= 0x81 && byte1 <= 0x9F) || (byte1 >= 0xE0 && byte1 <= 0xFC)) {
          if ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFC)) {
            hasShiftJISPattern = true
            break
          }
        }
      }
      
      if (hasShiftJISPattern) {
        try {
          const decoder = new TextDecoder('shift_jis')
          return decoder.decode(buffer)
        } catch (error) {
          console.log('Shift_JIS デコードに失敗')
        }
      }
    }

    // UTF-8 を試行
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      return decoder.decode(buffer)
    } catch (error) {
      console.log('UTF-8 デコードに失敗')
    }

    // EUC-JP を試行
    try {
      const decoder = new TextDecoder('euc-jp')
      return decoder.decode(buffer)
    } catch (error) {
      console.log('EUC-JP デコードに失敗')
    }

    return null
  }

  private isValidJapaneseText(data: Record<string, string>[]): boolean {
    if (data.length === 0) return true
    
    // 最初の数行をチェック
    const sampleData = data.slice(0, Math.min(5, data.length))
    const text = JSON.stringify(sampleData)
    
    // 日本語文字の存在をチェック
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)
    
    // 文字化け文字をチェック（?、□、�、無効な文字など）
    const corruptedChars = (text.match(/[?□�\uFFFD]/g) || []).length
    const totalJapaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
    
    // 文字化け判定の改善
    if (hasJapanese) {
      // 日本語がある場合、文字化け文字が10%以下なら有効とみなす
      return totalJapaneseChars > 0 && (corruptedChars / Math.max(totalJapaneseChars, 1)) < 0.1
    } else {
      // 日本語がない場合（英数字のみなど）、文字化け文字が5%以下なら有効
      const totalChars = text.length
      return totalChars === 0 || (corruptedChars / totalChars) < 0.05
    }
  }

  /**
   * Excelファイルの解析
   */
  private async parseExcelFile(file: File): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })
          
          // 1行目をヘッダーとして使用
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1) as any[][]
          
          const result = rows.map(row => {
            const obj: Record<string, string> = {}
            headers.forEach((header, index) => {
              obj[header] = String(row[index] || '')
            })
            return obj
          })
          
          resolve(result)
        } catch (error) {
          reject(new Error(`Excel解析エラー: ${error}`))
        }
      }
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 新規顧客を抽出
   */
  compareCustomers(oldData: CsvData, newData: CsvData): DiffResult {
    const oldCustomers = oldData.data
    const newCustomers = newData.data

    if (oldCustomers.length === 0 && newCustomers.length === 0) {
      return this.createEmptyResult(oldData.fileName, newData.fileName)
    }

    // 比較キー列を検出（顧客名、メールアドレス）
    const oldHeaders = Object.keys(oldCustomers[0] || {})
    const newHeaders = Object.keys(newCustomers[0] || {})
    
    const keyColumns = this.findComparisonKeys(oldHeaders, newHeaders)
    
    if (keyColumns.length === 0) {
      return this.createEmptyResult(oldData.fileName, newData.fileName)
    }

    console.log('比較に使用するキー列:', keyColumns)

    // 既存顧客のキーセットを作成
    const oldCustomerKeys = new Set<string>()
    
    oldCustomers.forEach(customer => {
      const keyValue = this.generateCustomerKey(customer, keyColumns)
      if (keyValue) {
        oldCustomerKeys.add(keyValue)
      }
    })

    console.log('既存顧客キー数:', oldCustomerKeys.size)

    // 新規顧客を抽出
    const newCustomerRows: DiffRow[] = []
    let rowIndex = 0

    newCustomers.forEach((customer) => {
      const keyValue = this.generateCustomerKey(customer, keyColumns)
      
      if (keyValue && !oldCustomerKeys.has(keyValue)) {
        newCustomerRows.push({
          rowIndex: rowIndex++,
          status: 'added' as const,
          oldData: undefined,
          newData: customer,
          changedColumns: []
        })
      }
    })

    console.log('新規顧客数:', newCustomerRows.length)

    // 全列名を取得
    const allColumns = Array.from(new Set([...oldHeaders, ...newHeaders]))

    return {
      summary: {
        totalRows: newCustomerRows.length,
        addedRows: newCustomerRows.length,
        removedRows: 0,
        modifiedRows: 0,
        unchangedRows: 0
      },
      columnNames: allColumns,
      rows: newCustomerRows,
      file1Name: oldData.fileName,
      file2Name: newData.fileName
    }
  }

  /**
   * 比較に使用するキー列を検出
   */
  private findComparisonKeys(oldHeaders: string[], newHeaders: string[]): string[] {
    const commonHeaders = oldHeaders.filter(header => newHeaders.includes(header))
    
    // 優先順位: メールアドレス > 顧客名 > その他
    const keyPriority = [
      // メールアドレス関連
      'メールアドレス', 'email', 'Email', 'EMAIL', 'mail', 'Mail',
      // 顧客名関連  
      '顧客名', '氏名', '名前', 'name', 'Name', 'NAME', 'customer_name', 'full_name',
      // その他の識別子
      '会社名', 'company', 'Company', 'COMPANY'
    ]

    const foundKeys: string[] = []
    
    for (const priority of keyPriority) {
      const matchingHeader = commonHeaders.find(header => 
        header.includes(priority) || priority.includes(header)
      )
      if (matchingHeader && !foundKeys.includes(matchingHeader)) {
        foundKeys.push(matchingHeader)
      }
    }

    // 優先キーが見つからない場合、共通列の最初の列を使用
    if (foundKeys.length === 0 && commonHeaders.length > 0) {
      foundKeys.push(commonHeaders[0])
    }

    return foundKeys
  }

  /**
   * 顧客の一意キーを生成
   */
  private generateCustomerKey(customer: Record<string, string>, keyColumns: string[]): string | null {
    const keyParts = keyColumns.map(column => {
      const value = String(customer[column] || '').trim()
      return value.toLowerCase() // 大文字小文字を無視
    }).filter(part => part !== '')

    if (keyParts.length === 0) {
      return null
    }

    return keyParts.join('|') // 複数キーを結合
  }

  /**
   * 空の結果を作成
   */
  private createEmptyResult(file1Name: string, file2Name: string): DiffResult {
    return {
      summary: {
        totalRows: 0,
        addedRows: 0,
        removedRows: 0,
        modifiedRows: 0,
        unchangedRows: 0
      },
      columnNames: [],
      rows: [],
      file1Name,
      file2Name
    }
  }

  /**
   * CSVダウンロード用データを生成
   */
  generateCSVDownload(result: DiffResult): string {
    if (result.rows.length === 0) {
      return ''
    }

    const headers = result.columnNames
    const csvRows = [headers]

    result.rows.forEach(row => {
      if (row.status === 'added' && row.newData) {
        const csvRow = headers.map(header => {
          const value = row.newData?.[header] || ''
          // CSVエスケープ処理
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        csvRows.push(csvRow)
      }
    })

    return csvRows.map(row => row.join(',')).join('\n')
  }

  /**
   * CSVファイルをダウンロード
   */
  downloadCSV(csvContent: string, filename: string = 'new_customers.csv') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_')
    const finalFilename = `new_customers_${timestamp}.csv`
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', finalFilename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }
}