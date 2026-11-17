import { apiRequest } from './api'
import { LISTING_PHOTO_LIMIT, removeListingPhotos, uploadListingPhotos } from './listingPhotos'

export const emptyListingForm = (category) => ({
  category, title: '', price: '', location: '', description: '', image_urls: [],
})

export const listingToForm = (listing) => ({
  category: listing.category,
  title: listing.title || '',
  price: listing.price_jpy === null || listing.price_jpy === undefined ? '' : String(listing.price_jpy),
  location: listing.location || '',
  description: listing.description || '',
  image_urls: listing.image_urls || [],
})

function priceFromInput(text) {
  if (text.trim() === '') return null
  const price = Number(text)
  if (!Number.isInteger(price) || price < 0) throw new Error('Price must be a whole number of yen, or left empty.')
  return price
}

// Shared by create (POST /listings) and edit (PATCH /listings/:id): validates, uploads
// new photos, saves, and removes the uploaded photos again if the save fails.
export async function saveListing({ path, method, form, photos }) {
  const price = priceFromInput(form.price)
  if (form.image_urls.length + photos.length > LISTING_PHOTO_LIMIT) {
    throw new Error(`You can have up to ${LISTING_PHOTO_LIMIT} photos per listing.`)
  }
  const uploaded = await uploadListingPhotos(photos)
  try {
    return await apiRequest(path, {
      method,
      body: {
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        price_jpy: price,
        image_urls: [...form.image_urls, ...uploaded.urls],
        ...(form.location.trim() ? { location: form.location.trim() } : {}),
      },
    })
  } catch (err) {
    await removeListingPhotos(uploaded.paths)
    throw err
  }
}
