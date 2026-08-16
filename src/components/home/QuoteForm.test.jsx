import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import QuoteForm from './QuoteForm'

test('shows inline errors and focuses the first invalid field', async () => {
  render(<QuoteForm onUnavailable={() => {}} />)

  await userEvent.click(screen.getByRole('button', { name: '送出報價需求' }))

  expect(screen.getByText('請填寫姓名')).toBeInTheDocument()
  expect(screen.getByLabelText('姓名')).toHaveFocus()
})

test('valid input displays the explicit demo-version message', async () => {
  const onUnavailable = vi.fn()
  render(<QuoteForm onUnavailable={onUnavailable} />)

  await userEvent.type(screen.getByLabelText('姓名'), '王先生')
  await userEvent.type(screen.getByLabelText('電話'), '0912-345-678')
  await userEvent.type(screen.getByLabelText('地區'), '台中市')
  await userEvent.selectOptions(screen.getByLabelText('需求類型'), '庭園設計')
  await userEvent.selectOptions(screen.getByLabelText('預算範圍'), '50–100 萬')
  await userEvent.click(screen.getByRole('button', { name: '送出報價需求' }))

  expect(onUnavailable).toHaveBeenCalledWith(
    '目前為網站示意版本，正式上線後開放送出報價',
  )
})
