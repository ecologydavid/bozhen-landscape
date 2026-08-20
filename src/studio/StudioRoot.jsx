import { useEffect } from 'react'
import StudioAuthProvider from './auth/StudioAuthProvider'
import StudioApp from './StudioApp'

export default function StudioRoot() {
  useEffect(() => {
    document.body.classList.add('studio-active')

    return () => {
      document.body.classList.remove('studio-active')
    }
  }, [])

  return (
    <StudioAuthProvider>
      <StudioApp />
    </StudioAuthProvider>
  )
}
