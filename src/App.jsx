import { Route, Routes } from 'react-router-dom'
import SiteHeader from './components/layout/SiteHeader'
import SiteFooter from './components/layout/SiteFooter'
import MobileQuoteBar from './components/layout/MobileQuoteBar'
import ScrollToHash from './components/routing/ScrollToHash'
import { siteContent } from './data/siteContent'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const { brand, contact } = siteContent

  return (
    <div className="site-shell">
      <SiteHeader
        brand={brand}
        contact={contact}
        menuFeature={siteContent.navigation}
      />
      <ScrollToHash />
      <Routes>
        <Route
          path="/"
          element={<HomePage brand={brand} contact={contact} hero={siteContent.hero} />}
        />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter brand={brand} contact={contact} />
      <MobileQuoteBar contact={contact} />
    </div>
  )
}
