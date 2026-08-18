import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { name: 'test client' } }))

import AssetUploader from './AssetUploader'

const projectId = '11111111-1111-4111-8111-111111111111'

function createFile(name, type = 'image/jpeg') {
  return new File(['image'], name, { type })
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

test('provides an accessible multiple image input with an associated label', () => {
  render(<AssetUploader projectId={projectId} upload={vi.fn()} />)

  const input = screen.getByLabelText('選擇圖片')
  expect(input).toHaveAttribute(
    'accept',
    'image/jpeg,image/png,image/webp,image/heic,image/heif',
  )
  expect(input).toHaveAttribute('multiple')
  expect(screen.getByRole('status')).toHaveTextContent('尚未選擇圖片')
})

test('uploads multiple files sequentially in selection order', async () => {
  const first = deferred()
  const second = deferred()
  const upload = vi.fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const files = [createFile('first.jpg'), createFile('second.png', 'image/png')]
  const user = userEvent.setup()

  render(<AssetUploader projectId={projectId} upload={upload} />)
  await user.upload(screen.getByLabelText('選擇圖片'), files)

  expect(upload).toHaveBeenCalledTimes(1)
  expect(upload).toHaveBeenNthCalledWith(1, expect.anything(), projectId, files[0])
  expect(screen.getByText('first.jpg').closest('li')).toHaveTextContent('上傳中')
  expect(screen.getByText('second.png').closest('li')).toHaveTextContent('等待中')

  await act(async () => first.resolve({ id: 'asset-1' }))
  expect(upload).toHaveBeenCalledTimes(2)
  expect(upload).toHaveBeenNthCalledWith(2, expect.anything(), projectId, files[1])

  await act(async () => second.resolve({ id: 'asset-2' }))
  await waitFor(() => expect(screen.getByLabelText('選擇圖片')).toBeEnabled())
  expect(screen.getAllByText('上傳成功')).toHaveLength(2)
})

test('keeps successful rows, continues after failure, and calls onUploaded only for success', async () => {
  const successRow = { id: 'asset-1' }
  const upload = vi.fn()
    .mockResolvedValueOnce(successRow)
    .mockRejectedValueOnce(new Error('raw database details'))
    .mockResolvedValueOnce({ id: 'asset-3' })
  const onUploaded = vi.fn()
  const user = userEvent.setup()

  render(
    <AssetUploader
      projectId={projectId}
      upload={upload}
      onUploaded={onUploaded}
    />,
  )
  await user.upload(screen.getByLabelText('選擇圖片'), [
    createFile('success.jpg'),
    createFile('failure.jpg'),
    createFile('later.jpg'),
  ])

  await waitFor(() => expect(upload).toHaveBeenCalledTimes(3))
  expect(screen.getByText('success.jpg').closest('li')).toHaveTextContent('上傳成功')
  expect(screen.getByText('failure.jpg').closest('li')).toHaveTextContent('上傳失敗')
  expect(screen.getByText('later.jpg').closest('li')).toHaveTextContent('上傳成功')
  expect(screen.getByRole('alert')).toHaveTextContent('部分圖片上傳失敗，請再試一次。')
  expect(screen.getByRole('alert')).not.toHaveTextContent('raw database details')
  expect(onUploaded).toHaveBeenCalledTimes(2)
  expect(onUploaded).toHaveBeenNthCalledWith(1, successRow)
  expect(onUploaded).toHaveBeenNthCalledWith(2, { id: 'asset-3' })
})

test('prevents an overlapping batch while uploads are in flight', async () => {
  const pending = deferred()
  const upload = vi.fn().mockReturnValue(pending.promise)
  const inputFiles = [createFile('first.jpg')]

  render(<AssetUploader projectId={projectId} upload={upload} />)
  const input = screen.getByLabelText('選擇圖片')
  fireEvent.change(input, { target: { files: inputFiles } })

  expect(input).toBeDisabled()
  fireEvent.change(input, { target: { files: [createFile('overlap.jpg')] } })
  expect(upload).toHaveBeenCalledOnce()

  await act(async () => pending.resolve({ id: 'asset-1' }))
  await waitFor(() => expect(input).toBeEnabled())
})

test('resets the input so the same file can be selected after completion', async () => {
  const upload = vi.fn().mockResolvedValue({ id: 'asset-1' })

  render(<AssetUploader projectId={projectId} upload={upload} />)
  const input = screen.getByLabelText('選擇圖片')
  const file = createFile('repeat.jpg')

  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => expect(input).toBeEnabled())
  expect(input.value).toBe('')

  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
})

test('shows safe validation feedback for an invalid selected file', async () => {
  const upload = vi.fn()
  const user = userEvent.setup({ applyAccept: false })

  render(<AssetUploader projectId={projectId} upload={upload} />)
  await user.upload(
    screen.getByLabelText('選擇圖片'),
    createFile('video.mp4', 'video/mp4'),
  )

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '只接受 JPG、PNG、WebP 或 HEIC 圖片',
  )
  expect(upload).not.toHaveBeenCalled()
})

test('suppresses late UI updates and callbacks after unmount', async () => {
  const pending = deferred()
  const upload = vi.fn().mockReturnValue(pending.promise)
  const onUploaded = vi.fn()
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { unmount } = render(
    <AssetUploader
      projectId={projectId}
      upload={upload}
      onUploaded={onUploaded}
    />,
  )
  fireEvent.change(screen.getByLabelText('選擇圖片'), {
    target: { files: [createFile('pending.jpg')] },
  })

  unmount()
  await act(async () => pending.resolve({ id: 'late-asset' }))

  expect(onUploaded).not.toHaveBeenCalled()
  expect(consoleError).not.toHaveBeenCalled()
  consoleError.mockRestore()
})
