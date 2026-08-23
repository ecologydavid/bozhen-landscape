import { render, screen } from '@testing-library/react'
import GardenJournal from './GardenJournal'
import { gardenNotes } from '../../data/gardenNotes'

test('renders a complete three-note journal without empty article links', () => {
  const { container } = render(<GardenJournal notes={gardenNotes} />)

  expect(screen.getByRole('heading', { name: '曜聖庭園誌' })).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(3)
  gardenNotes.forEach(({ title, body }) => {
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText(body)).toBeInTheDocument()
  })
  expect(container.querySelector('a')).not.toBeInTheDocument()
})
