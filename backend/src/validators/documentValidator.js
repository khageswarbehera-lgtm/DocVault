import { param, query, body } from 'express-validator'

export const documentIdValidation = [
  param('id').isMongoId().withMessage('Document ID is invalid'),
]

export const documentListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
]

export const renameDocumentValidation = [
  ...documentIdValidation,
  body('name')
    .isString().withMessage('Name is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),
]

export const moveDocumentValidation = [
  ...documentIdValidation,
  body('folderId')
    .exists().withMessage('folderId is required; use null to move to the root')
    .bail()
    .custom((value) => value === null || (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)))
    .withMessage('Folder ID is invalid'),
]

export const searchDocumentsValidation = [
  query('q')
    .isString().withMessage('Search query is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Search query must be between 1 and 200 characters'),
  ...documentListValidation,
]