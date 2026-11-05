import { getSupabase } from './supabase'

export const LISTING_PHOTO_LIMIT = 4
const BUCKET = 'listing-photos'
const MAX_EDGE = 1600
const MAX_BYTES = 2 * 1024 * 1024

// Re-encode as JPEG: shrinks phone photos below the bucket's 2 MB limit and drops
// metadata such as the GPS location many phones embed in photos.
export async function compressPhoto(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`"${file.name}" can't be read by this browser. Try a JPEG or PNG.`)
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  // JPEG has no transparency; fill white so transparent PNGs don't turn black.
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  for (const quality of [0.82, 0.7, 0.55]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= MAX_BYTES) return blob
  }
  throw new Error(`"${file.name}" is too large, even after compression.`)
}

// Best effort: used to clean up after a failed upload or listing save.
export async function removeListingPhotos(paths) {
  if (!paths.length) return
  try { await getSupabase().storage.from(BUCKET).remove(paths) } catch { /* leftover files are harmless */ }
}

// Uploads into listing-photos/<your Auth ID>/, the only folder Storage lets you write to.
// Returns public URLs to save with the listing, plus paths for cleanup.
export async function uploadListingPhotos(files) {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Please sign in again.')
  const storage = supabase.storage.from(BUCKET)
  const paths = []
  try {
    for (const file of files) {
      const blob = await compressPhoto(file)
      const path = `${data.session.user.id}/${crypto.randomUUID()}.jpg`
      const { error } = await storage.upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw new Error('A photo could not be uploaded. Please try again.')
      paths.push(path)
    }
  } catch (err) {
    await removeListingPhotos(paths)
    throw err
  }
  return { paths, urls: paths.map(path => storage.getPublicUrl(path).data.publicUrl) }
}
