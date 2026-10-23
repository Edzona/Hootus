import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { CampusAction } from '../../../../backend/src/types/campusAction'

const empty = { clubs: [], events: [], posts: [], savedPosts: [], listings: [] }
const tokyo = { timeZone: 'Asia/Tokyo' }
const formatDate = (value, options) => new Intl.DateTimeFormat('en-US', { ...tokyo, ...options }).format(new Date(value))

function postTime(value) {
  const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(value)) / 60000))
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr`
  return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`
}

function normalize(data) {
  for (const key of Object.keys(empty)) {
    if (!Array.isArray(data?.[key])) throw new Error('Campus data could not be loaded. Please try again.')
  }
  const post = (item) => ({ ...item, time: postTime(item.createdAt) })
  return {
    ...data,
    posts: data.posts.map(post),
    savedPosts: data.savedPosts.map(post),
    events: data.events.map(event => ({
      ...event,
      day: formatDate(event.startsAt, { day: '2-digit' }),
      month: formatDate(event.startsAt, { month: 'short' }),
      date: formatDate(event.startsAt, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: `${formatDate(event.startsAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}–${formatDate(event.endsAt, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`,
    })),
    listings: data.listings.map(listing => ({
      ...listing, kind: listing.category === 'housing' ? 'housing' : 'market',
      label: listing.category === 'housing' ? 'Housing' : 'Marketplace',
      price: listing.priceJpy === null ? 'Ask for price' : `${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(listing.priceJpy)}${listing.category === 'housing' ? ' / month' : ''}`,
      detail: listing.description, color: listing.category === 'housing' ? 'forest' : 'gold',
    })),
  }
}

export default function useCampusData() {
  const [userId, setUserId] = useState(undefined)
  const [data, setData] = useState(null)
  const [revealed, setRevealed] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const refreshRef = useRef(null)
  const controllerRef = useRef(null)
  const mutationRef = useRef(false)

  useEffect(() => {
    if (!supabase) { setUserId(null); return }
    let active = true
    let authEventSeen = false
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true
      if (active) setUserId(session?.user.id ?? null)
    })
    supabase.auth.getSession().then(({ data: authData, error: authError }) => {
      if (!active || authEventSeen) return
      if (authError) setError(authError.message)
      setUserId(authData.session?.user.id ?? null)
    }).catch(() => { if (active && !authEventSeen) { setUserId(null); setError('Sign-in could not be checked. Please sign in again.') } })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    setData(null)
    setRevealed([])
    setNotice('')
    setBusy(false)
    setError('')
    mutationRef.current = false
    if (!userId) return
    const controller = new AbortController()
    controllerRef.current = controller
    let initial = true
    let request = Promise.resolve()
    // Serialize refreshes so a slower poll cannot overwrite a completed action.
    const refresh = (reveal = false) => {
      request = request.catch(() => {}).then(async () => {
        if (controller.signal.aborted) return
        try {
          const next = normalize(await apiRequest('/campus?limit=100', { signal: controller.signal }))
          if (controller.signal.aborted) return
          setData({ ...next, ownerId: userId })
          if (initial || reveal) setRevealed(next.posts.map(post => post.id))
          initial = false
          setError('')
          return next
        } catch (err) {
          if (!controller.signal.aborted) { setError(err.message); if (err.status === 401 || err.status === 403) setData(null) }
        }
      })
      return request
    }
    refreshRef.current = refresh
    refresh()
    const poll = () => { if (!document.hidden && !mutationRef.current) refresh() }
    const interval = setInterval(poll, 15000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      controller.abort()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
      refreshRef.current = null
    }
  }, [userId])

  const mutate = useCallback(async (path, body, message, reveal = false) => {
    if (mutationRef.current || !controllerRef.current || controllerRef.current.signal.aborted) return false
    mutationRef.current = true
    setBusy(true)
    const signal = controllerRef.current.signal
    try {
      await apiRequest(path, { method: path.startsWith('/campus/actions/') ? 'PUT' : 'POST', body, signal })
      if (signal.aborted) return false
      const fresh = await refreshRef.current?.(reveal)
      if (!signal.aborted) setNotice(fresh ? message : `${message} Refresh the page to see the latest state.`)
      return true
    } catch (err) {
      if (!signal.aborted) setNotice(`Change not saved. ${err.message}`)
      return false
    } finally {
      if (!signal.aborted) { mutationRef.current = false; setBusy(false) }
    }
  }, [])

  const hasData = !!data && data.ownerId === userId
  const snapshot = hasData ? data : empty
  const allPosts = [...snapshot.posts, ...snapshot.savedPosts.filter(post => !snapshot.posts.some(item => item.id === post.id))]
  const act = (action, id, active, message) => mutate(`/campus/actions/${action}/${id}`, { active }, message)
  return {
    ...snapshot,
    posts: snapshot.posts.filter(post => revealed.includes(post.id)),
    allPosts,
    following: snapshot.clubs.filter(club => club.following).map(club => club.id),
    attending: snapshot.events.filter(event => event.attending).map(event => event.id),
    saved: snapshot.savedPosts.map(post => post.id),
    liked: allPosts.filter(post => post.liked).map(post => post.id),
    incomingCount: snapshot.posts.filter(post => !revealed.includes(post.id)).length,
    incomingClubIds: snapshot.posts.filter(post => !revealed.includes(post.id)).map(post => post.club),
    revealPosts: () => setRevealed(snapshot.posts.map(post => post.id)),
    follow: id => { const club = snapshot.clubs.find(club => club.id === id); return club && act(CampusAction.Follow, id, !club.following, club.following ? `Unfollowed ${club.name}.` : `Following ${club.name}.`) },
    save: id => act(CampusAction.Save, id, !snapshot.savedPosts.some(post => post.id === id), 'Saved posts updated.'),
    like: id => act(CampusAction.Like, id, !allPosts.find(post => post.id === id)?.liked, 'Like updated.'),
    rsvp: id => act(CampusAction.Rsvp, id, !snapshot.events.find(event => event.id === id)?.attending, 'Your RSVP has been updated.'),
    publish: (clubId, body) => mutate(`/campus/clubs/${clubId}/posts`, body, 'Club update published.', true),
    refresh: () => refreshRef.current?.(),
    loading: userId === undefined || !!userId && !hasData && !error,
    signInRequired: userId === null,
    hasData, busy, error, notice, setNotice,
  }
}
