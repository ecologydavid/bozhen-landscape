import LeafContactLinks from '../ui/LeafContactLinks'

export default function MobileQuoteBar({ contact }) {
  return (
    <nav className="mobile-contact-bar" aria-label="快速聯絡">
      <LeafContactLinks contact={contact} className="leaf-contact-links--mobile" />
    </nav>
  )
}
