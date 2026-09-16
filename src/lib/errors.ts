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

/** Shape of the error object returned by supabase-js for both PostgREST and RPC calls. */
export type SupabaseErrorLike = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

/** Joins the available fields of a Supabase error into a single readable string. */
export function formatSupabaseError(error: SupabaseErrorLike): string {
  const parts = [error.message, error.details, error.hint, error.code ? `(${error.code})` : null]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))

  return parts.length > 0 ? parts.join(' — ') : 'Unexpected database error.'
}

export type SupabaseSetupErrorHints = {
  /** Shown when PostgREST cannot find the RPC function (schema cache / PGRST202). */
  missingFunction: string
  /** Shown when the underlying table is missing (PGRST205). Falls back to missingFunction. */
  missingTable?: string
}

/**
 * Throws a friendly error for the common "migration not run yet" cases (missing RPC
 * function or missing table), otherwise re-throws the formatted Supabase error message.
 * Centralizes the error-shape detection so every feature service does not repeat it.
 */
export function throwSupabaseError(
  error: SupabaseErrorLike,
  hints: SupabaseSetupErrorHints,
): never {
  const message = formatSupabaseError(error)
  const lower = message.toLowerCase()

  const missingFunction =
    error.code === 'PGRST202' ||
    lower.includes('could not find the function') ||
    lower.includes('schema cache')

  if (missingFunction) {
    throw new Error(hints.missingFunction)
  }

  const missingTable = error.code === 'PGRST205' || lower.includes('could not find the table')

  if (missingTable) {
    throw new Error(hints.missingTable ?? hints.missingFunction)
  }

  throw new Error(message)
}
