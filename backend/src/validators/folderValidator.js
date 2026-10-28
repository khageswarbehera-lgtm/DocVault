import { body, param, query } from 'express-validator'

const isOptionalFolderId = (value) => value === null
  || (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value))

export const folderIdValidation = [
  param('id').isMongoId().withMessage('Folder ID is invalid'),
]

export const folderListValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),
]

export const createFolderValidation = [
  body('name')
    .isString().withMessage('Name is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('parentFolder')
    .optional({ nullable: true })
    .custom(isOptionalFolderId)
    .withMessage('Parent folder ID is invalid'),
]

export const updateFolderValidation = [
  ...folderIdValidation,
  body().custom((value) => value && typeof value === 'object'
    && (Object.hasOwn(value, 'name') || Object.hasOwn(value, 'parentFolder')))
    .withMessage('Provide a folder name or parentFolder'),
  body('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('parentFolder')
    .optional({ nullable: true })
    .custom(isOptionalFolderId)
    .withMessage('Parent folder ID is invalid'),
]