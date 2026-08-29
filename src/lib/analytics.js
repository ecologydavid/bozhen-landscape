const measurementId = String(import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim()
const measurementIdPattern = /^G-[A-Z0-9]+$/i

let initialized = false

function isConfigured() {
  return measurementIdPattern.test(measurementId)
}

function initializeAnalytics() {
  if (!isConfigured() || typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  if (initialized) return true

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag(...args) {
    window.dataLayer.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })

  if (!document.querySelector(`script[data-ga4="${measurementId}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.dataset.ga4 = measurementId
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    document.head.appendChild(script)
  }

  initialized = true
  return true
}

export function trackEvent(name, parameters = {}) {
  if (!initializeAnalytics()) return false
  window.gtag('event', name, parameters)
  return true
}

export function trackPageView(path) {
  return trackEvent('page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function analyticsStatus() {
  return {
    configured: isConfigured(),
    measurementId: isConfigured() ? measurementId : null,
  }
}
