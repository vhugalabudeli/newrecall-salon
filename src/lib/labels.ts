import type {
  BookingStatus,
  Client,
  ContactStatus,
  RecallLead,
  ServiceType,
} from '../types'

type GuestIdentity = Pick<Client, 'relationship' | 'guestName' | 'clientName'>

export function isSamePerson(client: GuestIdentity) {
  return (
    client.relationship === 'self' ||
    client.guestName.trim().toLowerCase() ===
      client.clientName.trim().toLowerCase()
  )
}

export function guestSubtitle(client: GuestIdentity) {
  if (isSamePerson(client)) return null
  return `for ${client.guestName}`
}

/** Default weeks when no remembered lifespan applies. */
export const DEFAULT_LIFESPAN_WEEKS = 6

export const DEFAULT_SERVICE_TYPE: ServiceType = 'hair'

export const BUILTIN_SERVICE_TYPES: { id: ServiceType; name: string }[] = [
  { id: 'hair', name: 'Hair' },
  { id: 'nail', name: 'Nail' },
  { id: 'waxing', name: 'Waxing' },
  { id: 'eyelash', name: 'Eyelash' },
  { id: 'massage', name: 'Massage' },
  { id: 'tanning', name: 'Tanning' },
  { id: 'facials', name: 'Facials' },
]

export function clientServiceType(
  client: Pick<Client, 'serviceType'>,
): ServiceType {
  return client.serviceType?.trim() || DEFAULT_SERVICE_TYPE
}

export const recallLeadLabels: Record<RecallLead, string> = {
  on_the_day: 'On the day it lapses',
  day_before: '1 day before it lapses',
  week_before: '1 week before it lapses',
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  not_yet_booked: 'Not yet responded',
  acknowledged: 'Acknowledged',
  booked: 'Booked',
  declined: 'Declined',
}

export const contactStatusLabels: Record<ContactStatus, string> = {
  not_yet_contacted: 'Not yet contacted',
  contacted_unreachable: 'Contacted but unreachable',
  contacted: 'Contacted',
}

export const weekPreviewLabels = [
  'This week',
  'Next week',
  '2 weeks ahead',
  '3 weeks ahead',
]

export const monthPreviewLabels = [
  'This month',
  'Next month',
  '2 months ahead',
]

export const recallLeads: RecallLead[] = [
  'on_the_day',
  'day_before',
  'week_before',
]

export const bookingStatuses: BookingStatus[] = [
  'not_yet_booked',
  'acknowledged',
  'booked',
  'declined',
]

export const contactStatuses: ContactStatus[] = [
  'not_yet_contacted',
  'contacted_unreachable',
  'contacted',
]

export const lifespanWeekOptions = Array.from(
  { length: 15 },
  (_, index) => index + 2,
)
