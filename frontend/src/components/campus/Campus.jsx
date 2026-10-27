import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Wordmark } from '../Logo'
import Icon from './Icon'
import useCampusData from './useCampusData'
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
  { label: 'Dashboard', icon: 'home', path: '/dashboard' },
  { label: 'Activity', icon: 'activity', path: '/activity' },
  { label: 'Friends', icon: 'friends', path: '/friends' },
  { label: 'Communities', icon: 'clubs', path: '/clubs' },
  { label: 'Saved', icon: 'save', path: '/saved' },
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
  const { attending, rsvp, busy } = useContext(CampusContext)
  return <div className="event-summary"><div><span className="campus-caption">{event.type}</span><a className="event-title" href={`#/events/${event.id}`}>{event.title}</a><p><Icon name="calendar" size={14} />{event.month} {event.day}, {event.time.split('–')[0]}<span className="event-summary-price">{event.price}</span></p></div><button type="button" className={`campus-rsvp ${attending.includes(event.id) ? 'is-attending' : ''}`} aria-pressed={attending.includes(event.id)} aria-label={`${attending.includes(event.id) ? 'Cancel RSVP for' : 'RSVP for'} ${event.title}`} disabled={busy} onClick={() => rsvp(event.id)}>{attending.includes(event.id) ? <><Icon name="check" size={14} /> Going</> : 'RSVP'}</button></div>
}

function Post({ post }) {
  const { liked, toggleLiked, saved, save, clubById, eventById, busy } = useContext(CampusContext)
  const club = clubById(post.club)
  if (!club) return null
  const event = post.event && eventById(post.event)
  return <article className="campus-post">
    <div className="post-identity"><a href={`#/clubs/${club.id}`} aria-label={`${club.name} profile`}><Avatar club={club} /></a><div><a href={`#/clubs/${club.id}`} className="post-author">{club.name}</a><span className="post-handle">@{club.handle}</span></div><span className="post-time">{post.time} ago</span></div>
    <p className="post-text">{post.text}</p>
    {event && <div className="post-event"><a className="poster-link" href={`#/events/${event.id}`} aria-label={`View ${event.title}`}><Poster event={event} /></a><EventSummary event={event} /></div>}
    <div className="post-actions"><button type="button" aria-pressed={liked.includes(post.id)} className={liked.includes(post.id) ? 'is-liked' : ''} aria-label={`${liked.includes(post.id) ? 'Unlike' : 'Like'} post by ${club.name}`} disabled={busy} onClick={() => toggleLiked(post.id)}><Icon name="heart" size={18} />{post.likes}</button><button type="button" aria-pressed={saved.includes(post.id)} className={saved.includes(post.id) ? 'is-saved' : ''} disabled={busy} onClick={() => save(post.id)}><Icon name="save" size={17} />{saved.includes(post.id) ? 'Saved' : 'Save'}</button><a href={`#/clubs/${club.id}`}>Visit club<Icon name="arrow" size={15} /></a></div>
  </article>
}

function Empty({ heading, children }) {
  return <div className="campus-empty"><span className="empty-symbol" aria-hidden="true">✳</span><h2>{heading}</h2><p>{children}</p></div>
}

