import StudioAuthProvider from './auth/StudioAuthProvider'
import StudioApp from './StudioApp'

export default function StudioRoot() {
  return (
    <StudioAuthProvider>
      <StudioApp />
    </StudioAuthProvider>
  )
}
