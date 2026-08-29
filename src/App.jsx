import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import SiteHeader from './components/layout/SiteHeader'
import SiteFooter from './components/layout/SiteFooter'
import MobileQuoteBar from './components/layout/MobileQuoteBar'
import AnalyticsTracker from './components/analytics/AnalyticsTracker'
import ScrollToHash from './components/routing/ScrollToHash'
import { siteContent } from './data/siteContent'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const { brand, contact, social } = siteContent
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="site-shell">
      <SiteHeader
        brand={brand}
        contact={contact}
        navigationImage={siteContent.hero.image}
        navigationImageAlt={siteContent.hero.alt}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
      />
      <div
        className="site-content"
        inert={menuOpen ? true : undefined}
        aria-hidden={menuOpen ? 'true' : undefined}
      >
        <AnalyticsTracker />
        <ScrollToHash focusBlocked={menuOpen} />
        <Routes>
          <Route
            path="/"
            element={<HomePage brand={brand} contact={contact} hero={siteContent.hero} social={social} />}
          />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:slug" element={<ProjectDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <SiteFooter brand={brand} contact={contact} social={social} />
        <MobileQuoteBar contact={contact} />
      </div>
    </div>
  )
}
