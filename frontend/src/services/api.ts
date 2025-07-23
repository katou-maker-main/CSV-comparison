import axios from 'axios'
import { DiffResult } from '../types'

const API_BASE_URL = '/api'

export const compareFiles = async (file1: File, file2: File): Promise<DiffResult> => {
  const formData = new FormData()
  formData.append('file1', file1)
  formData.append('file2', file2)

  try {
    const response = await axios.post(`${API_BASE_URL}/compare`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds timeout
    })

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('リクエストがタイムアウトしました。より小さいファイルで試してください。')
      }
      
      if (error.response) {
        throw new Error(error.response.data?.detail || 'サーバーエラーが発生しました')
      }
      
      if (error.request) {
        throw new Error('サーバーに接続できません。バックエンドが起動しているか確認してください。')
      }
    }
    
    throw new Error('ファイル比較中に予期しないエラーが発生しました')
  }
}

export const downloadNewCustomersCSV = async (file1: File, file2: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file1', file1)
  formData.append('file2', file2)

  try {
    const response = await axios.post(`${API_BASE_URL}/download-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      timeout: 30000,
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url

    // Get filename from response headers or create default
    const contentDisposition = response.headers['content-disposition']
    let filename = '新規顧客一覧.csv'
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '')
      }
    }
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('ダウンロードがタイムアウトしました。')
      }
      
      if (error.response) {
        throw new Error(error.response.data?.detail || 'CSVダウンロード中にエラーが発生しました')
      }
      
      if (error.request) {
        throw new Error('サーバーに接続できません。')
      }
    }
    
    throw new Error('ダウンロード中に予期しないエラーが発生しました')
  }
}