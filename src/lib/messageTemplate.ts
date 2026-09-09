import { differenceInCalendarWeeks, startOfDay } from 'date-fns'
import {
  clientCallingCode,
  formatClientPhone,
  internationalDigits,
} from './callingCode'
import { isSamePerson } from './labels'
import { readSalonName } from './settings'
import { formatLifespan, parseVisitDate } from './schedule'
import type { Client } from '../types'

export const DEFAULT_MESSAGE_TEMPLATE = `Hi {{contact_name}}, it may be time for {{book_who}} to book another {{service_name}} appointment. We’d love to see you again.

{{company_name}}`

type PhoneBits = Pick<Client, 'clientPhone' | 'clientPhoneCode'>

export type MessageTemplateVars = {
  contact_name: string
  x_time: string
  service_name: string
  company_name: string
  contact_number: string
  whose_visit: string
  book_who: string
  guest_name: string
}

type GuestIdentity = Pick<Client, 'clientName' | 'guestName' | 'relationship'>

function givenName(full: string): string {
  const trimmed = full.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] ?? trimmed
}

function possessive(name: string): string {
  if (/s$/i.test(name)) return `${name}'`
  return `${name}'s`
}

/** Wording that changes for a self booking vs a guest. */
export function guestAwarePhrases(client: GuestIdentity): {
  whose_visit: string
  book_who: string
  guest_name: string
} {
  if (isSamePerson(client)) {
    return {
      whose_visit: 'your last',
      book_who: 'you',
      guest_name: client.clientName.trim(),
    }
  }

  const full = client.guestName.trim()
  if (!full) {
    return {
      whose_visit: 'their last',
      book_who: 'them',
      guest_name: '',
    }
  }

  const short = givenName(full)
  return {
    whose_visit: `${possessive(short)} last`,
    book_who: short,
    guest_name: full,
  }
}

export function timeSinceLastVisit(client: Client, today = new Date()): string {
  const weeks = differenceInCalendarWeeks(
    startOfDay(today),
    parseVisitDate(client.lastVisitDate),
  )
  if (weeks < 1) return formatLifespan(client.lifespanWeeks)
  return formatLifespan(weeks)
}

export function varsForClient(
  client: Client,
  salonName = readSalonName(),
): MessageTemplateVars {
  return {
    contact_name: client.clientName,
    x_time: timeSinceLastVisit(client),
    service_name: client.service,
    company_name: salonName,
    contact_number: formatClientPhone(
      clientCallingCode(client),
      client.clientPhone,
    ),
    ...guestAwarePhrases(client),
  }
}

export function fillMessageTemplate(
  template: string,
  vars: MessageTemplateVars,
): string {
  return template
    .replace(/\{\{\s*contact_name\s*\}\}/gi, vars.contact_name)
    .replace(/\{\{\s*name\s*\}\}/gi, vars.contact_name)
    .replace(/\{\{\s*x_time\s*\}\}/gi, vars.x_time)
    .replace(/\{\{\s*whose_visit\s*\}\}/gi, vars.whose_visit)
    .replace(/\{\{\s*book_who\s*\}\}/gi, vars.book_who)
    .replace(/\{\{\s*guest_name\s*\}\}/gi, vars.guest_name)
    .replace(/\{\{\s*service_name\s*\}\}/gi, vars.service_name)
    .replace(/\{\{\s*service(?:_label|label)?\s*\}\}/gi, vars.service_name)
    .replace(/\{\{\s*company_name\s*\}\}/gi, vars.company_name)
    .replace(/\{\{\s*practice_name\s*\}\}/gi, vars.company_name)
    .replace(/\{\{\s*contact_number\s*\}\}/gi, vars.contact_number)
    .replace(/\{\{\s*practice_phone\s*\}\}/gi, vars.contact_number)
}

function e164Digits(client: PhoneBits): string {
  return internationalDigits(clientCallingCode(client), client.clientPhone)
}

export function smsHref(client: PhoneBits, body: string): string {
  const digits = e164Digits(client)
  const encoded = encodeURIComponent(body)
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  return ios
    ? `sms:+${digits}&body=${encoded}`
    : `sms:+${digits}?body=${encoded}`
}

/** International digits for wa.me (no +). */
export function whatsappPhone(client: PhoneBits): string {
  return e164Digits(client)
}

export function whatsappHref(client: PhoneBits, body: string): string {
  return `https://wa.me/${whatsappPhone(client)}?text=${encodeURIComponent(body)}`
}

export function callHref(client: PhoneBits): string {
  return `tel:+${e164Digits(client)}`
}
