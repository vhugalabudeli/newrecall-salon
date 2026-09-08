import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  claimAlertSentDay,
  clearAlertSentDay,
  writeAlertSnapshot,
} from './alertSnapshot'
import { dueTodayBody, overdueBody, sendOnce } from './recallAlerts'
import type { Client } from '../types'

vi.mock('./notifications', () => ({
  ensureNotificationPermission: vi.fn(async () => 'granted'),
  registerRecallPeriodicSync: vi.fn(async () => false),
  triggerLocalNotification: vi.fn(async () => 'sent'),
}))

import { triggerLocalNotification } from './notifications'

function client(name: string): Client {
  return {
    id: name,
    clientName: name,
    clientPhone: '5550100',
    clientPhoneCode: '27',
    guestName: '',
    relationship: 'self',
    serviceType: 'hair',
    service: 'Cut',
    lastVisitDate: '2026-01-01',
    lifespanWeeks: 8,
    recallLead: 'on_the_day',
    bookingStatus: 'not_yet_booked',
    contactStatus: 'not_yet_contacted',
    notes: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('alert message bodies', () => {
  it('describes due today clients', () => {
    expect(dueTodayBody([])).toBe('No recalls due today.')
    expect(dueTodayBody([client('Aisha')])).toBe('Aisha is due today.')
    expect(dueTodayBody([client('Aisha'), client('Bo')])).toBe(
      'Aisha and Bo are due today.',
    )
    expect(
      dueTodayBody([client('Aisha'), client('Bo'), client('Chris')]),
    ).toBe('Aisha and 2 others are due today.')
  })

  it('describes overdue clients', () => {
    const today = new Date(2026, 8, 8)
    const overdue = {
      ...client('Naledi'),
      lastVisitDate: '2026-07-01',
      lifespanWeeks: 8,
    }
    expect(overdueBody([], today)).toBe('No overdue recalls.')
    expect(overdueBody([overdue], today)).toMatch(/Naledi is .+ overdue/)
    expect(overdueBody([overdue, client('Other')], today)).toMatch(
      /2 overdue recalls/,
    )
  })
})

describe('alert once-per-day dedupe', () => {
  beforeEach(async () => {
    vi.mocked(triggerLocalNotification).mockClear()
    await writeAlertSnapshot({
      prefs: { dueToday: true, overdue: true },
      day: '2026-09-08',
      dueToday: {
        title: 'Due today',
        body: 'Aisha is due today.',
        tag: 'salon-due-today',
      },
      overdue: null,
      dueTodaySentDay: null,
      overdueSentDay: null,
      iconUrl: '/favicon.svg',
      openUrl: '/app',
    })
  })

  it('claims a day once', async () => {
    expect(await claimAlertSentDay('dueToday', '2026-09-08')).toBe(true)
    expect(await claimAlertSentDay('dueToday', '2026-09-08')).toBe(false)
    await clearAlertSentDay('dueToday')
    expect(await claimAlertSentDay('dueToday', '2026-09-08')).toBe(true)
  })

  it('sendOnce only triggers one notification per day', async () => {
    const payload = {
      title: 'Due today',
      body: 'Aisha is due today.',
      tag: 'salon-due-today',
    }
    expect(await sendOnce('dueToday', '2026-09-08', payload)).toBe('sent')
    expect(await sendOnce('dueToday', '2026-09-08', payload)).toBeNull()
    expect(triggerLocalNotification).toHaveBeenCalledTimes(1)
  })
})
