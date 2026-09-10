export function requestErrorStatus(error: unknown): number {
  if (!(error instanceof Error)) return 500
  if (error.message === 'Sign in required.') return 401
  if (
    error.message === 'You are not in a salon.' ||
    error.message === 'The owner needs to start the trial.'
  ) {
    return 403
  }
  return 500
}
