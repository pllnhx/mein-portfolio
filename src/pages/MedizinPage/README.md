# Medizin

Der Medizinbereich liegt unter `/medizin`. Er ist ein bewusst neutrales
Grundgerüst mit sichtbaren Bildplatzhaltern und ohne erfundene persönliche
Angaben, Qualifikationen oder Projekte.

## Bilder ersetzen

Die lokalen SVGs liegen in `public/medizin/`:

- `portrait-placeholder.svg`: 900 × 1100 px, Hero im Porträtformat.
- `detail-placeholder.svg`: 1200 × 900 px, organische Detailansicht.
- `study-placeholder.svg`: 1100 × 800 px, abstrakte räumliche Studie.
- `vascular-overlay.svg`: 900 × 1100 px, transparente schematische Gefäßstudie,
  exakt auf die Profilbüste abgestimmt.

Für echte Bilder die Dateien an diesen Pfaden ersetzen oder die Bildpfade in
`MedizinPage.tsx` bzw. `InteractivePortrait.tsx` anpassen. Bei einem neuen Porträt
auch das Gefäß-Overlay auf das neue Motiv abstimmen. Seitenverhältnisse und passende Alternativtexte
beibehalten; sichtbare Platzhalterhinweise beim Einsetzen echter Inhalte
entsprechend aktualisieren. Echte Inhalte und persönliche Angaben werden erst
ergänzt, wenn sie vorliegen.

## Interaktion

Das Profil zeigt beim Überfahren oder Tastaturfokus die schematische Gefäßansicht.
Die Scan-Linse folgt der Maus. Klick/Enter fixiert die Ansicht, ein weiterer
Klick/Enter löst sie; Escape schließt sie. Auf Touchgeräten schaltet Tippen die
vollständige Ansicht um. Die Grafik ist eine Designstudie, keine Lehrdarstellung.

`useMedizinMotion` steuert Bildparallaxen, Mausreaktionen, Einblendungen und den
Lesefortschritt über einen gemeinsamen, bei Stillstand schlafenden Frame-Loop.
Reduzierte Bewegung und unsichtbare Tabs pausieren die Bewegung; Inhalte und
Gefäßansicht bleiben bedienbar. Beim Verlassen werden Listener, Observer und
Frame-Anfragen entfernt.

## Prüfen

```sh
npm test
npm run build
```

Zusätzlich `/medizin` direkt öffnen und Home-Links, Inhaltsanker,
Tastaturbedienung sowie Desktop- und Mobilansicht im Browser prüfen. Die Tests
decken Hover/Touch/Tastatur, Scan-Koordinaten, Reduced Motion, Sichtbarkeit und
das Freigeben der Effekte ab.
