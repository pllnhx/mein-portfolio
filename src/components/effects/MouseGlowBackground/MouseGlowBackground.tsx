
import { useEffect, useRef } from 'react'
import styles from './MouseGlowBackground.module.css'

type MouseGlowProps = {
  color?: string
  size?: number
  speed?: number
  opacity?: number
  feather?: number
  points?: number
}

// Ein einzelnes Lichtteilchen
type Particle = {
  x: number
  y: number
  vx: number
  vy: number
}

function MouseGlowBackground({
  color = '#606787',
  size = 40,
  speed = 0.08,
  opacity = 0.7,
  feather = 90,
  points = 1
}: MouseGlowProps) {

  const spotRefs = useRef<(HTMLDivElement | null)[]>([])
  const speedRef = useRef(speed)

  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const count = Math.max(1, Math.min(5, Math.round(points)))
  const safeSize = Math.max(10, Math.min(100, size))
  const safeFeather = Math.max(0, Math.min(100, feather))

  // Bei vielen Punkten Durchmesser begrenzen
  const spotWidth =
    count === 1
      ? `${safeSize}vmin`
      : count === 2
        ? `min(${safeSize}vmin, 45vw, 45vh)`
        : `min(${safeSize}vmin, 28vw, 38vh)`

  useEffect(() => {
    const spots = spotRefs.current
      .slice(0, count)
      .filter((spot): spot is HTMLDivElement => spot !== null)

    if (spots.length !== count) return

    let width = window.innerWidth
    let height = window.innerHeight
    let diameter = spots[0].getBoundingClientRect().width

    const mouse = {
      x: width / 2,
      y: height / 2
    }

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value))

    // Teilchen mit eigenen Positionen und Geschwindigkeiten
    const particles: Particle[] = Array.from(
      { length: count },
      (_, index) => {
        const angle =
          ((index - 1) * Math.PI * 2) /
          Math.max(1, count - 1)

        const distance = index === 0 ? 0 : diameter * 1.2

        return {
          x: clamp(
            mouse.x + Math.cos(angle) * distance,
            diameter / 2,
            width - diameter / 2
          ),
          y: clamp(
            mouse.y + Math.sin(angle) * distance,
            diameter / 2,
            height - diameter / 2
          ),
          vx: 0,
          vy: 0
        }
      }
    )

    let frameId: number | null = null
    let lastMove = performance.now()

    function animate(time: number) {
      const radius = diameter / 2

      // FEDERKRAFT: Teilchen möchten zur Maus
      particles.forEach((particle, index) => {
        const angle =
          ((index - 1) * Math.PI * 2) /
          Math.max(1, count - 1)

        const offset = index === 0 ? 0 : diameter * 1.2

        const targetX = clamp(
          mouse.x + Math.cos(angle) * offset,
          radius,
          width - radius
        )

        const targetY = clamp(
          mouse.y + Math.sin(angle) * offset,
          radius,
          height - radius
        )

        const strength =
          Math.max(0.002, Math.min(0.2, speedRef.current * 0.32)) /
          (1 + index * 0.3)

        // Beschleunigung in Richtung Ziel
        particle.vx += (targetX - particle.x) * strength
        particle.vy += (targetY - particle.y) * strength

        // Reibung
        particle.vx *= 0.82
        particle.vy *= 0.82

        // Position aktualisieren
        particle.x += particle.vx
        particle.y += particle.vy
      })

      // KOLLISIONEN: Überlappungen auflösen
      for (let pass = 0; pass < 8; pass++) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i]
            const b = particles[j]

            let dx = b.x - a.x
            let dy = b.y - a.y
            let distance = Math.hypot(dx, dy)

            // Verhindert Division durch null
            if (distance < 0.001) {
              dx = 1
              dy = 0
              distance = 1
            }

            const minDistance = diameter + 1

            if (distance < minDistance) {
              const nx = dx / distance
              const ny = dy / distance
              const overlap = minDistance - distance

              // Teilchen räumlich trennen
              a.x -= nx * overlap / 2
              a.y -= ny * overlap / 2
              b.x += nx * overlap / 2
              b.y += ny * overlap / 2

              // Geschwindigkeit entlang Kollisionsrichtung
              const relativeVelocity =
                (b.vx - a.vx) * nx +
                (b.vy - a.vy) * ny

              if (relativeVelocity < 0) {
                const restitution = 0.75
                const impulse =
                  -(1 + restitution) * relativeVelocity / 2

                a.vx -= impulse * nx
                a.vy -= impulse * ny
                b.vx += impulse * nx
                b.vy += impulse * ny
              }
            }
          }
        }

        // KOLLISION MIT DEM BILDSCHIRMRAND
        particles.forEach((particle) => {
          if (particle.x < radius) {
            particle.x = radius
            particle.vx = Math.abs(particle.vx) * 0.6
          }

          if (particle.x > width - radius) {
            particle.x = width - radius
            particle.vx = -Math.abs(particle.vx) * 0.6
          }

          if (particle.y < radius) {
            particle.y = radius
            particle.vy = Math.abs(particle.vy) * 0.6
          }

          if (particle.y > height - radius) {
            particle.y = height - radius
            particle.vy = -Math.abs(particle.vy) * 0.6
          }
        })
      }

      // Positionen im Browser darstellen
      particles.forEach((particle, index) => {
        spots[index].style.transform =
          `translate3d(${particle.x}px, ${particle.y}px, 0) translate(-50%, -50%)`
      })

      // Animation bei Inaktivität pausieren
      if (time - lastMove < 2000) {
        frameId = requestAnimationFrame(animate)
      } else {
        frameId = null
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === 'touch') return

      mouse.x = event.clientX
      mouse.y = event.clientY
      lastMove = performance.now()

      if (frameId === null) {
        frameId = requestAnimationFrame(animate)
      }
    }

    function handleResize() {
      width = window.innerWidth
      height = window.innerHeight
      diameter = spots[0].getBoundingClientRect().width
      lastMove = performance.now()

      if (frameId === null) {
        frameId = requestAnimationFrame(animate)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('resize', handleResize)

    frameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('resize', handleResize)

      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [count, safeSize])

  return (
    <div className={styles.layer} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          ref={(element) => {
            spotRefs.current[index] = element
          }}
          className={styles.spot}
          style={{
            width: spotWidth,
            opacity: Math.max(0, Math.min(1, opacity)),
            
background: `radial-gradient(
  circle closest-side at center,
  ${color} ${100 - safeFeather}%,
  transparent 100%
)`

          }}
        />
      ))}
    </div>
  )
}

export default MouseGlowBackground
