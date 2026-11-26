import { formatPrice } from '../../lib/format.js'

export const emptyCampus = { clubs: [], events: [], posts: [], savedPosts: [], listings: [] }
const tokyo = { timeZone: 'Asia/Tokyo' }
const formatDate = (value, options) => new Intl.DateTimeFormat('en-US', { ...tokyo, ...options }).format(new Date(value))

export function postTime(value, now = Date.now()) {
  const minutes = Math.max(1, Math.floor((now - Date.parse(value)) / 60000))
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr`
  return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`
}

export function normalizeCampus(data, now = Date.now()) {
  for (const key of Object.keys(emptyCampus)) {
    if (!Array.isArray(data?.[key])) throw new Error('Campus data could not be loaded. Please try again.')
  }
  const post = (item) => ({ ...item, time: postTime(item.createdAt, now) })
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
      price: formatPrice(listing.priceJpy, listing.category),
      detail: listing.description, color: listing.category === 'housing' ? 'forest' : 'gold',
    })),
  }
}
