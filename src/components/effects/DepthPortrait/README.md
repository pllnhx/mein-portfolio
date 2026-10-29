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

`createDepthPortrait` erzeugt ein zusammenhängendes, transparentes WebGL-Tiefennetz. Die Depthmap wird einmal in ein kleines Raster eingelesen und für die Geometrie geglättet. Die Bewegung verschiebt die Netzpunkte vorwärts; Foto, Roughness und Alphamaske behalten ihre gemeinsamen, unveränderten Bildkoordinaten. Die hochauflösenden Bild- und Maskentexturen werden dabei nicht geglättet.

Die frühere iterative Rückwärts-Abtastung konnte an harten Übergängen zwischen Hintergrund und Person zwischen mehreren Lösungen springen. Dadurch entstanden doppelte Konturen und ausgeschnittene Streifen. Der neue Renderer begrenzt die Verformung anhand der Tiefengradienten, sodass die Netzflächen ihre Orientierung behalten. Ein transparenter Canvas-Rand von 4 % je Seite bietet Platz für die Bewegung. Die Bewegung wird radial weich begrenzt, damit Diagonalen nicht stärker ziehen. Bereits im Original angeschnittene Bildränder werden dezent ins Weiß ausgeblendet.

Das statische Foto und das Canvas werden ohne Kreuzüberblendung ausgetauscht, nachdem das erste GPU-Bild gezeichnet wurde. Beim Resize wird der Zeichenpuffer nur bei tatsächlicher Größenänderung neu angelegt und sofort neu gezeichnet.

Die gemeinsam verwendete Maus-Uniform `uPointer` hat in beiden Shadern explizit `mediump`-Präzision. Unterschiedliche implizite Defaults (`highp` im Vertex-Shader, `mediump` im Fragment-Shader) verhindern unter WebGL 1 das Linken des Programms und würden deshalb nur das statische Ersatzfoto anzeigen. Ein Regressionstest prüft diesen Shader-Vertrag. Falls der Renderer aus einem anderen Grund nicht startet, gibt die Entwicklungsumgebung die Ursache in der Konsole aus.

Das Licht folgt der geglätteten Mausposition. Tiefengradienten und eine auf das vorhandene Visier abgestimmte gekrümmte Normale beeinflussen den Glanz. Die fotografierte Reflexion bleibt mit dem Foto registriert; der Shader ergänzt ein bewegliches Glanzlicht und eine weiche Lichtkante. Eine zusätzliche lokale Bildverschiebung an der Visierkante entfällt. Das ist ein 2,5D-Fotoeffekt, dessen Ausgangsmaterial weiterhin das Originalfoto ist.

Die Visierregion ist auf dieses Motiv kalibriert (`imageUv`, Zentrum/Radien in `shaders.ts`). Beim Austausch des Fotos auch diesen Bereich und die vier Maps anpassen.

## Einstellungen

In `PORTRAIT_SETTINGS`:

- `parallax`: Standard `.018`, Stärke der Tiefenbewegung; zusätzlich durch den Gradienten-Schutz begrenzt.
- `reflection`: Standard `.85`, Stärke des zusätzlichen Glanzlichts.
- `maxDpr`: Standard `1.75`, begrenzt die Auflösung des Zeichenpuffers.
- `gutter`: Standard `.04`, transparente Bewegungsreserve um das Porträt; keine Vergrößerung des Fotos.
- `maxPointer`: Standard `.85`, weiche radiale Begrenzung der Mausantwort.

Der Renderer zeichnet nur bei einer Änderung und während des kurzen Nachlaufens der Maus. Er pausiert außerhalb des sichtbaren Bereichs, im Hintergrund und sobald die Projektfläche das Porträt verdeckt. Alle Texturen, Shader, Buffer, Observer, Listener und Frames werden beim Abbau freigegeben. Context Loss schaltet auf das statische Bild zurück; nach Context Restore wird der Renderer erneut aufgebaut.

Ohne WebGL und bei `prefers-reduced-motion` bleibt das Originalfoto mit derselben Luminanzmaske sichtbar. Die Komponente meldet Bereitschaft an den PageTransitionManager, damit die Rückkehr zur Homepage hinter dem Übergangs-Overlay vorbereitet werden kann.

## Projektkarten

Die Homepage aktiviert `ProjectCard` mit `variant="glass"`. Eine gemeinsame WebGL2-Fläche zeichnet das gemusterte Royalblau und die Brechung durch die Glaskarten. DOM-Texte und einzelne Vorschaubilder bleiben scharf darüber. Ohne WebGL greift eine transparente CSS-Darstellung mit Backdrop-Blur. Die frühere zweite, verzerrte Kopie des Vorschaubilds entfällt. Architektur, Referenz und Fallback sind in [LiquidGlassProjectCard](../../ui/LiquidGlassProjectCard/README.md) dokumentiert.

Die zweite Fläche ist eine Scroll-Sektion derselben Route: Ein sticky Hero bleibt darunter stehen, während die höher geschichtete Projektsektion darübergleitet. Die blaue Fläche ragt mit `--project-peek` bereits im ersten Viewport 68–108 px nach oben. Das Porträt sitzt zusätzlich etwas tiefer; sein angeschnittener beziehungsweise weich ausgeblendeter Quellrand bleibt dadurch hinter der Fläche.

`HomePage/useHomeProjectMotion.ts` bewegt den Projektinhalt beim Scrollen langsamer nach oben (70 % der normalen Geschwindigkeit, mobil 82 %). `homeProjectMath.ts` berechnet den zusätzlichen Platz so, dass der Footer trotzdem genau mit seinem regulären unteren Abstand endet. Filterwechsel und Resize werden neu vermessen. Der Hintergrund bewegt sich unabhängig mit 40 % der normalen Geschwindigkeit; der Renderer liest weiterhin die tatsächlichen Kartenrechtecke. `data-project-reveal`-Inhalte erscheinen beim Eintritt in den Viewport einmal mit einem kurzen Fade und leichtem Versatz. Tastaturfokus macht sie sofort sichtbar. Ohne IntersectionObserver sowie bei reduzierter Bewegung bleiben Inhalte sichtbar; reduzierte Bewegung deaktiviert außerdem die Scroll-Verzögerung. Die Projektliste stammt weiterhin aus `src/data/projects.ts`.

## Prüfen

`npm test` prüft außerdem harte Tiefenkanten, diagonale Mauspositionen, den Erhalt der Dreiecksorientierung und das Einhalten der Canvas-Ränder. Weitere Tests decken Zeiger-Normalisierung, Glättung, Map-Bindings, DPR-Grenze, Ruhe im Leerlauf, Abbruch, Context Loss und Ressourcen-Cleanup ab. `node --test src/pages/HomePage/*.test.mjs` prüft die zusätzliche Scrollstrecke, den Footer-Abschluss, kurze Filterergebnisse und reduzierte Bewegung. Die Router-Integration prüft zusätzlich die Homepage und ihre Projektfilter. Shader-Pixel, Glasoptik und die mobile Komposition müssen visuell im Browser beurteilt werden.
