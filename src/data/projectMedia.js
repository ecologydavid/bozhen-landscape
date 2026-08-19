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

const responsiveWidths = [480, 768, 1280, 1920]

function responsiveFilename(stem, width, extension) {
  return `${stem}${width === 1920 ? '' : `-${width}`}.${extension}`
}

function resolveFormat(stem, extension, files) {
  return responsiveWidths.map((width) => {
    const filename = responsiveFilename(stem, width, extension)
    const source = files[`../assets/projects/${filename}`]
    if (!source) throw new Error(`Missing project media: ${filename}`)
    return { source, width }
  })
}

export function media(filename) {
  if (!filename.endsWith('.webp')) throw new Error(`Missing project media: ${filename}`)
  const stem = filename.slice(0, -'.webp'.length)
  const webp = resolveFormat(stem, 'webp', webpFiles)
  const avif = resolveFormat(stem, 'avif', avifFiles)
  return {
    src: webp.at(-1).source,
    avifSrc: avif.at(-1).source,
    srcSet: webp.map(({ source, width }) => `${source} ${width}w`).join(', '),
    avifSrcSet: avif.map(({ source, width }) => `${source} ${width}w`).join(', '),
  }
}
