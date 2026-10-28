import { getSignedDownloadUrl } from '../services/r2Service.js'

const avatarTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export const safeUserResponse = async (user) => {
  let avatar = ''
  if (user.avatar) {
    const extension = user.avatar.split('.').pop()?.toLowerCase()
    const mimeType = avatarTypes[extension]
    if (mimeType) {
      const signedAvatar = await getSignedDownloadUrl(user.avatar, {
        filename: `avatar.${extension}`,
        mimeType,
        disposition: 'inline',
        expiresIn: 3600,
      })
      avatar = signedAvatar.url
    }
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar,
    storageUsed: user.storageUsed,
    storageLimit: user.storageLimit,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}