function ClubDirectory() {
  const { visibleClubs, category, setCategory } = useContext(CampusContext)
  return <section className="club-directory" aria-label="Club directory"><div className="section-line"><h2>Find your people</h2><span>{visibleClubs.length} {visibleClubs.length === 1 ? 'club' : 'clubs'}</span></div><div className="category-chips" aria-label="Filter clubs by interest">{['All', 'Arts & culture', 'Outdoors', 'Careers', 'Music'].map((item) => <button type="button" key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="club-directory-grid">{visibleClubs.map((club) => <article className="directory-club" key={club.id}><a href={`#/clubs/${club.id}`} className="directory-club-link"><Avatar club={club} /><strong>{club.name}</strong><span>{club.category}</span></a><FollowButton club={club} compact /></article>)}</div>{!visibleClubs.length && <p className="inline-empty">No clubs match. Try another interest or search.</p>}</section>
}

function Listing({ listing }) {
  return <details className={`campus-listing tone-${listing.color}`}><summary><div className="listing-art" aria-hidden="true"><Icon name={listing.kind === 'housing' ? 'home' : 'clubs'} size={30} /></div><div><span className="campus-caption">{listing.label}{listing.isSample ? ' · Sample' : ''}</span><h3>{listing.title}</h3><strong>{listing.price}</strong></div><Icon name="arrow" size={18} /></summary><p>{listing.detail}</p></details>
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

export default function Campus({ hash }) {
  const path = hash.slice(1).split('?')[0]
  const campus = useCampusData()
  const { clubs, events, posts, savedPosts, listings, following, saved, attending, liked,
    follow, save, rsvp, like: toggleLiked, busy, notice, setNotice, incomingCount, revealPosts } = campus
  const clubById = (id) => clubs.find(club => club.id === id || club.slug === id)
  const eventById = (id) => events.find(event => event.id === id || event.slug === id)
  const [tab, setTab] = useState('following')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const mainRef = useRef(null)
  const previousPath = useRef(path)
  const isClubDetail = path.startsWith('/clubs/')
  const isEventDetail = path.startsWith('/events/')
  const selectedClub = isClubDetail ? clubById(path.split('/')[2]) : null
  const selectedEvent = isEventDetail ? eventById(path.split('/')[2]) : null
  const title = selectedClub?.name || selectedEvent?.type || hubNav.find((item) => item.path === path)?.label || navigation.find((item) => item.path === path)?.label || 'Communities'

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

  const matches = (text) => text.toLowerCase().includes(query.trim().toLowerCase())
  const feedPosts = posts
  const visiblePosts = feedPosts.filter((post) => matches(`${clubById(post.club)?.name || ''} ${post.text} ${post.event ? eventById(post.event)?.title || '' : ''}`))
  const visibleClubs = clubs.filter((club) => (category === 'All' || club.category === category) && matches(`${club.name} ${club.category} ${club.description}`))
  const visibleEvents = events.filter((event) => matches(`${event.title} ${clubById(event.club)?.name || 'Campus club'} ${event.location}`))

  function renderMain() {
    if (campus.loading) return <div className="campus-empty" role="status">Loading your campus…</div>
    if (campus.signInRequired) return <Empty heading="Your campus is one sign-in away.">Sign in with your Temple email to see clubs, posts, and events.<a href="#/signup" className="campus-button">Sign in to HUS</a></Empty>
    if (!campus.hasData) return <Empty heading="Campus couldn’t be loaded.">{campus.error || 'Please try again.'}<button className="campus-button" onClick={campus.refresh}>Try again</button><a href="#/signup" className="campus-text-link">Go to sign in</a></Empty>
    if ((isClubDetail && !selectedClub) || (isEventDetail && !selectedEvent)) return <Empty heading="That page isn’t here"><a href="#/clubs" className="campus-text-link">Back to communities</a></Empty>
    if (selectedClub) return <>
      <div className={`club-profile-cover tone-${selectedClub.color}`}><span aria-hidden="true">{selectedClub.mark}</span><p>A place for your kind of curious.</p></div>
      <section className="club-profile-info"><div className="club-profile-top"><Avatar club={selectedClub} large /><FollowButton club={selectedClub} /></div><span className="campus-caption">{selectedClub.category}</span><h1>{selectedClub.name}</h1><p className="post-handle">@{selectedClub.handle}</p><p className="profile-description">{selectedClub.description}</p><div className="profile-facts"><span><Icon name="friends" size={16} />{selectedClub.followers} followers</span><span><Icon name="clock" size={16} />{selectedClub.meeting}</span><span><Icon name="pin" size={16} />{selectedClub.location}</span></div><p className="profile-note">Follow for updates. For membership, ask the club at its next meetup.</p></section>
      <PostComposer clubId={selectedClub.id} />{incomingCount > 0 && <button type="button" className="new-post-banner" onClick={revealPosts}>New community updates · Show updates<Icon name="arrow" size={15} /></button>}<div className="feed-section-heading"><h2>From the club</h2></div>{feedPosts.filter((post) => post.club === selectedClub.id).map((post) => <Post key={post.id} post={post} />)}
    </>
    if (selectedEvent) return <section className="event-detail"><Poster event={selectedEvent} /><div className="event-detail-content"><a className="event-host" href={`#/clubs/${selectedEvent.club}`}><Avatar club={clubById(selectedEvent.club)} /><span>Hosted by<strong>{clubById(selectedEvent.club)?.name || 'Campus club'}</strong></span><Icon name="arrow" size={18} /></a><span className="campus-caption">{selectedEvent.type}</span><h1>{selectedEvent.title}</h1><div className="event-facts"><p><Icon name="calendar" /><span>{selectedEvent.date}<small>{selectedEvent.time}</small></span></p><p><Icon name="pin" /><span>{selectedEvent.location}<small>{selectedEvent.price}</small></span></p></div><h2>The plan</h2><p>{selectedEvent.description}</p><p>{selectedEvent.note}</p><button type="button" className={`campus-button event-rsvp-button ${attending.includes(selectedEvent.id) ? 'is-following' : ''}`} aria-pressed={attending.includes(selectedEvent.id)} disabled={busy} onClick={() => rsvp(selectedEvent.id)}><Icon name={attending.includes(selectedEvent.id) ? 'check' : 'calendar'} size={18} />{attending.includes(selectedEvent.id) ? 'Cancel RSVP' : 'Count me in · RSVP'}</button><p className="preview-note">{clubById(selectedEvent.club)?.isSample ? 'Sample event. Your RSVP is saved to your HUS account.' : 'Your RSVP is saved to your HUS account.'} Times shown in Japan time.</p></div></section>
    if (path === '/dashboard') return <>
      <section className="campus-welcome"><span className="campus-caption">Your campus, connected</span><h1>A little more<br />campus in your day.</h1><p>Find your people. Make a plan. Make yourself at home.</p><a href="#/clubs" className="campus-button">Explore communities<Icon name="arrow" size={17} /></a><span className="welcome-flower" aria-hidden="true">✳</span></section>
      <div className="feed-section-heading"><div><span className="campus-caption">Out of the group chat</span><h2>On campus this week</h2></div><a href="#/clubs">All updates <Icon name="arrow" size={16} /></a></div><>{posts[0] ? <Post post={posts[0]} /> : <Empty heading="Your campus story starts here">Club posts will appear as they’re published.</Empty>}</>
      <section className="dashboard-listings"><div className="section-line"><div><span className="campus-caption">Pass it on</span><h2>Marketplace finds</h2></div><span>Latest listings</span></div>{listings.filter((listing) => listing.kind === 'market').map((listing) => <Listing key={listing.id} listing={listing} />)}</section>
      <section className="dashboard-listings"><div className="section-line"><div><span className="campus-caption">Settle into Tokyo</span><h2>Somewhere to call home</h2></div></div>{listings.filter(listing => listing.kind === 'housing').map(listing => <Listing key={listing.id} listing={listing} />)}</section>
    </>
    if (path === '/marketplace') return <>
      <section className="hub-welcome market-welcome"><span className="campus-caption">Buy, sell, trade</span><h1>Student marketplace.</h1><p>Furniture, clothes, electronics, and the occasional gig. Only TUJ students.</p></section>
      <section className="hub-listings market-listings"><div className="section-line"><div><span className="campus-caption">Latest picks</span><h2>On the market</h2></div></div>{listings.filter((listing) => listing.kind === 'market').length ? listings.filter((listing) => listing.kind === 'market').map((listing) => <Listing key={listing.id} listing={listing} />) : <Empty heading="Nothing for sale right now">Check back later, or post your own listing.</Empty>}</section>
    </>
    if (path === '/real-estate') return <>
      <section className="hub-welcome housing-welcome"><span className="campus-caption">Rooms &amp; sublets</span><h1>Somewhere to call home.</h1><p>Sublets, sharehouses, and roommate searches near campus.</p></section>
      <section className="hub-listings housing-listings"><div className="section-line"><div><span className="campus-caption">Near TUJ</span><h2>Housing listings</h2></div></div>{listings.filter((listing) => listing.kind === 'housing').length ? listings.filter((listing) => listing.kind === 'housing').map((listing) => <Listing key={listing.id} listing={listing} />) : <Empty heading="No rooms posted right now">Check back later for sublets and sharehouses.</Empty>}</section>
    </>
    if (path === '/activity') return <><div className="page-intro"><h1>Your activity</h1><p>Your upcoming plans and updates, in one place.</p></div>{attending.length ? <><div className="feed-section-heading"><h2>You’re going</h2></div>{events.filter((event) => attending.includes(event.id)).map((event) => <div className="activity-event" key={event.id}><EventSummary event={event} /></div>)}</> : <Empty heading="Your next plan starts here">RSVP to an event and it will appear here.<a className="campus-button" href="#/clubs">Find your next meetup</a></Empty>}<div className="activity-note"><Icon name="activity" /><p>Your RSVPs are saved to your account. Replies and friend notifications are coming later.</p></div></>
    if (path === '/friends') return <><div className="page-intro"><h1>Good company starts here.</h1><p>A shared interest is a pretty good introduction.</p></div><Empty heading="Find a familiar face">Explore a club or head to an event to meet other students. Friend connections are coming in a later version.<a href="#/clubs" className="campus-button">Explore communities</a></Empty><div className="friends-clubs">{clubs.slice(0, 3).map((club) => <a key={club.id} href={`#/clubs/${club.id}`}><Avatar club={club} /><span><strong>{club.name}</strong><small>{club.category}</small></span><Icon name="arrow" /></a>)}</div></>
    if (path === '/saved') {
      return <><div className="page-intro"><h1>Keep the good stuff.</h1><p>Posts you’ve saved for another moment.</p></div>{savedPosts.length ? savedPosts.map((post) => <Post key={post.id} post={post} />) : <Empty heading="A place for your next find">Tap Save on a post to keep it here.<a href="#/clubs" className="campus-button">Browse the feed</a></Empty>}</>
    }
    const feed = tab === 'following' ? visiblePosts.filter((post) => following.includes(post.club)) : visiblePosts
    return <>
      <section className="communities-intro"><div><span className="campus-caption">Life beyond the classroom</span><h1>Your people.<br /><span>Your kind of plans.</span></h1><p>Small circles. Big campus energy.</p></div><div className="community-stamp" aria-hidden="true"><span>Meet here.</span><strong>✳</strong><span>Go anywhere.</span></div></section>
      <label className="campus-search feed-search"><Icon name="search" size={18} /><span className="sr-only">Search clubs, posts, and events</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a club, a plan, your people…" type="search" /></label>
      <div className="feed-tabs" role="tablist" aria-label="Community feeds">{[['following', 'Following'], ['discover', 'Discover'], ['events', 'Events']].map(([id, label]) => <button type="button" role="tab" id={`tab-${id}`} aria-controls="community-panel" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} onKeyDown={(event) => { const tabs = ['following', 'discover', 'events']; let next; if (event.key === 'ArrowRight') next = tabs[(tabs.indexOf(tab) + 1) % tabs.length]; if (event.key === 'ArrowLeft') next = tabs[(tabs.indexOf(tab) + 2) % tabs.length]; if (event.key === 'Home') next = tabs[0]; if (event.key === 'End') next = tabs[2]; if (next) { event.preventDefault(); setTab(next); document.getElementById(`tab-${next}`)?.focus() } }}>{label}{id === 'following' && <span>{following.length}</span>}</button>)}</div>
      <PostComposer />
      {tab !== 'events' && <div className="feed-update-preview"><span>Updates checked every 15 seconds</span><button type="button" disabled={busy} onClick={campus.refresh}>Refresh<Icon name="activity" size={13} /></button></div>}
      {incomingCount > 0 && tab !== 'events' && <button type="button" className="new-post-banner" onClick={() => { revealPosts(); setQuery(''); if (tab === 'following' && !campus.incomingClubIds.some(id => following.includes(id))) setTab('discover') }}>{incomingCount} new {incomingCount === 1 ? 'post' : 'posts'} · Show updates<Icon name="arrow" size={15} /></button>}
      <div id="community-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'discover' && <ClubDirectory />}
        {tab === 'events' ? <><div className="feed-section-heading"><h2>Make a little room in your week.</h2></div>{visibleEvents.map((event) => <article className="event-feed-card" key={event.id}><a className="poster-link" href={`#/events/${event.id}`} aria-label={`View ${event.title}`}><Poster event={event} small /></a><EventSummary event={event} /></article>)}{!visibleEvents.length && <Empty heading="No events found">Try another search.</Empty>}</> : <>{tab === 'discover' && <div className="feed-section-heading"><h2>Around the community</h2><span>Latest first</span></div>}{feed.map((post) => <Post key={post.id} post={post} />)}{!feed.length && <Empty heading={query ? 'Nothing here matches yet.' : 'Make this feed yours.'}>{query ? 'Try a different club name or search term.' : <>Follow a club to see its updates here.<button className="campus-button" onClick={() => setTab('discover')}>Discover clubs</button></>}</Empty>}</>}
      </div>
    </>
  }

  return <CampusContext.Provider value={{ following, follow, attending, rsvp, liked, toggleLiked, saved, save, visibleClubs, category, setCategory, clubById, eventById, clubs, events, publish: campus.publish, busy }}><div className="campus-app">
    <a className="campus-skip" href="#campus-main" onClick={(event) => { event.preventDefault(); mainRef.current?.focus() }}>Skip to content</a>
    <div className="campus-shell">
      <aside className="campus-sidebar"><a href="#/dashboard" className="campus-brand" aria-label="HUS dashboard"><Wordmark /><span>Made for TUJ.</span></a><nav className="campus-nav" aria-label="Campus navigation">{navigation.map((item) => { const active = path === item.path || item.path === '/clubs' && (isClubDetail || isEventDetail); return <a key={item.path} href={`#${item.path}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span>{item.path === '/activity' && attending.length > 0 && <span className="nav-count">{attending.length}</span>}</a> })}</nav><div className="sidebar-note"><span aria-hidden="true">↗</span><p>A campus is a place.<br />A community is its people.</p><a href="#/clubs">Find yours here.</a></div><a href="#/profile" className="campus-user"><span className="user-avatar">You</span><span><strong>Your profile</strong><small>Make yourself at home</small></span><Icon name="arrow" size={16} /></a><a href="#top" className="back-to-site">About HUS <Icon name="external" size={13} /></a></aside>
      <main id="campus-main" className="campus-main" tabIndex={-1} ref={mainRef}>
        <header className="campus-header"><div>{(isClubDetail || isEventDetail) && <a href="#/clubs" className="campus-back" aria-label="Back to communities"><Icon name="back" size={20} /></a>}<span>{title}</span></div><span className="preview-badge"><span />{campus.error ? 'Updates paused' : campus.hasData ? 'Connected' : 'HUS Campus'}</span></header>
        {campus.hasData && campus.error && <div className="campus-error" role="alert">Updates paused. {campus.error}<button type="button" onClick={campus.refresh}>Retry</button></div>}{renderMain()}<footer className="campus-feed-footer">Seeded sample clubs and listings are illustrative, not official TUJ records.</footer>
      </main>
      <aside className="campus-right" aria-label="Discover clubs and events"><div className="right-top"><span className="campus-caption">A little outside your circle</span><span aria-hidden="true">✳</span></div><section className="suggested-clubs"><div className="section-line"><h2>Room for one more.</h2></div><p>Your next favorite club could be right here.</p>{clubs.filter((club) => !following.includes(club.id)).slice(0, 3).map((club) => <div className="suggested-club" key={club.id}><a href={`#/clubs/${club.id}`}><Avatar club={club} /><span><strong>{club.name}</strong><small>{club.category}</small></span></a><FollowButton club={club} compact /></div>)}{clubs.length > 0 && clubs.every((club) => following.includes(club.id)) && <p className="inline-empty">You’re following every club here. Your campus circle is growing.</p>}<a className="campus-text-link" href="#/clubs" onClick={() => { setTab('discover'); setCategory('All'); setQuery('') }}>Explore all communities<Icon name="arrow" size={15} /></a></section><section className="right-events"><div className="section-line"><h2>Pencil it in.</h2><Icon name="calendar" size={18} /></div><p>A few good reasons to close your laptop.</p>{events.map((event) => <a href={`#/events/${event.id}`} className="right-event" key={event.id}><span className="event-date"><small>{event.month}</small><strong>{event.day}</strong></span><span><strong>{event.title}</strong><small>{clubById(event.club)?.name || 'Campus club'}</small></span><Icon name="arrow" size={15} /></a>)}</section><div className="campus-right-note"><span className="note-flower" aria-hidden="true">✳</span><h2>Show up as you are.</h2><p>New to campus? New to Tokyo?<br />There’s a place for you here.</p><a href="#/clubs" onClick={() => setTab('discover')}>Start with a club<Icon name="arrow" size={16} /></a></div><p className="right-footnote">HUS is a student community concept.<br />Sample clubs are not official TUJ listings.</p></aside>
    </div>
    <div className="campus-status" role="status" aria-live="polite">{(notice || busy) && <><span>{busy ? 'Saving your changes…' : notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></>}</div>
  </div></CampusContext.Provider>
}
