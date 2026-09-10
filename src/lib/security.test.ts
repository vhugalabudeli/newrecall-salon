import { afterEach, describe, expect, it } from 'vitest'
import { verifyTotpCode } from '../../api/_lib/adminAuth'
import { isSameOrigin } from '../../api/_lib/adminHttp'

const originalSecret = process.env.ADMIN_TOTP_SECRET

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_TOTP_SECRET
  else process.env.ADMIN_TOTP_SECRET = originalSecret
})

describe('admin security', () => {
  it('verifies a standards-based TOTP code within the current time step', () => {
    process.env.ADMIN_TOTP_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    expect(verifyTotpCode('287082', 59_000)).toBe(true)
    expect(verifyTotpCode('000000', 59_000)).toBe(false)
  })

  it('requires the request origin to match the deployment host', () => {
    expect(isSameOrigin('https://salon.newrecall.com', 'salon.newrecall.com')).toBe(true)
    expect(isSameOrigin('https://attacker.example', 'salon.newrecall.com')).toBe(false)
    expect(isSameOrigin(undefined, 'salon.newrecall.com')).toBe(false)
  })
})
