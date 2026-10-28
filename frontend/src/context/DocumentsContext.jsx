import { useCallback, useEffect, useMemo, useState } from 'react'
import { DocumentsContext } from './documents-context'
import { useAuth } from './useAuth'
import { getApiErrorMessage } from '../services/api'
import {
  createFolder as createFolderRequest,
  downloadDocument as downloadDocumentRequest,
  deleteFolder as deleteFolderRequest,
  getAllDocuments,
  getAllFavorites,
  getAllFolders,
  getAllRecent,
  getAllTrash,
  getDocument,
  moveDocument as moveDocumentRequest,
  normalizeDocument,
  permanentlyDeleteDocument,
  previewDocument,
  renameDocument,
  restoreDocument as restoreDocumentRequest,
  searchAllDocuments,
  toggleFavorite as toggleFavoriteRequest,
  trashDocument,
  updateFolder as updateFolderRequest,
  uploadDocument,
} from '../services/documentService'
import { getSharedWithMe, shareDocument as shareDocumentRequest } from '../services/shareService'

const emptyList = []

export function DocumentsProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [workspace, setWorkspace] = useState({ ownerId: null, documents: [], folders: [], error: null })
  const ownsWorkspace = Boolean(user?.id) && workspace.ownerId === user.id
  const documents = ownsWorkspace ? workspace.documents : emptyList
  const folders = ownsWorkspace ? workspace.folders : emptyList
  const error = ownsWorkspace ? workspace.error : null
  const isLoading = isAuthLoading || (Boolean(user?.id) && !ownsWorkspace)

  const refreshData = useCallback(async () => {
    if (!user?.id) return { documents: [], folders: [] }
    const [documentItems, folderItems] = await Promise.all([getAllDocuments(), getAllFolders()])
    const nextFolders = folderItems.map((folder) => ({ ...folder, id: String(folder.id || folder._id) }))
    const nextDocuments = documentItems.map((document) => normalizeDocument(document, nextFolders))
    setWorkspace({ ownerId: user.id, documents: nextDocuments, folders: nextFolders, error: null })
    return { documents: nextDocuments, folders: nextFolders }
  }, [user])

  useEffect(() => {
    let active = true

    if (isAuthLoading || !user?.id) return () => { active = false }

    Promise.all([getAllDocuments(), getAllFolders()])
      .then(([documentItems, folderItems]) => {
        if (!active) return
        const nextFolders = folderItems.map((folder) => ({ ...folder, id: String(folder.id || folder._id) }))
        setWorkspace({
          ownerId: user.id,
          documents: documentItems.map((document) => normalizeDocument(document, nextFolders)),
          folders: nextFolders,
          error: null,
        })
      })
      .catch((requestError) => {
        if (active) {
          setWorkspace({
            ownerId: user.id,
            documents: [],
            folders: [],
            error: getApiErrorMessage(requestError, 'Could not load your workspace.'),
          })
        }
      })

    return () => { active = false }
  }, [user?.id, isAuthLoading])

  const loadDocumentsForView = useCallback(async (mode, query = '') => {
    let items
    if (mode === 'trash') items = await getAllTrash()
    else if (mode === 'favorites') items = await getAllFavorites()
    else if (mode === 'recent') items = await getAllRecent()
    else if (mode === 'shared') items = await getSharedWithMe()
    else if (query.trim()) items = await searchAllDocuments(query.trim())
    else return documents

    return items.map((document) => normalizeDocument(document, folders))
  }, [documents, folders])

  const loadDocument = useCallback(async (id) => normalizeDocument(await getDocument(id), folders), [folders])

  const updateDocument = useCallback(async (id, changes) => {
    if (!Object.hasOwn(changes, 'name')) return
    const updated = normalizeDocument(await renameDocument(id, changes.name), folders)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: current.documents.map((item) => item.id === id ? updated : item) }
      : current)
    return updated
  }, [folders, user?.id])

  const toggleFavorite = useCallback(async (id) => {
    const updated = normalizeDocument(await toggleFavoriteRequest(id), folders)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: current.documents.map((item) => item.id === id ? updated : item) }
      : current)
    return updated
  }, [folders, user?.id])

  const moveToTrash = useCallback(async (id) => {
    await trashDocument(id)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: current.documents.filter((item) => item.id !== id) }
      : current)
  }, [user?.id])

  const restoreDocument = useCallback(async (id) => {
    const restored = normalizeDocument(await restoreDocumentRequest(id), folders)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: [restored, ...current.documents.filter((item) => item.id !== id)] }
      : current)
    return restored
  }, [folders, user?.id])

  const permanentlyDelete = useCallback(async (id) => {
    await permanentlyDeleteDocument(id)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: current.documents.filter((item) => item.id !== id) }
      : current)
  }, [user?.id])

  const addDocuments = useCallback(async (file, onUploadProgress) => {
    const uploaded = normalizeDocument(await uploadDocument(file, onUploadProgress), folders)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: [uploaded, ...current.documents.filter((item) => item.id !== uploaded.id)] }
      : current)
    return uploaded
  }, [folders, user?.id])

  const getDownloadUrl = useCallback(async (id) => {
    const result = await downloadDocumentRequest(id)
    return result.url
  }, [])

  const getPreviewUrl = useCallback(async (id) => {
    const result = await previewDocument(id)
    return result.url
  }, [])

  const shareDocument = useCallback((documentId, email, permission) => shareDocumentRequest({
    documentId,
    email,
    permission,
  }), [])

  const createFolder = useCallback(async (name, parentFolder = null) => {
    const folder = await createFolderRequest(name, parentFolder)
    const normalized = { ...folder, id: String(folder.id || folder._id) }
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, folders: [normalized, ...current.folders.filter((item) => item.id !== normalized.id)] }
      : current)
    return normalized
  }, [user?.id])

  const renameFolder = useCallback(async (id, name) => {
    const folder = await updateFolderRequest(id, { name })
    const normalized = { ...folder, id: String(folder.id || folder._id) }
    setWorkspace((current) => current.ownerId === user?.id
      ? {
        ...current,
        folders: current.folders.map((item) => item.id === id ? normalized : item),
        documents: current.documents.map((item) => item.folderId === id ? { ...item, folder: normalized.name } : item),
      }
      : current)
    return normalized
  }, [user?.id])

  const updateFolder = useCallback(async (id, changes) => {
    const folder = await updateFolderRequest(id, changes)
    const normalized = { ...folder, id: String(folder.id || folder._id) }
    setWorkspace((current) => current.ownerId === user?.id
      ? {
        ...current,
        folders: current.folders.map((item) => item.id === id ? normalized : item),
        documents: Object.hasOwn(changes, 'name')
          ? current.documents.map((item) => item.folderId === id ? { ...item, folder: normalized.name } : item)
          : current.documents,
      }
      : current)
    return normalized
  }, [user?.id])

  const deleteFolder = useCallback(async (id) => {
    await deleteFolderRequest(id)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, folders: current.folders.filter((item) => item.id !== id) }
      : current)
  }, [user?.id])

  const moveDocument = useCallback(async (id, folderId) => {
    const updated = normalizeDocument(await moveDocumentRequest(id, folderId), folders)
    setWorkspace((current) => current.ownerId === user?.id
      ? { ...current, documents: current.documents.map((item) => item.id === id ? updated : item) }
      : current)
    return updated
  }, [folders, user?.id])

  const value = useMemo(() => ({
    documents,
    folders,
    isLoading,
    error,
    refreshData,
    loadDocumentsForView,
    loadDocument,
    updateDocument,
    toggleFavorite,
    moveToTrash,
    restoreDocument,
    permanentlyDelete,
    shareDocument,
    addDocuments,
    getDownloadUrl,
    getPreviewUrl,
    createFolder,
    renameFolder,
    updateFolder,
    deleteFolder,
    moveDocument,
  }), [
    documents,
    folders,
    isLoading,
    error,
    refreshData,
    loadDocumentsForView,
    loadDocument,
    updateDocument,
    toggleFavorite,
    moveToTrash,
    restoreDocument,
    permanentlyDelete,
    shareDocument,
    addDocuments,
    getDownloadUrl,
    getPreviewUrl,
    createFolder,
    renameFolder,
    updateFolder,
    deleteFolder,
    moveDocument,
  ])

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>
}
