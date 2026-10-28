import { body, param } from 'express-validator'

export const createShareValidation = [
  body('documentId').isMongoId().withMessage('Document ID is invalid'),
  body('email')
    .optional()
    .isEmail().withMessage('Recipient email is invalid')
    .bail()
    .normalizeEmail(),
  body('sharedWith')
    .optional()
    .isMongoId().withMessage('Recipient user ID is invalid'),
  body('permission')
    .optional()
    .isIn(['viewer', 'editor']).withMessage('Permission must be viewer or editor'),
  body().custom((value) => Boolean(value.email) !== Boolean(value.sharedWith))
    .withMessage('Provide exactly one of email or sharedWith'),
]

export const shareIdValidation = [
  param('id').isMongoId().withMessage('Share ID is invalid'),
]