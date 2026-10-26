
import { useState } from 'react'
import { Link } from 'react-router'

import MouseGlowBackground from '../../components/effects/MouseGlowBackground/MouseGlowBackground'
import styles from './MouseGlowPage.module.css'

function MouseGlowPage() {

  // Unsere drei veränderbaren Einstellungen
  const [color, setColor] = useState('#8B5CF6')
  const [size, setSize] = useState(50)
  const [speed, setSpeed] = useState(0.05)
    const [opacity, setOpacity] = useState(70)
    const [feather, setFeather] = useState(90)
    const [points, setPoints] = useState(1)


  return (
    <>
      {/* Hintergrund mit dynamischen Props */}
      
<MouseGlowBackground
  color={color}
  size={size}
  speed={speed}
  opacity={opacity / 100}
  feather={feather}
  points={points}
/>


      <main className={styles.page}>

        <p className={styles.kicker}>
          IT / WEB EXPERIMENTS
        </p>

        <h1 className={styles.title}>
          MouseGlow Background
        </h1>

        <p className={styles.description}>
          Mein erstes interaktives Webdesign-Experiment.
          Experimentiere mit dem Effekt und passe
          seine Eigenschaften selbst an.
        </p>

        <Link to="/it" className={styles.backLink}>
          ← Zurück zur IT-Übersicht
        </Link>

        <section>

          <h2 className={styles.sectionTitle}>
            Projektvorschau
          </h2>

          <h2 className={styles.sectionTitle}>
            Interaktive Live-Demo
          </h2>

          <p>
            Bewege deine Maus über die Seite und
            verändere die folgenden Einstellungen.
          </p>

          <div className={styles.demoControls}>

            {/* FARBE */}
            <div className={styles.control}>
              <label htmlFor="glow-color">
                Lichtfarbe
              </label>

              <input
                id="glow-color"
                type="color"
                value={color}
                onChange={(event) =>
                  setColor(event.target.value)
                }
              />
            </div>

            {/* GRÖSSE */}
            <div className={styles.control}>
              <label htmlFor="glow-size">
                Größe: {size}%
              </label>

              <input
                id="glow-size"
                type="range"
                min="10"
                max="100"
                step="5"
                value={size}
                onChange={(event) =>
                  setSize(Number(event.target.value))
                }
              />
            </div>

            {/* GESCHWINDIGKEIT */}
            <div className={styles.control}>
              <label htmlFor="glow-speed">
                Geschwindigkeit: {speed.toFixed(2)}
              </label>

              <input
                id="glow-speed"
                type="range"
                min="0.02"
                max="0.3"
                step="0.01"
                value={speed}
                onChange={(event) =>
                  setSpeed(Number(event.target.value))
                }
              />
            </div>


{/* DECKKRAFT */}
<div className={styles.control}>
  <label htmlFor="glow-opacity">
    Deckkraft: {opacity}%
  </label>

  <input
    id="glow-opacity"
    type="range"
    min="0"
    max="100"
    step="5"
    value={opacity}
    onChange={(event) =>
      setOpacity(Number(event.target.value))
    }
  />
</div>

{/* FEATHER */}
<div className={styles.control}>
  <label htmlFor="glow-feather">
    Feather: {feather}%
  </label>

  <input
    id="glow-feather"
    type="range"
    min="0"
    max="100"
    step="5"
    value={feather}
    onChange={(event) =>
      setFeather(Number(event.target.value))
    }
  />
</div>

{/* ANZAHL LICHTPUNKTE */}
<div className={styles.control}>
  <label htmlFor="glow-points">
    Lichtpunkte: {points}
  </label>

  <input
    id="glow-points"
    type="range"
    min="1"
    max="5"
    step="1"
    value={points}
    onChange={(event) =>
      setPoints(Number(event.target.value))
    }
  />
</div>


          </div>
        </section>
      </main>
    </>
  )
}

export default MouseGlowPage
