const iconPaths = {
  facebook: (
    <path d="M13.6 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.6 1.7-1.6h1.8V3.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H8v3.1h2.7v8h2.9Z" />
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.6" cy="6.5" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function SocialIcon({ name, className = '' }) {
  const paths = iconPaths[name]
  if (!paths) throw new Error(`Unknown social icon: ${name}`)

  return (
    <svg
      className={`social-icon social-icon--${name} ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  )
}
