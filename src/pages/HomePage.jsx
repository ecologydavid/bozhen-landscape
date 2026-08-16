import Hero from '../components/home/Hero'
import ServiceOverview from '../components/home/ServiceOverview'
import FeaturedProjects from '../components/home/FeaturedProjects'
import BrandStory from '../components/home/BrandStory'
import WorkProcess from '../components/home/WorkProcess'
import ClientTypes from '../components/home/ClientTypes'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ServiceOverview />
      <FeaturedProjects />
      <BrandStory />
      <WorkProcess />
      <ClientTypes />
    </main>
  )
}
