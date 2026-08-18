const iconPaths = {
  leaf: (
    <>
      <path d="M19.5 4.5C12 4.7 6.6 8.5 5.2 15.8c4.8 1.1 9.1-.1 11.8-3.3 1.8-2.1 2.6-4.8 2.5-8Z" />
      <path d="M5.3 18.8c2.6-4.2 6.1-7.3 10.8-9.4" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21V9.5" />
      <path d="M11.8 12.2C7.4 12.2 4.6 10 4 6c4.4-.2 7.2 1.8 7.8 6.2Z" />
      <path d="M12.2 8.9c.5-4 3.2-6.1 7.5-5.9-.4 4.1-3.1 6.1-7.5 5.9Z" />
      <path d="M6 21h12" />
    </>
  ),
  water: (
    <>
      <path d="M8.4 3.5C6 7 4.8 9.2 4.8 11.1a3.6 3.6 0 0 0 7.2 0c0-1.9-1.2-4.1-3.6-7.6Z" />
      <path d="M17.4 8.1c-1.9 2.8-2.9 4.6-2.9 6.1a2.9 2.9 0 0 0 5.8 0c0-1.5-1-3.3-2.9-6.1Z" />
    </>
  ),
  care: (
    <>
      <path d="M12 20V9" />
      <path d="M11.8 12C7.8 12 5.3 10 4.8 6.4c4-.2 6.5 1.6 7 5.6Z" />
      <path d="M12.2 9c.4-3.5 2.8-5.3 6.6-5.1-.4 3.6-2.7 5.3-6.6 5.1Z" />
      <path d="M3 21c2.2-2.4 4.3-3.2 6.5-2.5L12 20l2.5-1.5c2.2-.7 4.3.1 6.5 2.5" />
    </>
  ),
  arrowLeaf: (
    <>
      <path d="M5 15.5c6.6.8 11.3-2.5 13.8-9.8-7-.5-11.7 2.7-13.8 9.8Z" />
      <path d="m7 18 10-10M12.8 8H17v4.2" />
    </>
  ),
}

export default function LeafIcon({ name = 'leaf', label, className = '' }) {
  const paths = iconPaths[name]
  if (!paths) throw new Error(`Unknown leaf icon: ${name}`)
  return (
    <svg
      className={`leaf-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {paths}
    </svg>
  )
}
