import assert from 'node:assert/strict'
import { test } from 'node:test'
import { codeFormatError, verificationErrorMessage } from '../../src/lib/codeVerification.js'

test('codeFormatError accepts six digits with surrounding spaces', () => {
  assert.equal(codeFormatError('123456'), '')
  assert.equal(codeFormatError(' 123456 '), '')
})

test('codeFormatError rejects malformed codes', () => {
  const message = 'Enter the six-digit code from your email.'
  for (const code of ['', '12345', '1234567', '12a456']) assert.equal(codeFormatError(code), message)
})

test('verificationErrorMessage maps auth errors to user messages', () => {
  assert.equal(verificationErrorMessage({ status: 429 }), 'Too many attempts. Please wait a minute before trying again.')
  const unavailable = 'Sign-in is temporarily unavailable. Check your connection and try again.'
  assert.equal(verificationErrorMessage({ status: 500 }), unavailable)
  assert.equal(verificationErrorMessage({ status: 503 }), unavailable)
  assert.equal(verificationErrorMessage({ name: 'AuthRetryableFetchError' }), unavailable)
  const invalid = 'That code is invalid or expired. Check your latest email or request another code.'
  assert.equal(verificationErrorMessage({ status: 400 }), invalid)
  assert.equal(verificationErrorMessage({ status: 422 }), invalid)
  assert.equal(verificationErrorMessage(null), invalid)
  assert.equal(verificationErrorMessage(undefined), invalid)
})
