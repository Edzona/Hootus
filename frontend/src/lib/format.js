const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

export const formatYen = (value) => yen.format(value)

export function formatPrice(priceJpy, category) {
  if (priceJpy === null || priceJpy === undefined) return 'Ask for price'
  return category === 'housing' ? `${formatYen(priceJpy)} / month` : formatYen(priceJpy)
}

export const formatShortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
