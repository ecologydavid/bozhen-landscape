import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import SiteHeader from './components/layout/SiteHeader'
import SiteFooter from './components/layout/SiteFooter'
import MobileQuoteBar from './components/layout/MobileQuoteBar'
import FeedbackToast from './components/ui/FeedbackToast'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const showUnavailable = (message) => setFeedbackMessage(message)

  return (
    <div className="site-shell">
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage onUnavailable={showUnavailable} />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:slug" element={<ProjectDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter onUnavailable={showUnavailable} />
      <MobileQuoteBar />
      <FeedbackToast
        message={feedbackMessage}
        onClose={() => setFeedbackMessage('')}
      />
    </div>
  )
}
