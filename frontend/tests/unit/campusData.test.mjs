import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyCampus, normalizeCampus, postTime } from '../../src/components/campus/campusData.js'

const now = Date.parse('2026-04-10T12:00:00Z')
const minutesAgo = (minutes) => new Date(now - minutes * 60000).toISOString()

test('postTime buckets minutes, hours, and days', () => {
  assert.equal(postTime(minutesAgo(0), now), '1 min')
  assert.equal(postTime(new Date(now + 60000).toISOString(), now), '1 min')
  assert.equal(postTime(minutesAgo(59), now), '59 min')
  assert.equal(postTime(minutesAgo(60), now), '1 hr')
  assert.equal(postTime(minutesAgo(1439), now), '23 hr')
  assert.equal(postTime(minutesAgo(1440), now), '1 day')
  assert.equal(postTime(minutesAgo(2879), now), '1 day')
  assert.equal(postTime(minutesAgo(2880), now), '2 days')
})

test('normalizeCampus rejects missing or non-array collections', () => {
  const message = 'Campus data could not be loaded. Please try again.'
  assert.throws(() => normalizeCampus(null, now), { message })
  assert.throws(() => normalizeCampus({ ...emptyCampus, events: undefined }, now), { message })
  assert.throws(() => normalizeCampus({ ...emptyCampus, posts: {} }, now), { message })
})

test('normalizeCampus formats event dates in Tokyo time', () => {
  const event = { id: 'e1', startsAt: '2026-04-10T01:00:00Z', endsAt: '2026-04-10T03:30:00Z' }
  const rollover = { id: 'e2', startsAt: '2026-04-10T16:00:00Z', endsAt: '2026-04-10T18:00:00Z' }
  const { events } = normalizeCampus({ ...emptyCampus, events: [event, rollover] }, now)
  assert.equal(events[0].day, '10')
  assert.equal(events[0].month, 'Apr')
  assert.equal(events[0].date, 'Friday, April 10, 2026')
  assert.equal(events[0].time, '10:00–12:30')
  assert.equal(events[1].day, '11')
})

test('normalizeCampus shapes housing and marketplace listings', () => {
  const listings = [
    { id: 'l1', category: 'housing', priceJpy: 85000, description: 'Near campus.' },
    { id: 'l2', category: 'electronics', priceJpy: null, description: 'Used laptop.' },
  ]
  const [housing, market] = normalizeCampus({ ...emptyCampus, listings }, now).listings
  assert.equal(housing.kind, 'housing')
  assert.equal(housing.label, 'Housing')
  assert.equal(housing.color, 'forest')
  assert.match(housing.price, /^[¥￥]85,000 \/ month$/)
  assert.equal(housing.detail, 'Near campus.')
  assert.equal(market.kind, 'market')
  assert.equal(market.label, 'Marketplace')
  assert.equal(market.color, 'gold')
  assert.equal(market.price, 'Ask for price')
  assert.equal(market.detail, 'Used laptop.')
})

test('normalizeCampus times posts and preserves unknown fields', () => {
  const data = {
    ...emptyCampus,
    extraTopLevel: true,
    posts: [{ id: 'p1', createdAt: minutesAgo(5), custom: 'field' }],
    savedPosts: [{ id: 'p2', createdAt: minutesAgo(90) }],
  }
  const result = normalizeCampus(data, now)
  assert.equal(result.posts[0].time, '5 min')
  assert.equal(result.savedPosts[0].time, '1 hr')
  assert.equal(result.extraTopLevel, true)
  assert.equal(result.posts[0].custom, 'field')
})
