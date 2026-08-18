import { useState } from 'react'
import { useStudioAuth } from '../auth/StudioAuthProvider'

export default function StudioLoginPage() {
  const { signIn } = useStudioAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setPending(true)
    setFailed(false)

    try {
      await signIn(email, password)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <h1>內容工作室登入</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="studio-email">電子郵件</label>
        <input
          id="studio-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="studio-password">密碼</label>
        <input
          id="studio-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {failed ? <p role="alert">登入失敗，請確認帳號與密碼。</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? '登入中…' : '登入'}
        </button>
      </form>
    </main>
  )
}
