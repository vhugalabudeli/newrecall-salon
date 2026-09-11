import { describe, expect, it } from 'vitest'
import {
  dueToday,
  futureRecallMonthSummaries,
  isOnDueList,
  overdueClients,
  todayIso,
} from './schedule'
import type { Client } from '../types'

function client(overrides: Partial<Client>): Client {
  return {
    id: '1',
    clientName: 'Test Client',
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
    ...overrides,
  }
}

describe('isOnDueList', () => {
  it('is true when contact is open and not yet responded', () => {
    expect(
      isOnDueList(client({ contactStatus: 'not_yet_contacted' })),
    ).toBe(true)
    expect(
      isOnDueList(client({ contactStatus: 'contacted_unreachable' })),
    ).toBe(true)
  })

  it('is false when contacted or when a response is set', () => {
    expect(isOnDueList(client({ contactStatus: 'contacted' }))).toBe(false)
    expect(
      isOnDueList(
        client({
          contactStatus: 'not_yet_contacted',
          bookingStatus: 'booked',
        }),
      ),
    ).toBe(false)
  })
})

describe('dueToday and overdueClients', () => {
  const today = new Date(2026, 8, 8) // 8 Sep 2026

  it('lists open clients whose recall is today', () => {
    // last visit 8 weeks before today with on_the_day lead → recall = today
    const due = client({
      id: 'due',
      lastVisitDate: '2026-07-14',
      lifespanWeeks: 8,
      recallLead: 'on_the_day',
    })
    const future = client({
      id: 'future',
      lastVisitDate: '2026-07-21',
      lifespanWeeks: 8,
      recallLead: 'on_the_day',
    })
    const cleared = client({
      id: 'cleared',
      lastVisitDate: '2026-07-14',
      lifespanWeeks: 8,
      contactStatus: 'contacted',
    })

    expect(dueToday([due, future, cleared], today).map((c) => c.id)).toEqual([
      'due',
    ])
  })

  it('lists open clients whose recall is before today', () => {
    const overdue = client({
      id: 'overdue',
      lastVisitDate: '2026-07-01',
      lifespanWeeks: 8,
      recallLead: 'on_the_day',
    })
    const due = client({
      id: 'due',
      lastVisitDate: '2026-07-14',
      lifespanWeeks: 8,
      recallLead: 'on_the_day',
    })

    expect(overdueClients([overdue, due], today).map((c) => c.id)).toEqual([
      'overdue',
    ])
  })

  it('formats today as ISO date', () => {
    expect(todayIso(today)).toBe('2026-09-08')
  })
})

describe('futureRecallMonthSummaries', () => {
  it('includes scheduled follow-ups beyond three months', () => {
    const today = new Date(2026, 0, 1)
    const later = client({
      id: 'later',
      lastVisitDate: '2026-05-01',
      lifespanWeeks: 8,
    })

    const months = futureRecallMonthSummaries([later], today)

    expect(months).toHaveLength(1)
    expect(months[0]?.clients.map((item) => item.id)).toEqual(['later'])
    expect(months[0]?.offset).toBeGreaterThan(2)
  })

  it('does not include past follow-ups', () => {
    const today = new Date(2026, 8, 8)
    const past = client({ lastVisitDate: '2026-01-01', lifespanWeeks: 2 })

    expect(futureRecallMonthSummaries([past], today)).toEqual([])
  })
})
