import { useContext } from 'react'
import { DocumentsContext } from './documents-context'

export function useDocuments() {
  const context = useContext(DocumentsContext)
  if (!context) throw new Error('useDocuments must be used within DocumentsProvider')
  return context
}
