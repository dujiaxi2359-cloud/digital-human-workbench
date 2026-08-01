import { useRef } from 'react'
import './SpotlightCard.css'

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(0, 113, 227, 0.08)' }) {
  const cardRef = useRef(null)

  const handleMouseMove = (event) => {
    if (!cardRef.current) return
    const bounds = cardRef.current.getBoundingClientRect()
    cardRef.current.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`)
    cardRef.current.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`)
    cardRef.current.style.setProperty('--spotlight-color', spotlightColor)
  }

  return <div ref={cardRef} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`}>{children}</div>
}
