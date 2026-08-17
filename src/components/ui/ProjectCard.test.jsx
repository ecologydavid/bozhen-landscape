import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { projects } from '../../data/projects'
import ProjectCard from './ProjectCard'

test('renders meaningful project metadata and focal positioning', () => {
  const { container } = render(
    <MemoryRouter>
      <ProjectCard project={projects[0]} />
    </MemoryRouter>,
  )
  expect(screen.getByText('彰化・住宅庭園')).toBeInTheDocument()
  expect(screen.getByText('庭園整理')).toBeInTheDocument()
  expect(screen.getByText('植栽修剪')).toBeInTheDocument()
  expect(screen.getByRole('img')).toHaveStyle({
    objectPosition: projects[0].focalPoint,
  })
  expect(container.querySelector('.project-card__index')).not.toBeInTheDocument()
})
