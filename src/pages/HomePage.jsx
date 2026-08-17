import Hero from '../components/home/Hero'
import ServiceOverview from '../components/home/ServiceOverview'
import FeaturedProjects from '../components/home/FeaturedProjects'
import BrandStory from '../components/home/BrandStory'
import WorkProcess from '../components/home/WorkProcess'
import ClientTypes from '../components/home/ClientTypes'
import ContactActions from '../components/home/ContactActions'

export default function HomePage({ brand, contact, hero }) {
  return (
    <main className="editorial-home">
      <Hero hero={hero} contact={contact} />
      <FeaturedProjects />
      <ServiceOverview />
      <BrandStory />
      <WorkProcess />
      <ClientTypes />
      <ContactActions brand={brand} contact={contact} />
    </main>
  )
}
