export type Relationship =
  | 'self'
  | 'father'
  | 'mother'
  | 'sibling'
  | 'spouse'
  | 'child'
  | 'friend'
  | 'other'

export type Service = string

/** Built-in ids like `hair`, or a custom slug from Settings. */
export type ServiceType = string

export type RecallLead = 'on_the_day' | 'day_before' | 'week_before'

export type BookingStatus =
  | 'not_yet_booked'
  | 'acknowledged'
  | 'booked'
  | 'declined'

export type ContactStatus =
  | 'not_yet_contacted'
  | 'contacted_unreachable'
  | 'contacted'

export type NoteRelatedTo = 'booking' | 'contact' | 'general'

export type NoteVersion = {
  text: string
  /** When this wording was saved. */
  at: string
}

export type Note = {
  id: string
  text: string
  createdAt: string
  editedAt?: string
  versions?: NoteVersion[]
  relatedTo: NoteRelatedTo
  statusValue?: BookingStatus | ContactStatus
  previousStatusValue?: BookingStatus | ContactStatus
}

export type Client = {
  id: string
  clientName: string
  clientPhone: string
  /** ITU calling code, digits only (e.g. "27"). Missing on older IndexedDB rows. */
  clientPhoneCode?: string
  guestName: string
  relationship: Relationship
  /** Missing on older IndexedDB rows; treat as hair. */
  serviceType?: ServiceType
  service: Service
  lastVisitDate: string
  lifespanWeeks: number
  recallLead: RecallLead
  bookingStatus: BookingStatus
  contactStatus: ContactStatus
  notes: Note[]
  createdAt: string
  updatedAt: string
}

export type ClientDraft = {
  clientName: string
  clientPhone: string
  clientPhoneCode: string
  guestName: string
  guestIsClient: boolean
  relationship: Relationship
  serviceType: ServiceType
  service: Service
  lastVisitDate: string
  lifespanWeeks: number
  recallLead: RecallLead
}
