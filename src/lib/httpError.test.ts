import { describe, expect, it } from 'vitest'
import { requestErrorStatus } from '../../api/_lib/httpError'

describe('requestErrorStatus', () => {
  it('returns 401 when authentication is missing or invalid', () => {
    expect(requestErrorStatus(new Error('Sign in required.'))).toBe(401)
  })

  it('returns 403 when an authenticated user has no salon access', () => {
    expect(requestErrorStatus(new Error('You are not in a salon.'))).toBe(403)
    expect(
      requestErrorStatus(new Error('The owner needs to start the trial.')),
    ).toBe(403)
  })

  it('keeps unexpected failures as server errors', () => {
    expect(requestErrorStatus(new Error('Redis unavailable'))).toBe(500)
    expect(requestErrorStatus('unknown')).toBe(500)
  })
})
