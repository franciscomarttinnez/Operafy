export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage
    }

    const maybeDetails = (error as { details?: unknown }).details
    if (typeof maybeDetails === 'string' && maybeDetails.trim().length > 0) {
      return maybeDetails
    }
  }

  return fallback
}
