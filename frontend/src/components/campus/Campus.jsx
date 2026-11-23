import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import Icon from './Icon'
import ClubStudio from './ClubStudio'
import Profile from '../Profile'
import { apiRequest } from '../../lib/api'
import { formatNotification } from '../../lib/useNotifications'
import ReportButton from '../ReportButton'
import useCampusData from './useCampusData'
import { ModerationTarget } from '../../../../backend/src/types/domain'
import './campus.css'

function Avatar({ club = { color: 'plum', mark: '✳' }, large = false }) {
  return <span className={`campus-avatar tone-${club.color}${large ? ' avatar-large' : ''}`} aria-hidden="true">{club.mark}</span>
}

function Poster({ event, small = false }) {
  const { clubById } = useContext(CampusContext)
  return (
    <div className={`campus-poster poster-${event.poster}${small ? ' poster-small' : ''}`}>
      <div className="poster-top"><span>{clubById(event.club)?.name || 'Campus club'}</span><span>{event.month} {event.day}</span></div>
      <div className="poster-art" aria-hidden="true">
        {event.poster === 'film' ? <><span className="film-orbit orbit-one" /><span className="film-orbit orbit-two" /><span className="film-orbit orbit-three" /></> : event.poster === 'photo' ? <><span className="photo-frame" /><span className="photo-dot" /></> : <><span className="mountain mountain-back" /><span className="mountain" /><span className="hike-sun" /></>}
      </div>
      <p className="poster-title">{event.title}</p>
      <div className="poster-bottom"><span>{event.type}</span><span>{event.time.split('–')[0]} <span aria-hidden="true">↗</span></span></div>
    </div>
  )
}

const navigation = [
  { label: 'Home', icon: 'home', path: '/dashboard' },
  { label: 'Activity', icon: 'activity', path: '/activity' },
  { label: 'Saved', icon: 'save', path: '/saved' },
  { label: 'Club Studio', icon: 'clubs', path: '/club-studio' },
]

const feedTabs = [
  ['discover', 'For you'],
  ['following', 'Following'],
  ['events-offers', 'Events & Offers'],
]

const hubNav = [
  { label: 'Community', path: '/dashboard' },
  { label: 'Marketplace', path: '/marketplace' },
  { label: 'Real estate', path: '/real-estate' },
]

const CampusContext = createContext(null)

function FollowButton({ club, compact = false }) {
  const { following, follow, busy } = useContext(CampusContext)
  const active = following.includes(club.id)
  return <button type="button" className={`${compact ? 'campus-follow' : 'campus-button'} ${active ? 'is-following' : ''}`} aria-pressed={active} aria-label={`${active ? 'Unfollow' : 'Follow'} ${club.name}`} disabled={busy} onClick={() => follow(club.id)}>{active && <Icon name="check" size={14} />}{active ? 'Following' : 'Follow'}</button>
}

function EventSummary({ event }) {
  return (
    <div className="event-summary">
      <div>
        <span className="campus-caption">{event.type}</span>
        <a className="event-title" href={`#/events/${event.id}`}>{event.title}</a>
        <p><Icon name="calendar" size={14} />{event.month} {event.day}, {event.time.split('–')[0]}<span className="event-summary-price">{event.price}</span></p>
      </div>
      <a href={`#/events/${event.id}`} className="campus-follow">Details <Icon name="arrow" size={14} /></a>
    </div>
  )
}

function PhotoGrid({ urls, label }) {
  if (!urls?.length) return null
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {urls.map((url, idx) => (
        <img key={url} src={url} alt={`${label} ${idx + 1}`} className="h-44 w-full rounded-lg border border-[#ebe7e4] object-cover" />
      ))}
    </div>
  )
}

