import { body } from 'express-validator'

const email = body('email')
  .isString().withMessage('Email is required')
  .bail()
  .trim()
  .toLowerCase()
  .isEmail().withMessage('Enter a valid email address')
  .isLength({ max: 254 }).withMessage('Email must be 254 characters or fewer')

const password = body('password')
  .isString().withMessage('Password is required')
  .bail()
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
  .withMessage('Password must be no more than 72 bytes')

export const registerValidation = [
  body('name')
    .isString().withMessage('Name is required')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  email,
  password,
]

export const loginValidation = [
  email,
  body('password')
    .isString().withMessage('Password is required')
    .bail()
    .isLength({ min: 1, max: 72 }).withMessage('Password is invalid')
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('Password is invalid'),
]