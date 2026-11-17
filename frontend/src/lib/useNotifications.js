import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from './api'
import { supabase } from './supabase'

// Shared notification text & destination link for both the toast and Activity list.
export function formatNotification(n) {
  if (n.kind === 'listing' || n.listingTitle) {
    const isHousing = n.listingCategory === 'housing'
    return {
      title: `${isHousing ? 'New real estate' : 'New listing'}: ${n.listingTitle || (isHousing ? 'Real estate' : 'Marketplace')}`,
      href: n.listing ? (isHousing ? '#/real-estate' : '#/marketplace') : null,
      linkLabel: isHousing ? 'View Real estate' : 'View Marketplace',
    }
  }
  if (n.kind === 'club_event') {
    const club = n.clubName || 'A followed club'
    return {
      title: `${club} posted an event: ${n.clubEventTitle}`,
      href: n.clubEvent ? `#/events/${n.clubEvent}` : null,
      linkLabel: 'View event',
    }
  }
  if (n.kind === 'club_post') {
    const club = n.clubName || 'A followed club'
    const snippet = n.clubPostBody ? `: ${n.clubPostBody}` : ''
    return {
      title: `New update from ${club}${snippet}`,
      href: n.club ? `#/clubs/${n.club}` : null,
      linkLabel: 'View club',
    }
  }
  if (n.kind === 'club_join_request') {
    const club = n.clubName || 'your club'
    return {
      title: `${n.actorName} requested to join ${club}`,
      href: '#/club-studio',
      linkLabel: 'Review in Club Studio',
    }
  }
  if (n.kind === 'club_join_accepted') {
    const club = n.clubName || 'a club'
    return {
      title: `Your request to join ${club} was accepted`,
      href: n.club ? `#/clubs/${n.club}` : null,
      linkLabel: 'View club',
    }
  }
  return { title: `${n.actorName} posted an update`, href: null, linkLabel: '' }
}

// Top-level 15s notification poller shared across Community, Marketplace, and Real estate.
export default function useNotifications(hash) {
  const [signedIn, setSignedIn] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [toast, setToast] = useState(null)
  const lastKeyRef = useRef(null)
  const onActivity = hash.startsWith('#/activity')

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session))
    }).catch(() => {})
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session))
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const load = useCallback((signal) => {
    if (!signedIn) return
    apiRequest('/notifications?limit=30', { signal })
      .then((rows) => {
        setNotifications(rows)
        const latest = rows.find((n) => !n.read)
        const nextKey = latest ? latest.id : ''
        if (lastKeyRef.current !== null && nextKey && nextKey !== lastKeyRef.current) {
          setToast({
            text: formatNotification(latest).title,
            href: onActivity ? null : '#/activity',
          })
        }
        lastKeyRef.current = nextKey
      })
      .catch(() => {})
  }, [signedIn, onActivity])

  useEffect(() => {
    if (!signedIn) {
      setNotifications([])
      setToast(null)
      lastKeyRef.current = null
      return
    }
    const controller = new AbortController()
    load(controller.signal)
    const poll = () => { if (!document.hidden) load(controller.signal) }
    const interval = setInterval(poll, 15000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      controller.abort()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [signedIn, hash, load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  async function markRead(id) {
    await apiRequest(`/notifications/${id}/read`, { method: 'POST' })
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  async function markAllRead() {
    await apiRequest('/notifications/read-all', { method: 'POST' })
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
  }

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    toast,
    dismissToast: () => setToast(null),
    markRead,
    markAllRead,
  }
}
