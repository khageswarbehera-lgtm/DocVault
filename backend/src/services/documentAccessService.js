import Document from '../models/Document.js'
import Share from '../models/Share.js'

export const getAccessibleDocument = async (documentId, userId) => {
  const ownedDocument = await Document.findOne({
    _id: documentId,
    owner: userId,
    isDeleted: false,
  }).select('+storageKey')

  if (ownedDocument) return { document: ownedDocument, permission: 'owner', isOwner: true }

  const share = await Share.findOne({ document: documentId, sharedWith: userId })
  if (!share) return null

  const sharedDocument = await Document.findOne({
    _id: documentId,
    owner: share.owner,
    isDeleted: false,
  }).select('+storageKey')

  return sharedDocument
    ? { document: sharedDocument, permission: share.permission, isOwner: false }
    : null
}