import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import ProjectAssetManager from './ProjectAssetManager'

vi.mock('./AssetUploader', () => ({
  default: ({ client, projectId, onUploaded }) => (
    <button type="button" onClick={() => onUploaded({ id: 'asset-1' })}>
      upload {client.source} {projectId}
    </button>
  ),
}))

vi.mock('./AssetLibrary', () => ({
  default: ({ client, projectId, refreshToken }) => (
    <output aria-label="library props">
      {client.source} {projectId} refresh {refreshToken}
    </output>
  ),
}))
vi.mock('../lib/supabase', () => ({ supabase: { source: 'default-test' } }))

test('refreshes the library after each successful upload without remounting the uploader', async () => {
  const user = userEvent.setup()
  const client = { source: 'test-client' }
  render(<ProjectAssetManager client={client} projectId="project-1" />)

  expect(screen.getByLabelText('library props')).toHaveTextContent(
    'test-client project-1 refresh 0',
  )
  await user.click(screen.getByRole('button', { name: 'upload test-client project-1' }))
  expect(screen.getByLabelText('library props')).toHaveTextContent(
    'test-client project-1 refresh 1',
  )
  await user.click(screen.getByRole('button', { name: 'upload test-client project-1' }))
  expect(screen.getByLabelText('library props')).toHaveTextContent(
    'test-client project-1 refresh 2',
  )
})
