import { describe, expect, it } from 'vitest'
import { validateInviteCompletion } from './inviteCompletion'

describe('validateInviteCompletion', () => {
  it('requires a name', () => {
    expect(validateInviteCompletion('  ', 'password1', 'password1')).toBe(
      'Enter your name.',
    )
  })

  it('requires an eight-character password', () => {
    expect(validateInviteCompletion('Staff Member', 'short', 'short')).toBe(
      'Use at least 8 characters for the password.',
    )
  })

  it('requires matching passwords', () => {
    expect(
      validateInviteCompletion('Staff Member', 'password1', 'password2'),
    ).toBe('Passwords do not match.')
  })

  it('accepts a complete staff profile', () => {
    expect(
      validateInviteCompletion(' Staff Member ', 'password1', 'password1'),
    ).toBeNull()
  })
})
