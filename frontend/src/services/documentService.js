import { api } from './api'

export const documentEndpoints = {
  list: '/documents',
  detail: (id) => `/documents/${id}`,
  upload: '/documents/upload',
  download: (id) => `/documents/${id}/download`,
  preview: (id) => `/documents/${id}/preview`,
  permanentDelete: (id) => `/documents/${id}/permanent`,
  search: '/documents/search',
  trash: (id) => `/documents/${id}`,
  restore: (id) => `/documents/${id}/restore`,
  favorite: (id) => `/documents/${id}/favorite`,
  move: (id) => `/documents/${id}/move`,
  trashList: '/documents/trash',
  favorites: '/documents/favorites',
  recent: '/documents/recent',
  folders: '/folders',
  folder: (id) => `/folders/${id}`,
}

const responseBody = async (request) => (await request).data

export const normalizeDocument = (document, folders = []) => {
  const extension = (document.extension || document.originalName?.split('.').pop() || '').toUpperCase()
  const folderId = document.folderId || document.folder?.id || null
  const folder = folders.find((item) => item.id === folderId)?.name
    || document.folder?.name
    || (typeof document.folder === 'string' ? document.folder : null)
    || 'My Documents'
  const color = document.mimeType?.startsWith('image/')
    ? 'amber'
    : extension === 'PDF'
      ? 'red'
      : ['XLS', 'XLSX'].includes(extension)
        ? 'green'
        : 'blue'

  return {
    ...document,
    id: String(document.id || document._id),
    extension: extension.toLowerCase(),
    fileType: extension || 'FILE',
    folderId,
    folder,
    color,
  }
}

export const listDocuments = (params = {}) => responseBody(
  api.get(documentEndpoints.list, { params: { page: 1, limit: 100, ...params } }),
)

export const getDocument = async (id) => {
  const response = await responseBody(api.get(documentEndpoints.detail(id)))
  return response.data
}

export const renameDocument = async (id, name) => {
  const response = await responseBody(api.put(documentEndpoints.detail(id), { name }))
  return response.data
}

export const uploadDocument = async (file, onUploadProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await responseBody(api.post(documentEndpoints.upload, formData, { onUploadProgress }))
  return response.data
}

export const downloadDocument = async (id) => {
  const response = await responseBody(api.get(documentEndpoints.download(id)))
  return response.data
}

export const previewDocument = async (id) => {
  const response = await responseBody(api.get(documentEndpoints.preview(id)))
  return response.data
}

export const permanentlyDeleteDocument = async (id) => {
  const response = await responseBody(api.delete(documentEndpoints.permanentDelete(id)))
  return response.data
}

export const toggleFavorite = async (id) => {
  const response = await responseBody(api.patch(documentEndpoints.favorite(id)))
  return response.data
}

export const trashDocument = async (id) => {
  const response = await responseBody(api.delete(documentEndpoints.trash(id)))
  return response.data
}

export const restoreDocument = async (id) => {
  const response = await responseBody(api.patch(documentEndpoints.restore(id)))
  return response.data
}

export const moveDocument = async (id, folderId) => {
  const response = await responseBody(api.patch(documentEndpoints.move(id), { folderId }))
  return response.data
}

export const getTrash = (params = {}) => responseBody(
  api.get(documentEndpoints.trashList, { params: { page: 1, limit: 100, ...params } }),
)

export const getFavorites = (params = {}) => responseBody(
  api.get(documentEndpoints.favorites, { params: { page: 1, limit: 100, ...params } }),
)

export const getRecent = (params = {}) => responseBody(
  api.get(documentEndpoints.recent, { params: { page: 1, limit: 100, ...params } }),
)

export const searchDocuments = (query, params = {}) => responseBody(
  api.get(documentEndpoints.search, { params: { q: query, page: 1, limit: 100, ...params } }),
)

const collectPages = async (requestPage) => {
  const firstPage = await requestPage(1)
  const documents = [...(firstPage.data || [])]
  for (let page = 2; page <= (firstPage.pagination?.totalPages || 1); page += 1) {
    const nextPage = await requestPage(page)
    documents.push(...(nextPage.data || []))
  }
  return documents
}

export const getAllDocuments = () => collectPages((page) => listDocuments({ page }))
export const getAllTrash = () => collectPages((page) => getTrash({ page }))
export const getAllFavorites = () => collectPages((page) => getFavorites({ page }))
export const getAllRecent = () => collectPages((page) => getRecent({ page }))
export const searchAllDocuments = (query) => collectPages((page) => searchDocuments(query, { page }))

export const listFolders = (params = {}) => responseBody(
  api.get(documentEndpoints.folders, { params: { page: 1, limit: 100, ...params } }),
)

export const getAllFolders = () => collectPages((page) => listFolders({ page }))

export const createFolder = async (name, parentFolder = null) => {
  const response = await responseBody(api.post(documentEndpoints.folders, { name, parentFolder }))
  return response.data
}

export const updateFolder = async (id, changes) => {
  const response = await responseBody(api.put(documentEndpoints.folder(id), changes))
  return response.data
}

export const deleteFolder = (id) => responseBody(api.delete(documentEndpoints.folder(id)))
