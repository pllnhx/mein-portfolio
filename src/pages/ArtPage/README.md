# Atelier

Die Kunstübersicht liegt unter `/art`, die sieben Galerien unter `/art/:category`.
`ArtLayout` teilt Papierhintergrund, Navigation und Werkzeug-Dock. CSS Modules
begrenzen die Gestaltung auf den Kunstbereich.

## Eigene Werke ergänzen

1. Das Bild in `public/art/works/` ablegen.
2. In `src/data/art.ts` einen Eintrag zu `artworks` hinzufügen:

```ts
{
  id: 'eindeutiger-werkname',
  category: 'graphit',
  title: 'Titel des Werks',
  image: '/art/works/dateiname.jpg',
  alt: 'Beschreibung des sichtbaren Motivs',
}
```

Die Kategorie ist einer dieser Werte: `graphit`, `kohle`, `buntstifte`, `acryl`,
`oel`, `skizzen`, `wasserfarbe`. Der Leerzustand verschwindet automatisch, sobald
Werke für die jeweilige Kategorie vorliegen.

## Assets und Interaktion

- `public/art/paper.png` ist die vom Nutzer gelieferte Papiertextur.
- `public/art/letters/` enthält fünf separat mit Imagegen erzeugte transparente
  PNGs sowie das verwendete Promptset und die Alpha-Metadaten.
- `artToolModels.ts` baut sieben echte Three.js-Modelle aus wiederverwendbaren
  Geometrien und lokalen, deterministischen Materialtexturen.
- `artDockScene.ts` lädt erst im Kunstbereich und zeichnet alle Modelle mit einem
  gemeinsamen WebGL-Canvas. Die Links bleiben bei fehlendem WebGL bedienbar.
- `PaintDrips` findet die untere Farbkante des T anhand seines Alphakanals.
  Sichtbarkeitswechsel, reduzierte Bewegung und das Verlassen der Seite werden
  sowohl vom Tropfeneffekt als auch vom Dock berücksichtigt.

## Prüfen

```sh
npm test
npm run build
```

Die Interaktionstests prüfen Tropfen-Timing, reduzierte Bewegung, WebGL-Verlust,
Maus/Tastatur und das Freigeben von GPU-Ressourcen. Zusätzlich im Browser
Desktop/Tablet/Smartphone, horizontales Wischen und direkte Galerieaufrufe prüfen.
