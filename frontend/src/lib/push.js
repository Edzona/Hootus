import { apiRequest } from './api'

// Browser push: register the service worker, subscribe with the server's
// public VAPID key, and hand the subscription to the backend.

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
    && 'PushManager' in window && 'Notification' in window
}

function keyBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(raw, ch => ch.charCodeAt(0))
}

function sameKey(buffer, base64url) {
  if (!buffer) return false
  const a = new Uint8Array(buffer)
  const b = keyBytes(base64url)
  return a.length === b.length && a.every((value, index) => value === b[index])
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return registration ? registration.pushManager.getSubscription() : null
}

// 'unsupported' | 'unavailable' (server has push off) | 'blocked' | 'off' | 'on'
export async function pushStatus() {
  if (!pushSupported()) return 'unsupported'
  const { publicKey } = await apiRequest('/push/config')
  if (!publicKey) return 'unavailable'
  if (Notification.permission === 'denied') return 'blocked'
  const subscription = await currentSubscription()
  return subscription && Notification.permission === 'granted' ? 'on' : 'off'
}

// Must be called from a click: browsers ignore permission prompts that aren't.
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support notifications.')
  const { publicKey } = await apiRequest('/push/config')
  if (!publicKey) throw new Error('Notifications are not enabled on this server yet.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked for this site. Allow them in your browser settings.'
      : 'Notifications were not turned on.')
  }
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  // A subscription made with old server keys can't receive pushes: replace it.
  if (subscription && !sameKey(subscription.options.applicationServerKey, publicKey)) {
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey),
  })
  await apiRequest('/push/subscriptions', { method: 'POST', body: subscription.toJSON() })
}

export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  await apiRequest('/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } })
  await subscription.unsubscribe()
}
