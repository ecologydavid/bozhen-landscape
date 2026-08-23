import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProjectCard from './ProjectCard'
import { projects } from '../../data/projects'

test('shows concise evidence without crowding the image', () => {
  const project = projects[0]
  render(
    <MemoryRouter>
      <ProjectCard project={project} index="01" />
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: `查看案例：${project.title}` })).toBeInTheDocument()
  expect(screen.getByText(project.location)).toBeInTheDocument()
  expect(screen.getByText(project.summary)).toBeInTheDocument()
  expect(screen.getByRole('list', { name: `${project.title}服務內容` })).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  project.services.slice(0, 2).forEach((service) => {
    expect(screen.getByText(service)).toBeInTheDocument()
  })
})