function Post({ post }) {
  const { liked, toggleLiked, saved, save, clubById, eventById, busy, setNotice } = useContext(CampusContext)
  const club = clubById(post.club)
  if (!club) return null
  const event = post.event && eventById(post.event)
  return <article className="campus-post">
    <div className="post-identity"><a href={`#/clubs/${club.id}`} aria-label={`${club.name} profile`}><Avatar club={club} /></a><div><a href={`#/clubs/${club.id}`} className="post-author">{club.name}</a><span className="post-handle">@{club.handle}</span></div><span className="post-time">{post.time} ago</span></div>
    <p className="post-text">{post.text}</p>
    <PhotoGrid urls={post.imageUrls} label={club.name} />
    {event && <div className="post-event"><a className="poster-link" href={`#/events/${event.id}`} aria-label={`View ${event.title}`}><Poster event={event} /></a><EventSummary event={event} /></div>}
    <div className="post-actions"><button type="button" aria-pressed={liked.includes(post.id)} className={liked.includes(post.id) ? 'is-liked' : ''} aria-label={`${liked.includes(post.id) ? 'Unlike' : 'Like'} post by ${club.name}`} disabled={busy} onClick={() => toggleLiked(post.id)}><Icon name="heart" size={18} />{post.likes}</button><button type="button" aria-pressed={saved.includes(post.id)} className={saved.includes(post.id) ? 'is-saved' : ''} disabled={busy} onClick={() => save(post.id)}><Icon name="save" size={17} />{saved.includes(post.id) ? 'Saved' : 'Save'}</button><a href={`#/clubs/${club.id}`}>Visit club<Icon name="arrow" size={15} /></a><ReportButton kind={ModerationTarget.ClubPost} id={post.id} onNotice={setNotice} className="report-action" /></div>
  </article>
}

function Empty({ heading, children }) {
  return <div className="campus-empty"><span className="empty-symbol" aria-hidden="true">✳</span><h2>{heading}</h2><p>{children}</p></div>
}

