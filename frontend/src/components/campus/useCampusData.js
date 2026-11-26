import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { CampusAction } from '../../../../backend/src/types/campusAction'
import { emptyCampus, normalizeCampus } from './campusData'

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
          const next = normalizeCampus(await apiRequest('/campus?limit=100', { signal: controller.signal }))
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
  const snapshot = hasData ? data : emptyCampus
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
