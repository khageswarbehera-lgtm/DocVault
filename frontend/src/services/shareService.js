import { api } from './api'

export const shareDocument = async ({ documentId, email, permission }) => {
  const response = await api.post('/shares', { documentId, email, permission })
  return response.data.data
}

export const getSharedWithMe = async () => {
  const response = await api.get('/shares/with-me')
  return response.data.data
}