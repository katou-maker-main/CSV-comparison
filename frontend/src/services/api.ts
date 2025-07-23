import { DiffResult } from '../types'
import { ClientSideCSVProcessor } from './csvProcessor'

const csvProcessor = new ClientSideCSVProcessor()

export const compareFiles = async (file1: File, file2: File): Promise<DiffResult> => {
  try {
    // ファイルを読み込み
    const [oldData, newData] = await Promise.all([
      csvProcessor.readFile(file1),
      csvProcessor.readFile(file2)
    ])

    // 新規顧客を抽出
    const result = csvProcessor.compareCustomers(oldData, newData)
    
    return result
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }
    throw new Error('ファイル処理中にエラーが発生しました。')
  }
}

export const downloadNewCustomersCSV = async (file1: File, file2: File): Promise<void> => {
  try {
    // ファイル比較を実行
    const result = await compareFiles(file1, file2)
    
    if (result.rows.length === 0) {
      throw new Error('新規顧客が見つかりませんでした。')
    }

    // CSVデータを生成
    const csvContent = csvProcessor.generateCSVDownload(result)
    
    if (!csvContent) {
      throw new Error('CSVデータの生成に失敗しました。')
    }

    // ダウンロードを実行
    csvProcessor.downloadCSV(csvContent)
    
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('ダウンロード中にエラーが発生しました。')
  }
}