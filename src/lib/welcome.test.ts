import { describe, expect, it } from 'vitest'
import { welcomeCopy } from './welcome'

describe('welcomeCopy', () => {
  it('guides owners through initial salon setup', () => {
    const copy = welcomeCopy('owner', 'Perfect Look')
    expect(copy.title).toBe('Welcome to NewRecall')
    expect(copy.body).toContain('invite your team')
  })

  it('explains shared access to staff', () => {
    const copy = welcomeCopy('staff', 'Perfect Look')
    expect(copy.title).toBe('Welcome to Perfect Look')
    expect(copy.body).toContain('owner’s subscription')
  })
})
