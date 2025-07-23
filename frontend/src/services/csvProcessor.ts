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
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV解析警告:', results.errors)
          }
          resolve(results.data as Record<string, string>[])
        },
        error: (error) => {
          reject(new Error(`CSV解析エラー: ${error.message}`))
        }
      })
    })
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

    // 最初の列をIDとして使用
    const oldHeaders = Object.keys(oldCustomers[0] || {})
    const newHeaders = Object.keys(newCustomers[0] || {})
    const idColumn = oldHeaders[0] || newHeaders[0]

    if (!idColumn) {
      return this.createEmptyResult(oldData.fileName, newData.fileName)
    }

    // 既存顧客のIDセットを作成
    const oldIds = new Set(
      oldCustomers.map(customer => String(customer[idColumn] || '').trim())
    )

    // 新規顧客を抽出
    const newCustomerRows: DiffRow[] = []
    let rowIndex = 0

    newCustomers.forEach((customer) => {
      const customerId = String(customer[idColumn] || '').trim()
      
      if (!oldIds.has(customerId) && customerId !== '') {
        newCustomerRows.push({
          rowIndex: rowIndex++,
          status: 'added' as const,
          oldData: undefined,
          newData: customer,
          changedColumns: []
        })
      }
    })

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