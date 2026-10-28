import { api } from './api'

export const uploadAvatar = async (file, onUploadProgress) => {
  const formData = new FormData()
  formData.append('avatar', file)
  const response = await api.post('/user/avatar', formData, { onUploadProgress })
  return response.data.data.user
}

export const getStorage = async () => {
  const response = await api.get('/user/storage')
  return response.data.data
}
