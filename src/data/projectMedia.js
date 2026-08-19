import responsiveMedia from '../assets/projects/responsive-media.json'

const webpFiles = import.meta.glob('../assets/projects/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

const avifFiles = import.meta.glob('../assets/projects/*.avif', {
  eager: true,
  query: '?url',
  import: 'default',
})

function missing(filename) {
  throw new Error(`Missing project media: ${filename}`)
}

function resolveFormat(stem, extension, files) {
  const entries = responsiveMedia.assets?.[stem]?.[extension]
  if (!Array.isArray(entries) || entries.length === 0) missing(`${stem}.${extension}`)

  const candidatesByWidth = new Map()
  let fallback
  for (const entry of entries) {
    if (
      typeof entry?.file !== 'string'
      || !entry.file.endsWith(`.${extension}`)
      || !Number.isInteger(entry.width)
      || entry.width <= 0
      || !Number.isInteger(entry.tier)
    ) {
      missing(`${stem}.${extension}`)
    }
    const source = files[`../assets/projects/${entry.file}`]
    if (!source) missing(entry.file)
    const candidate = { source, width: entry.width, tier: entry.tier }
    // Entries are emitted in ascending tier order. If a small original makes
    // adjacent tiers decode to one width, retain only the later quality tier.
    candidatesByWidth.set(entry.width, candidate)
    if (!fallback || entry.tier > fallback.tier) fallback = candidate
  }

  return {
    candidates: [...candidatesByWidth.values()].sort((left, right) => left.width - right.width),
    fallback,
  }
}

export function media(filename) {
  if (!filename.endsWith('.webp')) missing(filename)
  const stem = filename.slice(0, -'.webp'.length)
  const webp = resolveFormat(stem, 'webp', webpFiles)
  const avif = resolveFormat(stem, 'avif', avifFiles)
  return {
    src: webp.fallback.source,
    avifSrc: avif.fallback.source,
    srcSet: webp.candidates.map(({ source, width }) => `${source} ${width}w`).join(', '),
    avifSrcSet: avif.candidates.map(({ source, width }) => `${source} ${width}w`).join(', '),
  }
}
