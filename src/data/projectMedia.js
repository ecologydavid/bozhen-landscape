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

export function media(filename) {
  const webpKey = `../assets/projects/${filename}`
  const avifFilename = filename.replace(/\.webp$/, '.avif')
  const avifKey = `../assets/projects/${avifFilename}`
  const src = webpFiles[webpKey]
  const avifSrc = avifFiles[avifKey]
  if (!src || !avifSrc) throw new Error(`Missing project media: ${filename}`)
  return { src, avifSrc }
}
