const files = import.meta.glob('../assets/projects/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

export function media(filename) {
  const key = `../assets/projects/${filename}`
  const url = files[key]
  if (!url) throw new Error(`Missing project media: ${filename}`)
  return url
}
