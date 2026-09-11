import type { SalonRole } from './auth'

export const OPEN_WELCOME_EVENT = 'newrecall:open-welcome'

export function openWelcomeGuide() {
  window.dispatchEvent(new Event(OPEN_WELCOME_EVENT))
}

export function welcomeCopy(role: SalonRole, salonName: string) {
  if (role === 'owner') {
    return {
      eyebrow: 'GETTING STARTED',
      title: 'Welcome to NewRecall',
      body: `Set up ${salonName}, invite your team, and add clients to start tracking follow-ups.`,
    }
  }
  return {
    eyebrow: 'WELCOME TO THE TEAM',
    title: `Welcome to ${salonName}`,
    body: 'You share this salon’s clients, services, and follow-ups. Your access is included with the owner’s subscription.',
  }
}
