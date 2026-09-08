export const APP_BASE = '/app'

export const paths = {
  landing: '/',
  thankYou: '/thank-you',
  login: '/login',
  register: '/register',
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
  pricing: '/pricing',
  subscribe: '/subscribe',
  admin: '/admin',
  dashboard: APP_BASE,
  clients: `${APP_BASE}/clients`,
  calendar: `${APP_BASE}/calendar`,
  calendarDay: (offset: number | string) => `${APP_BASE}/calendar/${offset}`,
  settings: `${APP_BASE}/settings`,
  serviceTypes: `${APP_BASE}/settings/service-types`,
  serviceType: (id: string) =>
    `${APP_BASE}/settings/service-types/${encodeURIComponent(id)}`,
} as const
