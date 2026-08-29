import { useRef } from 'react'
import Hero from '../components/home/Hero'
import ServiceOverview from '../components/home/ServiceOverview'
import FeaturedProjects from '../components/home/FeaturedProjects'
import BrandStory from '../components/home/BrandStory'
import WorkProcess from '../components/home/WorkProcess'
import ClientTypes from '../components/home/ClientTypes'
import ContactActions from '../components/home/ContactActions'
import ScrollEnvironment from '../components/home/ScrollEnvironment'
import GardenJournal from '../components/home/GardenJournal'
import { homeScenes } from '../data/homeScenes'
import { gardenNotes } from '../data/gardenNotes'
import { useActiveScene } from '../hooks/useActiveScene'

export default function HomePage({ brand, contact, hero, social = {} }) {
  const homeRef = useRef(null)
  const activeScene = useActiveScene(homeScenes.map((scene) => scene.id), homeRef)

  return (
    <main ref={homeRef} className="editorial-home" data-active-scene={activeScene}>
      <ScrollEnvironment scenes={homeScenes} activeScene={activeScene} />
      <Hero hero={hero} contact={contact} />
      <FeaturedProjects />
      <ServiceOverview />
      <WorkProcess />
      <div className="craft-care-bridge" data-transition="craft-to-care">
        <GardenJournal notes={gardenNotes} />
        <BrandStory />
        <ClientTypes />
      </div>
      <ContactActions brand={brand} contact={contact} social={social} />
    </main>
  )
}
