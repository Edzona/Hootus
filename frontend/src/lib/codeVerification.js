export function codeFormatError(code) {
  return /^\d{6}$/.test(code.trim()) ? '' : 'Enter the six-digit code from your email.'
}

export function verificationErrorMessage(authError) {
  if (authError?.status === 429) return 'Too many attempts. Please wait a minute before trying again.'
  if (authError?.status >= 500 || authError?.name === 'AuthRetryableFetchError') {
    return 'Sign-in is temporarily unavailable. Check your connection and try again.'
  }
  return 'That code is invalid or expired. Check your latest email or request another code.'
}
