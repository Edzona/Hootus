import { LISTING_PHOTO_LIMIT } from '../lib/listingPhotos'

const inputClass = 'mt-1.5 w-full border-2 border-ink bg-white px-3 py-2.5 text-sm'

function Field({ label, children, className = 'block' }) {
  return (
    <label className={className}>
      <span className="eyebrow text-ink/70">{label}</span>
      {children}
    </label>
  )
}

// One form for creating and editing a listing. `form` holds the fields plus the
// already-uploaded `image_urls`; `onPhotos` receives the file input change event.
export default function ListingForm({
  form, setForm, isHousing, busy, submitLabel, onSubmit, onCancel, onPhotos, photoInputKey, className, heading,
}) {
  const set = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }))
  const room = LISTING_PHOTO_LIMIT - form.image_urls.length

  return (
    <form onSubmit={onSubmit} className={className}>
      {heading}
      <div className="grid gap-4 sm:grid-cols-2">
        {!isHousing && (
          <Field label="Category">
            <select value={form.category} onChange={set('category')} className={`${inputClass} font-mono`}>
              <option value="sales">For sale</option>
              <option value="gigs">Gigs</option>
            </select>
          </Field>
        )}
        <Field label="Title">
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={set('title')}
            placeholder={isHousing ? 'Sunny room 8 min from Sangenjaya' : 'IKEA desk & chair'}
            className={inputClass}
          />
        </Field>
        <Field label={isHousing ? 'Monthly rent (JPY)' : 'Price (JPY)'}>
          <input
            type="number"
            min={0}
            step={1}
            value={form.price}
            onChange={set('price')}
            placeholder="Optional — leave blank for Ask"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field label="Location / Pickup">
          <input
            maxLength={300}
            value={form.location}
            onChange={set('location')}
            placeholder="TUJ lobby or Sangenjaya"
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Description" className="mt-4 block">
        <textarea
          rows={3}
          maxLength={10000}
          value={form.description}
          onChange={set('description')}
          placeholder="Condition, dimensions, move-in dates, or details…"
          className={inputClass}
        />
      </Field>
      {form.image_urls.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {form.image_urls.map((url, idx) => (
            <div key={url} className="relative border-2 border-ink">
              <img src={url} alt={`Existing ${idx + 1}`} className="h-16 w-16 object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${idx + 1}`}
                onClick={() => setForm((f) => ({ ...f, image_urls: f.image_urls.filter((u) => u !== url) }))}
                className="absolute -right-2 -top-2 border border-ink bg-white px-1 font-mono text-xs font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {room > 0 && (
        <Field label={`Photos (optional, up to ${room}${form.image_urls.length ? ' more' : ''})`} className="mt-4 block">
          <input
            key={photoInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => onPhotos(event, room)}
            className="mt-1.5 block w-full font-mono text-xs"
          />
        </Field>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="font-mono text-xs uppercase underline">Cancel</button>
      </div>
    </form>
  )
}
