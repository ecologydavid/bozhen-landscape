import Hero from '../components/home/Hero'
import ServiceOverview from '../components/home/ServiceOverview'
import FeaturedProjects from '../components/home/FeaturedProjects'
import BrandStory from '../components/home/BrandStory'
import WorkProcess from '../components/home/WorkProcess'
import ClientTypes from '../components/home/ClientTypes'
import QuoteForm from '../components/home/QuoteForm'
import ContactActions from '../components/home/ContactActions'

export default function HomePage({ onUnavailable }) {
  return (
    <main>
      <Hero />
      <ServiceOverview />
      <FeaturedProjects />
      <BrandStory />
      <WorkProcess />
      <ClientTypes />
      <QuoteForm onUnavailable={onUnavailable} />
      <ContactActions onUnavailable={onUnavailable} />
    </main>
  )
}
