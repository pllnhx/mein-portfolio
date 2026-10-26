
# MouseGlowBackground

Version: 1.0

## Beschreibung

Ein interaktiver Hintergrund mit einem radialen
Farbverlauf, der dem Mauszeiger weich und
zeitverzögert folgt.

## Funktionen

- Reagiert auf Mausbewegungen
- Weiche Bewegung durch Interpolation (Lerp)
- Anpassbare Farbe
- Anpassbare Größe
- Anpassbare Geschwindigkeit
- Blockiert keine Mausklicks
- Animation stoppt automatisch bei Stillstand

## Benötigte Dateien

- MouseGlowBackground.tsx
- MouseGlowBackground.module.css

## Voraussetzungen

- React
- TypeScript
- CSS Modules

Keine zusätzlichen Animationsbibliotheken nötig.

## Installation

1. Den Ordner MouseGlowBackground in
   src/components/effects/ kopieren.

2. Komponente in App.tsx importieren:

import MouseGlowBackground from
'./components/effects/MouseGlowBackground/MouseGlowBackground'

3. Komponente innerhalb des JSX verwenden:

<MouseGlowBackground
  color="#606787"
  size={40}
  speed={0.08}
/>

## Props

color:
- Typ: string
- Standard: "#606787"
- Bestimmt die Lichtfarbe

size:
- Typ: number
- Standard: 40
- Bestimmt die Ausdehnung des Farbverlaufs
- Angabe in Prozent

speed:
- Typ: number
- Standard: 0.08
- Bestimmt die Geschwindigkeit
- Gültige Werte: größer 0 bis 1
- Kleinere Werte = stärkere Verzögerung

## Hinweise

- Die Komponente nimmt die gesamte
  sichtbare Browserfläche ein.
- Der restliche Seiteninhalt sollte über
  dem Hintergrund liegen, z. B. mit
  position: relative und z-index: 1.
- Die Seite benötigt eine Grundfarbe als
  Hintergrund, z. B. #1c1e2c.
- Auf Touchgeräten bleibt der Hintergrund
  auf seiner Ausgangsposition.
- Bei mehreren Instanzen können sich
  die Hintergründe gegenseitig überlagern.

## Weiterentwicklung

- [ ] Mehrere Lichtflecken
- [ ] Anpassbare Intensität
- [ ] Geschwindigkeit zeitbasiert berechnen
- [ ] Bewegung auf Touchgeräten
- [ ] Automatische Anpassung an Bildschirmgröße
