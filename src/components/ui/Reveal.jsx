import { useReveal } from '../../hooks/useReveal'

export default function Reveal({ as: Element = 'div', className = '', children }) {
  const [ref, visible] = useReveal()

  return (
    <Element
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </Element>
  )
}
