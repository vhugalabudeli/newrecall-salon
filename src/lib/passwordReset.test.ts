import { describe, expect, it } from 'vitest'
import {
  loginResetPath,
  validateNewPassword,
  validateResetEmail,
} from './passwordReset'

describe('loginResetPath', () => {
  it('opens forgot-password on the login screen', () => {
    expect(loginResetPath()).toBe('/login?reset=1')
  })
})

describe('validateResetEmail', () => {
  it('requires an email address', () => {
    expect(validateResetEmail('  ')).toBe('Enter a valid email.')
  })

  it('accepts a typical address', () => {
    expect(validateResetEmail('owner@example.com')).toBeNull()
  })
})

describe('validateNewPassword', () => {
  it('requires an eight-character password', () => {
    expect(validateNewPassword('short', 'short')).toBe(
      'Use at least 8 characters for the password.',
    )
  })

  it('requires matching passwords', () => {
    expect(validateNewPassword('password1', 'password2')).toBe(
      'Passwords do not match.',
    )
  })

  it('accepts a matching password', () => {
    expect(validateNewPassword('password1', 'password1')).toBeNull()
  })
})
