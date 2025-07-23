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
    // まずUTF-8で試行
    try {
      const utf8Result = await this.tryParseWithEncoding(file, 'UTF-8')
      // 文字化けチェック：日本語文字が含まれているか
      if (this.isValidJapaneseText(utf8Result)) {
        return utf8Result
      }
    } catch (error) {
      console.log('UTF-8での解析に失敗、他のエンコーディングを試行')
    }

    // Shift_JIS/CP932で試行（ファイルを手動で読み込み）
    try {
      const text = await this.readFileWithEncoding(file, 'shift_jis')
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
    } catch (error) {
      console.warn('Shift_JISでの解析も失敗、UTF-8結果を使用')
    }

    // フォールバック：UTF-8で解析
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

  private isValidJapaneseText(data: Record<string, string>[]): boolean {
    if (data.length === 0) return true
    
    // 最初の数行をチェック
    const sampleData = data.slice(0, 3)
    const text = JSON.stringify(sampleData)
    
    // 文字化け文字をチェック（?、□、�などが多い場合は文字化け）
    const corruptedChars = (text.match(/[?□�]/g) || []).length
    const totalChars = text.length
    
    // 全体の5%以上が文字化け文字の場合は無効とみなす
    return totalChars === 0 || (corruptedChars / totalChars) < 0.05
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