function ClubDirectory() {
  const { visibleClubs, category, setCategory } = useContext(CampusContext)
  return <section className="club-directory" aria-label="Club directory"><div className="section-line"><h2>Find your people</h2><span>{visibleClubs.length} {visibleClubs.length === 1 ? 'club' : 'clubs'}</span></div><div className="category-chips" aria-label="Filter clubs by interest">{['All', 'Arts & culture', 'Outdoors', 'Careers', 'Music'].map((item) => <button type="button" key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="club-directory-grid">{visibleClubs.map((club) => <article className="directory-club" key={club.id}><a href={`#/clubs/${club.id}`} className="directory-club-link"><Avatar club={club} /><strong>{club.name}</strong><span>{club.category}</span></a><FollowButton club={club} compact /></article>)}</div>{!visibleClubs.length && <p className="inline-empty">No clubs match. Try another interest or search.</p>}</section>
}

function PostComposer({ clubId }) {
  const { clubs, events, publish, busy } = useContext(CampusContext)
  const available = clubs.filter(club => club.canPost && (!clubId || club.id === clubId))
  const [choice, setChoice] = useState('')
  const [text, setText] = useState('')
  const [eventId, setEventId] = useState('')
  const selected = available.find(club => club.id === choice) || available[0]
  if (!selected) return null
  async function submit(event) {
    event.preventDefault()
    if (!text.trim()) return
    if (await publish(selected.id, { text: text.trim(), ...(eventId ? { eventId } : {}) })) {
      setText('')
      setEventId('')
    }
  }
  return <form className="campus-composer" onSubmit={submit}>
    <div className="section-line"><h2>Share a club update</h2><span>Posting as {selected.name}</span></div>
    {!clubId && <label>Club<select value={selected.id} onChange={event => { setChoice(event.target.value); setEventId('') }} disabled={busy}>{available.map(club => <option value={club.id} key={club.id}>{club.name}</option>)}</select></label>}
    <label><span className="sr-only">Your club update</span><textarea value={text} onChange={event => setText(event.target.value)} placeholder="What’s happening with your club?" maxLength={10000} required disabled={busy} /></label>
    <div className="composer-bottom"><label><span className="sr-only">Attach a club event</span><select value={eventId} onChange={event => setEventId(event.target.value)} disabled={busy}><option value="">No event attached</option>{events.filter(event => event.club === selected.id).map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><button className="campus-button" type="submit" disabled={busy || !text.trim()}>{busy ? 'Saving…' : 'Publish update'}</button></div>
  </form>
}

export default function Campus({ hash, notif }) {
  const path = hash.slice(1).split('?')[0]
  const campus = useCampusData()
  const { clubs, events, posts, savedPosts, following, saved, liked,
    follow, save, like: toggleLiked, busy, notice, setNotice, incomingCount, revealPosts } = campus
  const [profile, setProfile] = useState(null)
  const [offers, setOffers] = useState([])
  const [tab, setTab] = useState('discover')
  const notifications = notif?.notifications ?? []
  const unreadCount = notif?.unreadCount ?? 0
  const initials = (profile?.full_name || 'TUJ Student').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')
  const userAvatarUrl = profile?.avatar_url
  const userInitials = profile ? initials : 'You'
  const userName = profile?.full_name || 'Your profile'
  const loadOffers = useCallback(async (signal) => {
    try {
      const rows = await apiRequest('/feed?limit=30', { signal })
      setOffers(rows.filter(item => item.kind === 'perk'))
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    if (campus.signInRequired || !campus.hasData) { setProfile(null); setOffers([]); return }
    const controller = new AbortController()
    apiRequest('/profile/me', { signal: controller.signal })
      .then(setProfile)
      .catch(() => {})
    loadOffers(controller.signal)
    return () => controller.abort()
  }, [campus.signInRequired, campus.hasData, loadOffers])

  useEffect(() => {
    if (tab === 'events-offers' && !campus.signInRequired && campus.hasData) loadOffers()
  }, [tab, campus.signInRequired, campus.hasData, loadOffers])

  const clubById = (id) => clubs.find(club => club.id === id || club.slug === id)
  const eventById = (id) => events.find(event => event.id === id || event.slug === id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const mainRef = useRef(null)
  const previousPath = useRef(path)
  const isClubDetail = path.startsWith('/clubs/')
  const isEventDetail = path.startsWith('/events/')
  const selectedClub = isClubDetail ? clubById(path.split('/')[2]) : null
  const selectedEvent = isEventDetail ? eventById(path.split('/')[2]) : null
  async function requestJoinClub(club) {
    try {
      await apiRequest(`/campus/clubs/${club.id}/membership`, { method: 'POST' })
      setNotice(`Join request sent to ${club.name}.`)
      await campus.refresh()
    } catch (err) {
      setNotice(err.message)
    }
  }

  async function leaveClub(club) {
    try {
      await apiRequest(`/campus/clubs/${club.id}/membership`, { method: 'DELETE' })
      setNotice(club.membershipStatus === 'pending' ? 'Join request cancelled.' : `Left ${club.name}.`)
      await campus.refresh()
    } catch (err) {
      setNotice(err.message)
    }
  }

  const title = selectedClub?.name || selectedEvent?.type || (path === '/profile' ? 'Profile' : path === '/club-studio' ? 'Club Studio' : null) || hubNav.find((item) => item.path === path)?.label || navigation.find((item) => item.path === path)?.label || 'Community'

  useEffect(() => {
    document.title = `${title} · HUS Campus`
    if (previousPath.current !== path) {
      setQuery('')
      setNotice('')
      window.scrollTo({ top: 0, behavior: 'instant' })
      mainRef.current?.focus({ preventScroll: true })
      previousPath.current = path
    }
  }, [path, title, setNotice])

  async function markNotificationRead(id) {
    try {
      await notif?.markRead(id)
    } catch (err) {
      setNotice(err.message)
    }
  }

  async function markAllRead() {
    try {
      await notif?.markAllRead()
    } catch (err) {
      setNotice(err.message)
    }
  }

  async function toggleEmailDigest() {
    if (!profile) return
    const next = !profile.email_digest
    try {
      const updated = await apiRequest('/profile/me', { method: 'PATCH', body: { email_digest: next } })
      setProfile(updated)
      setNotice(next ? 'Daily listing digest emails turned on.' : 'Daily listing digest emails turned off.')
    } catch (err) {
      setNotice(err.message)
    }
  }

  const isPartner = profile?.role === 'partner'
  const ownClubIds = new Set(clubs.filter((c) => c.canPost).map((c) => c.id))
  const scopedClubs = isPartner ? clubs.filter((c) => c.canPost) : clubs
  const scopedPosts = isPartner ? posts.filter((p) => ownClubIds.has(p.club)) : posts
  const scopedEvents = isPartner ? events.filter((e) => ownClubIds.has(e.club)) : events
  const visibleNav = isPartner ? navigation.filter((item) => item.path !== '/saved') : navigation

  const matches = (text) => text.toLowerCase().includes(query.trim().toLowerCase())
  const feedPosts = scopedPosts
  const visiblePosts = feedPosts.filter((post) => matches(`${clubById(post.club)?.name || ''} ${post.text} ${post.event ? eventById(post.event)?.title || '' : ''}`))
  const visibleClubs = scopedClubs.filter((club) => (category === 'All' || club.category === category) && matches(`${club.name} ${club.category} ${club.description}`))
  const visibleEvents = scopedEvents.filter((event) => matches(`${event.title} ${clubById(event.club)?.name || 'Campus club'} ${event.location}`))
  const visibleOffers = offers.filter((offer) => matches(`${offer.title} ${offer.business_name || ''} ${offer.body || ''}`))

  function renderMain() {
    if (campus.loading) return <div className="campus-empty" role="status">Loading your campus…</div>
    if (campus.signInRequired) return <Empty heading="Your campus is one sign-in away.">Sign in with your Temple email to see clubs, posts, and events.<a href="#/signup" className="campus-button">Sign in to HUS</a></Empty>
    if (!campus.hasData) return <Empty heading="Campus couldn’t be loaded.">{campus.error || 'Please try again.'}<button className="campus-button" onClick={campus.refresh}>Try again</button><a href="#/signup" className="campus-text-link">Go to sign in</a></Empty>
    if ((isClubDetail && !selectedClub) || (isEventDetail && !selectedEvent)) return <Empty heading="That page isn’t here"><a href="#/clubs" className="campus-text-link">Back to communities</a></Empty>
    if (selectedClub) return <>
      <div className={`club-profile-cover tone-${selectedClub.color}`}><span aria-hidden="true">{selectedClub.mark}</span><p>A place for your kind of curious.</p></div>
      <section className="club-profile-info">
        <div className="club-profile-top">
          <Avatar club={selectedClub} large />
          <div className="club-profile-actions">
            {selectedClub.canPost ? (
              <a href="#/club-studio" className="campus-button is-following">
                Manage {selectedClub.orgType === 'partner' ? 'page' : 'club'} →
              </a>
            ) : selectedClub.orgType === 'partner' ? null : selectedClub.membershipStatus === 'approved' ? (
              <button type="button" className="campus-button is-following" disabled={busy} onClick={() => leaveClub(selectedClub)}>
                <Icon name="check" size={14} /> Member · Leave
              </button>
            ) : selectedClub.membershipStatus === 'pending' ? (
              <button type="button" className="campus-button is-following" disabled={busy} onClick={() => leaveClub(selectedClub)}>
                Pending · Cancel
              </button>
            ) : (
              <button type="button" className="campus-button is-following" disabled={busy} onClick={() => requestJoinClub(selectedClub)}>
                Request to join
              </button>
            )}
            <FollowButton club={selectedClub} />
          </div>
        </div>
        <span className="campus-caption">
          {selectedClub.orgType === 'partner' ? `Verified Partner · ${selectedClub.category}` : selectedClub.category}
        </span>
        <h1>{selectedClub.name}</h1>
        <p className="post-handle">@{selectedClub.handle}</p>
        <p className="profile-description">{selectedClub.description}</p>
        <div className="profile-facts">
          <span>
            <Icon name="friends" size={16} />
            {selectedClub.followers} {selectedClub.followers === 1 ? 'follower' : 'followers'} · {selectedClub.members ?? 0} {(selectedClub.members ?? 0) === 1 ? 'member' : 'members'}
          </span>
          <span><Icon name="clock" size={16} />{selectedClub.meeting}</span>
          <span><Icon name="pin" size={16} />{selectedClub.location}</span>
        </div>
      </section>
      <PostComposer clubId={selectedClub.id} />{incomingCount > 0 && <button type="button" className="new-post-banner" onClick={revealPosts}>New community updates · Show updates<Icon name="arrow" size={15} /></button>}<div className="feed-section-heading"><h2>From the club</h2></div>{feedPosts.filter((post) => post.club === selectedClub.id).map((post) => <Post key={post.id} post={post} />)}
    </>
    if (selectedEvent) return <section className="event-detail"><Poster event={selectedEvent} /><div className="event-detail-content"><a className="event-host" href={`#/clubs/${selectedEvent.club}`}><Avatar club={clubById(selectedEvent.club)} /><span>Hosted by<strong>{clubById(selectedEvent.club)?.name || 'Campus club'}</strong></span><Icon name="arrow" size={18} /></a><span className="campus-caption">{selectedEvent.type}</span><h1>{selectedEvent.title}</h1><div className="event-facts"><p><Icon name="calendar" /><span>{selectedEvent.date}<small>{selectedEvent.time}</small></span></p><p><Icon name="pin" /><span>{selectedEvent.location}<small>{selectedEvent.price}</small></span></p></div><h2>The plan</h2><p>{selectedEvent.description}</p><PhotoGrid urls={selectedEvent.imageUrls} label={selectedEvent.title} /><p>{selectedEvent.note}</p><p className="preview-note">Times shown in Japan time.</p></div></section>
    if (path === '/profile') return <Profile embedded onProfileChange={setProfile} />
    if (path === '/club-studio') return <ClubStudio clubs={clubs} events={events} profile={profile} onRefresh={campus.refresh} onNotice={setNotice} />
    if (path === '/activity') return <>
      <div className="page-intro"><h1>Your activity</h1><p>Notifications, listing alerts, and upcoming plans in one place.</p></div>
      {!isPartner && profile && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-4">
          <div>
            <p className="text-sm font-bold text-ink">Daily listing digest email</p>
            <p className="font-mono text-xs text-ink/60">Sent once a day at 8:00 AM JST when new listings are posted.</p>
          </div>
          <button
            type="button"
            onClick={toggleEmailDigest}
            aria-pressed={Boolean(profile.email_digest)}
            className="border-2 border-ink bg-paper px-3 py-2 font-mono text-xs font-bold hover:bg-sun/40"
          >
            {profile.email_digest ? 'On · Turn off' : 'Off · Turn on'}
          </button>
        </div>
      )}
      <div className="feed-section-heading">
        <h2>Notifications</h2>
        {unreadCount > 0 && <button type="button" className="campus-text-link" onClick={markAllRead}>Mark all read</button>}
      </div>
      {notifications.length ? (
        <ul className="mb-8 space-y-3">
          {notifications.map((n) => {
            const item = formatNotification(n)
            return (
              <li key={n.id} className={`flex flex-wrap items-center justify-between gap-3 border-2 border-ink p-4 ${n.read ? 'bg-white' : 'bg-sun/35'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="mt-1 font-mono text-xs text-ink/60">
                    by {n.actorName} · {new Date(n.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.href && <a href={item.href} className="campus-text-link">{item.linkLabel}</a>}
                  {!n.read && (
                    <button type="button" className="campus-follow" onClick={() => markNotificationRead(n.id)}>
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <Empty heading="All caught up">New marketplace &amp; housing alerts will appear here.</Empty>
      )}
    </>
    if (path === '/saved' && !isPartner) {
      return <><div className="page-intro"><h1>Keep the good stuff.</h1><p>Posts you’ve saved for another moment.</p></div>{savedPosts.length ? savedPosts.map((post) => <Post key={post.id} post={post} />) : <Empty heading="A place for your next find">Tap Save on a post to keep it here.<a href="#/dashboard" className="campus-button">Browse the feed</a></Empty>}</>
    }
    const partnerTabs = isPartner ? feedTabs.filter(([id]) => id !== 'following') : feedTabs
    const activeTab = isPartner && tab === 'following' ? 'discover' : tab
    const feed = activeTab === 'following'
      ? visiblePosts.filter((post) => following.includes(post.club))
      : visiblePosts
    return <>
      <label className="campus-search feed-search"><Icon name="search" size={18} /><span className="sr-only">Search posts, events, and offers</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isPartner ? 'Search your posts, events, or offers…' : 'Search posts, clubs, events, or offers…'} type="search" /></label>
      <div className="feed-tabs" role="tablist" aria-label="Community feeds">{partnerTabs.map(([id, label]) => <button type="button" role="tab" id={`tab-${id}`} aria-controls="community-panel" aria-selected={activeTab === id} tabIndex={activeTab === id ? 0 : -1} key={id} className={activeTab === id ? 'active' : ''} onClick={() => setTab(id)} onKeyDown={(event) => { const ids = partnerTabs.map(([k]) => k); let next; if (event.key === 'ArrowRight') next = ids[(ids.indexOf(activeTab) + 1) % ids.length]; if (event.key === 'ArrowLeft') next = ids[(ids.indexOf(activeTab) + ids.length - 1) % ids.length]; if (event.key === 'Home') next = ids[0]; if (event.key === 'End') next = ids[ids.length - 1]; if (next) { event.preventDefault(); setTab(next); document.getElementById(`tab-${next}`)?.focus() } }}>{id === 'discover' && isPartner ? 'Your feed' : label}{id === 'following' && <span>{following.length}</span>}</button>)}</div>
      {activeTab !== 'events-offers' && <div className="feed-update-preview"><span>Updates checked every 15 seconds</span><button type="button" disabled={busy} onClick={campus.refresh}>Refresh<Icon name="activity" size={13} /></button></div>}
      {incomingCount > 0 && activeTab !== 'events-offers' && <button type="button" className="new-post-banner" onClick={() => { revealPosts(); setQuery(''); if (activeTab === 'following' && !campus.incomingClubIds.some(id => following.includes(id))) setTab('discover') }}>{incomingCount} new {incomingCount === 1 ? 'post' : 'posts'} · Show updates<Icon name="arrow" size={15} /></button>}
      <div id="community-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0}>
        {activeTab === 'discover' && !isPartner && <ClubDirectory />}
        {activeTab === 'events-offers' ? (
          <>
            <div className="feed-section-heading"><h2>Upcoming events</h2></div>
            {visibleEvents.map((event) => <article className="event-feed-card" key={event.id}><a className="poster-link" href={`#/events/${event.id}`} aria-label={`View ${event.title}`}><Poster event={event} small /></a><EventSummary event={event} /></article>)}
            {!visibleEvents.length && <Empty heading="No events found">{isPartner ? 'Create an event in Club Studio.' : 'Try another search.'}</Empty>}
            <div className="feed-section-heading mt-8"><h2>Promotional offers &amp; perks</h2></div>
            {visibleOffers.length ? visibleOffers.map((offer) => (
              <article className="campus-post" key={offer.id}>
                <div className="post-identity">
                  <div>
                    <strong className="post-author">{offer.business_name || offer.author?.name || 'Campus partner'}</strong>
                    {offer.coupon_code && <span className="post-handle">Code: {offer.coupon_code}</span>}
                  </div>
                  {offer.expires_at && <span className="post-time">Until {new Date(offer.expires_at).toLocaleDateString()}</span>}
                </div>
                <h3 className="mt-2 font-display text-xl font-bold">{offer.title}</h3>
                {offer.body && <p className="post-text">{offer.body}</p>}
                <PhotoGrid urls={offer.image_urls} label={offer.title} />
                <div className="post-actions"><ReportButton kind={ModerationTarget.FeedPost} id={offer.id} onNotice={setNotice} className="report-action" /></div>
              </article>
            )) : <Empty heading="No promotional offers right now">{isPartner ? 'Publish a promotional offer in Club Studio.' : 'Local TUJ perks and student discounts will appear here.'}</Empty>}
          </>
        ) : (
          <>{activeTab === 'discover' && !isPartner && <div className="feed-section-heading"><h2>Around the community</h2><span>Latest first</span></div>}{feed.map((post) => <Post key={post.id} post={post} />)}{!feed.length && <Empty heading={query ? 'Nothing here matches yet.' : isPartner ? 'Your partner feed is ready.' : 'Make this feed yours.'}>{query ? 'Try a different search term.' : isPartner ? <>Publish updates for your page in Club Studio.<a className="campus-button" href="#/club-studio">Open Club Studio</a></> : <>Follow a club to see its updates here.<button className="campus-button" onClick={() => setTab('discover')}>Discover clubs</button></>}</Empty>}</>
        )}
      </div>
    </>
  }

  return <CampusContext.Provider value={{ following, follow, liked, toggleLiked, saved, save, visibleClubs, category, setCategory, clubById, eventById, clubs, events, publish: campus.publish, busy, setNotice }}><div className="campus-app">
    <a className="campus-skip" href="#campus-main" onClick={(event) => { event.preventDefault(); mainRef.current?.focus() }}>Skip to content</a>
    <div className={`campus-shell${isPartner ? ' is-partner' : ''}`}>
      <aside className="campus-sidebar"><a href='#/profile' className='campus-user'><span className='user-avatar' style={userAvatarUrl ? { backgroundImage: 'url(' + userAvatarUrl + ')', backgroundSize: 'cover', backgroundPosition: 'center' } : {}} aria-hidden='true'>{userAvatarUrl ? '' : userInitials}</span><span><strong>{userName}</strong><small>Make yourself at home</small></span><Icon name='arrow' size={16} /></a><nav className="campus-nav" aria-label="Campus navigation">{visibleNav.map((item) => { const active = path === item.path || item.path === '/dashboard' && (isClubDetail || isEventDetail); return <a key={item.path} href={`#${item.path}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span>{item.path === '/activity' && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}</a> })}</nav><div className="sidebar-note"><span aria-hidden="true">↗</span><p>A campus is a place.<br />A community is its people.</p><a href="#/dashboard" onClick={() => setTab('discover')}>Find yours here.</a></div><a href="#top" className="back-to-site">About HUS <Icon name="external" size={13} /></a></aside>
      <main id="campus-main" className="campus-main" tabIndex={-1} ref={mainRef}>
        <header className="campus-header"><div>{(isClubDetail || isEventDetail) && <a href="#/clubs" className="campus-back" aria-label="Back to communities"><Icon name="back" size={20} /></a>}<span>{title}</span></div><span className="preview-badge"><span />{campus.error ? 'Updates paused' : campus.hasData ? 'Connected' : 'HUS Campus'}</span></header>
        {campus.hasData && campus.error && <div className="campus-error" role="alert">Updates paused. {campus.error}<button type="button" onClick={campus.refresh}>Retry</button></div>}{renderMain()}<footer className="campus-feed-footer">Seeded sample clubs and listings are illustrative, not official TUJ records.</footer>
      </main>
      {!isPartner && <aside className="campus-right" aria-label="Discover clubs and events"><div className="right-top"><span className="campus-caption">A little outside your circle</span><span aria-hidden="true">✳</span></div><section className="suggested-clubs"><div className="section-line"><h2>Room for one more.</h2></div><p>Your next favorite club could be right here.</p>{clubs.filter((club) => !following.includes(club.id)).slice(0, 3).map((club) => <div className="suggested-club" key={club.id}><a href={`#/clubs/${club.id}`}><Avatar club={club} /><span><strong>{club.name}</strong><small>{club.category}</small></span></a><FollowButton club={club} compact /></div>)}{clubs.length > 0 && clubs.every((club) => following.includes(club.id)) && <p className="inline-empty">You’re following every club here. Your campus circle is growing.</p>}<a className="campus-text-link" href="#/clubs" onClick={() => { setTab('discover'); setCategory('All'); setQuery('') }}>Explore all communities<Icon name="arrow" size={15} /></a></section><section className="right-events"><div className="section-line"><h2>Pencil it in.</h2><Icon name="calendar" size={18} /></div><p>A few good reasons to close your laptop.</p>{events.map((event) => <a href={`#/events/${event.id}`} className="right-event" key={event.id}><span className="event-date"><small>{event.month}</small><strong>{event.day}</strong></span><span><strong>{event.title}</strong><small>{clubById(event.club)?.name || 'Campus club'}</small></span><Icon name="arrow" size={15} /></a>)}</section><div className="campus-right-note"><span className="note-flower" aria-hidden="true">✳</span><h2>Show up as you are.</h2><p>New to campus? New to Tokyo?<br />There’s a place for you here.</p><a href="#/clubs" onClick={() => setTab('discover')}>Start with a club<Icon name="arrow" size={16} /></a></div><p className="right-footnote">HUS is a student community concept.<br />Sample clubs are not official TUJ listings.</p></aside>}
    </div>
    <div className="campus-status" role="status" aria-live="polite">{(notice || busy) && <><span>{busy ? 'Saving your changes…' : notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></>}</div>
  </div></CampusContext.Provider>
}
