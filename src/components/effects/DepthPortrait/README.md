# DepthPortrait

Die Homepage verwendet die vier deckungsgleichen Dateien aus `public/images`:

| Datei | Aufgabe |
| --- | --- |
| `Dudi.png` | unverändertes Originalfoto |
| `alphamaske.png` | Weiß sichtbar, Schwarz transparent; schneidet die Person auf Weiß frei |
| `Depthmap.png` | Weiß näher, Schwarz weiter entfernt; steuert die Tiefenparallaxe |
| `roughness.webp` | Dunkel glatt/reflektierend, Hell matt; begrenzt den Glanz auf das Visier |

`LogoPP.png` wird separat im Header dargestellt. Alle URLs stehen in `portraitAssets.ts`. Die Maps müssen dasselbe Seitenverhältnis wie das Foto haben; unterschiedliche Auflösungen sind möglich.

## Rendering

`createDepthPortrait` erzeugt eine transparente WebGL-Plane. Fünf Tiefen-Abtastungen verschieben die Bildkoordinaten abhängig von der Mausposition. Foto, Depthmap, Roughness und Alphamaske verwenden dieselben Koordinaten. Ein kleiner Overscan vermeidet offene Bildränder.

Das Licht folgt der geglätteten Mausposition. Tiefengradienten und eine auf das vorhandene Visier abgestimmte gekrümmte Normale beeinflussen den Glanz. Die fotografierte Reflexion wird im Visier zusätzlich leicht verschoben; der Shader ergänzt ein bewegliches Glanzlicht und eine weiche Lichtkante. Das ist ein 2,5D-Fotoeffekt, dessen Ausgangsmaterial weiterhin das Originalfoto ist.

Die Visierregion ist auf dieses Motiv kalibriert (`imageUv`, Zentrum/Radien in `shaders.ts`). Beim Austausch des Fotos auch diesen Bereich und die vier Maps anpassen.

## Einstellungen

In `PORTRAIT_SETTINGS`:

- `parallax`: Standard `.025`, Stärke der Tiefenbewegung.
- `reflection`: Standard `.85`, Stärke des zusätzlichen Glanzlichts.
- `maxDpr`: Standard `1.75`, begrenzt die Auflösung des Zeichenpuffers.

Der Renderer zeichnet nur bei einer Änderung und während des kurzen Nachlaufens der Maus. Er pausiert außerhalb des sichtbaren Bereichs, im Hintergrund und sobald die Projektfläche das Porträt verdeckt. Alle Texturen, Shader, Buffer, Observer, Listener und Frames werden beim Abbau freigegeben. Context Loss schaltet auf das statische Bild zurück; nach Context Restore wird der Renderer erneut aufgebaut.

Ohne WebGL und bei `prefers-reduced-motion` bleibt das Originalfoto mit derselben Luminanzmaske sichtbar. Die Komponente meldet Bereitschaft an den PageTransitionManager, damit die Rückkehr zur Homepage hinter dem Übergangs-Overlay vorbereitet werden kann.

## Projektkarten

Die Homepage aktiviert `ProjectCard` mit `variant="glass"`. `LiquidGlassProjectCard` kombiniert tatsächliches `backdrop-filter`-Blur mit transparenten Flächen, feinen Lichtkanten und einem SVG-Displacement auf einer separaten Kopie des Vorschaubilds. Der Text wird nicht verzerrt. Die Lichtkante folgt dem Zeiger. Der SVG-Filter wird als normaler Bildfilter verwendet, damit die Umsetzung nicht von der eingeschränkten Unterstützung von SVG-URLs in `backdrop-filter` abhängt. IT- und Standardkarten behalten ihre Varianten.

Die zweite Fläche ist bewusst eine Scroll-Sektion derselben Route: Ein sticky Hero bleibt darunter stehen, während die höher geschichtete Projektsektion darübergleitet. Die Projektliste stammt weiterhin aus `src/data/projects.ts`.

## Prüfen

`npm test` prüft Zeiger-Normalisierung, Glättung, Map-Bindings, DPR-Grenze, Ruhe im Leerlauf, Abbruch, Context Loss und Ressourcen-Cleanup. Die Router-Integration prüft zusätzlich die neue Homepage und ihre Projektfilter. Shader-Pixel, Glasoptik und die mobile Komposition müssen visuell im Browser beurteilt werden.
