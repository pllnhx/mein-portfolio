# Modulare Page Transitions

Die Seiten bleiben eigenständige Komponenten. `PageTransitionManager` ist ein persistentes Layout unter React Routers `createBrowserRouter`. Bestehende `Link`s, `useNavigate` und von React Router angelegte Browser-History-Einträge laufen über denselben Ablauf. Es sind ausschließlich die **ITTransition** und ein neutraler, kurzer Fallback implementiert; Art und Photography sind Erweiterungsbeispiele.

## Ausprobieren

```sh
npm run dev
# http://localhost:5173/transitions
npm test
npm run build
npm run lint
```

`/transitions` bietet eine **isolierte** IT-Enter/Leave-Vorschau, Reset, Dauer, Dichte, Geschwindigkeit, Glitch-Stärke, Reveal-Dauer und einen während des Reveals bedienbaren Fortschrittsregler. Die Vorschau wechselt keine echte Route. „Echte Navigation: IT-Seite“ und „IT per useNavigate“ prüfen die App-Navigation. Danach lassen sich Browser-Zurück und -Vorwärts benutzen. Reset wirkt auf die Vorschau; Escape bricht auch echte Übergänge ab.

## Zuständigkeiten

| Datei/Ordner | Aufgabe |
| --- | --- |
| `../router.tsx` | Vorhandene Routen, Data Router, Schutz gegen doppelte programmatische Navigation |
| `PageTransitionManager.tsx` | Router-Blocker, DOM-Mount-Barriere, Eingabesperre, Fokus, Scroll und Screenreader-Status |
| `TransitionRegistry.ts` | Reine Auswahl anhand von Quell- und Zielroute; Prioritäten, Routenpaare und gecachte Lazy Imports |
| `core/TransitionEngine.ts` | `idle → covering → switching → revealing → cleanup → idle`, Abbruch und Fehler-Fallback |
| `types.ts` | Öffentlicher, von React unabhängiger Modulvertrag |
| `effects/ITTransition/` | Sämtliche Matrix-, Terminal-, GSAP- und Glitch-Implementierung |
| `demo/` | Isolierte Vorschau; verwendet dieselbe Engine und dasselbe Modul |

Die Engine enthält keine Matrix-, Kunst-, Fotografie- oder Homepage-Logik. Effekte bekommen DOM-Elemente und einen `AbortSignal`; sie navigieren selbst **nicht**. GSAP und das IT-Modul liegen in einem separaten dynamischen Build-Chunk. Die Registry importiert beim Start nur Beschreibungen. Bei reduzierter Bewegung wird der IT-Chunk für einen Übergang überhaupt nicht angefordert.

Der bisherige `BrowserRouter` mit `Routes` wurde innerhalb derselben React-Router-Abhängigkeit auf `createBrowserRouter`/`RouterProvider` umgestellt: `useBlocker` benötigt den Data Router. Homepage und MouseGlowPage selbst bleiben unverändert. Die beiden IT-Sprungmarken sind jetzt Router-Links, damit auch ihre History-Einträge sauber restaurierbar bleiben.

## Ablauf und Bereitschaft

1. Der Router hält eine angeforderte Navigation an. Während des Übergangs werden weitere Klicks und programmatische Aufrufe verworfen; es entsteht keine Navigationswarteschlange.
2. Die Registry lädt ausschließlich das ausgewählte Modul. Dessen `cover()` blendet die Quellseite zu.
3. Nach `cover()` erzwingt die Engine zusätzlich einen vollständig schwarzen Hintergrund. **Erst jetzt** darf `commit()` den angehaltenen Router fortsetzen.
4. Der Manager wartet auf den React-Commit der neuen Location. Scroll-Restoration erfolgt unter Schwarz. Zwei Rendering-Frames, optionale Seiten-Bereitschaft, sichtbare Bilder und Fonts bilden die Bereitschaftsbarriere.
5. `reveal()` macht die bereits gemountete Zielseite sichtbar. Danach folgen Cleanup, Entsperren und Fokus auf `[data-page-focus]`, die erste `h1` oder `main`.

Bei Data-Router-Loadern bleibt die Verdeckung auch während des Ladens stehen. Die Standardseiten benötigen keine zusätzliche Bereitschafts-API. Eine zukünftige Seite mit eigener Initialisierung kann ein **stabiles** Promise registrieren:

```tsx
import { useTransitionReady } from '../../transitions/core/TransitionControls'

function ArtPage() {
  const [ready] = useState(() => initializeArtResources())
  useTransitionReady(ready)
  return <main><h1>Kunst</h1>{/* ... */}</main>
}
```

Die eigene Bereitschaft ist auf fünf Sekunden begrenzt, damit ein fehlgeschlagenes Promise keine dauerhaft gesperrte Navigation erzeugt. Sichtbare Bilder/Fonts erhalten zusätzlich bis zu 500 ms; bestehende Bild-Abmessungen halten das Layout stabil. Die sichtbare Animationsdauer ist daher circa 2,4 s **zuzüglich** Import-/Rendering-/Bereitschaftszeiten.

## IT konfigurieren

In `registry.ts`:

```ts
{
  id: 'it',
  match: '/it',
  priority: 0,
  duration: 2.4, // Sekunden, Cover + Reveal
  settings: {
    density: .85,        // .2–1.8
    speed: 1,            // .2–3
    glitchStrength: .45, // 0–1
    revealDuration: 1.15,
    showSuccess: true,
  },
  load: () => import('./effects/ITTransition').then(m => m.ITTransition),
}
```

Die Reveal-Dauer wird auf 20–75 % der Gesamtdauer begrenzt. Die Demo darf Einstellungen pro Durchlauf überschreiben. Reihenfolge der Werte: **Durchlauf → Registrierung → Modulstandard**. `match: '/it'` betrifft genau die IT-Übersicht: `/it → /it/mouseglow` ist Leave; die Rückkehr ist Enter. Für eine ganze Designfamilie kann `match` eine Funktion sein, z. B. `path => path === '/art' || path.startsWith('/art/')`.

Der Renderer verwendet begrenzte Canvas-2D-Zeichenströme, unterschiedliche Geschwindigkeiten und Traillängen, DPR maximal 2 und ResizeObserver/Resize-Fallback. Er erzeugt keine DOM-Elemente pro Matrix-Zeichen. Cover/Reveals laufen über eigene GSAP-Timelines. Canvas-Frames, Observer, Timelines, Abort-Listener, Styles und Effekt-DOM werden bei Ende oder Abbruch freigegeben.

## Modulvertrag

```ts
interface TransitionModule<S extends TransitionSettings> {
  id: string
  duration: number
  settings: S
  enter(context: TransitionContext<S>): TransitionInstance
  leave(context: TransitionContext<S>): TransitionInstance
}

interface TransitionInstance {
  cover(): Promise<void>   // erst bei vollständiger Verdeckung erfüllen
  reveal(): Promise<void>  // erst bei komplett ausgeblendetem Effekt erfüllen
  finished: Promise<'completed' | 'cancelled'>
  cancel(reason?: string): void
  cleanup(): void          // idempotent, auch nach abgebrochenem Cover
  seekReveal?(progress: number): void // optionale Demo-Steuerung 0–1
}
```

`context` liefert `mount`, `backdrop`, `source`, `from`, `to`, `action` (`PUSH`, `REPLACE`, `POP`), `duration`, gemergte `settings`, `signal` und `onProgress`. Der Effekt darf nur sein eigenes DOM in `mount`, den übergebenen Hintergrund und temporäre, beim Cleanup zurückgenommene Wrapper-Darstellung steuern. Keine globalen Selektoren, Router-Aufrufe, dauerhaft veränderte Seiten oder globale GSAP-Kills verwenden.

`cancel()` muss aktive Phasen-Promises beenden/abweisen und `finished` auflösen; `cleanup()` muss danach immer funktionieren. Vor `switching` bleibt bei Abbruch die Quellseite erhalten. Ist das Umschalten bereits begonnen, wird die Zielseite zuerst unter Schwarz fertig gemountet; anschließend wird das Reveal übersprungen. So gibt es keinen halben Routenwechsel. Fehlerhafte Imports/Animationen fallen auf einen kurzen neutralen Übergang zurück. Hard Reloads und Navigation zu fremden Origins bleiben native Browser-Navigation.

## ArtTransition und PhotographyTransition hinzufügen

**Es werden hier keine fertigen Kunst- oder Fotografie-Animationen angelegt.** Für Art zunächst einen eigenen Ordner mit eigener Implementierung anlegen:

```text
effects/ArtTransition/
  index.ts                 # ArtTransition + getrennte enter/leave-Varianten
  ArtTransition.module.css
  ArtRenderer.ts           # optionaler eigener Renderer

effects/PhotographyTransition/
  index.ts
  PhotographyTransition.module.css
  PhotographyRenderer.ts
```

In `ArtTransition/index.ts` den Vertrag exportieren; `createArtInstance` ist deine spätere eigene Visual-Implementierung, die `cover/reveal/cancel/cleanup/finished` erfüllt:

```ts
import type { TransitionModule } from '../../types'

export const ArtTransition: TransitionModule = {
  id: 'art', duration: 1.8, settings: { brushDensity: .6 },
  enter: ctx => createArtInstance(ctx, 'enter'),
  leave: ctx => createArtInstance(ctx, 'leave'),
}
```

Für Photography analog ein eigenes `PhotographyTransition`-Objekt mit `id: 'photography'`, eigener Dauer, eigenen Settings und eigener Factory. Die beiden Module dürfen weder voneinander noch von `ITTransition` importieren. Dann **erst nach Anlegen der Module und Seiten** registrieren:

```ts
transitionRegistry
  .register({
    id: 'art', match: '/art', priority: 0,
    load: () => import('./effects/ArtTransition').then(m => m.ArtTransition),
  })
  .register({
    id: 'photography', match: '/photography', priority: 0,
    load: () => import('./effects/PhotographyTransition').then(m => m.PhotographyTransition),
  })
```

Die tatsächlichen Seiten zusätzlich in `portfolioRoutes()` eintragen, z. B. `{ path: 'art', element: <ArtPage /> }`. Engine und Manager werden nicht geändert.

**Konkrete Auswahl:** Bei `/it → /art` gewinnt standardmäßig IT-Leave; bei `/art → /photography` Art-Leave. Soll Photography-Enter gewinnen, `enterPriority: 10` an dessen Registrierung setzen. `leavePriority` kann unabhängig gesetzt werden. Explizite Routenpaare haben Vorrang vor beiden allgemeinen Regeln:

```ts
transitionRegistry.registerPair({
  from: '/art', to: '/photography',
  id: 'photography', direction: 'enter', priority: 100,
})
```

Mehrere passende Routenpaare werden nach `priority` sortiert. Ohne Paar gewinnt die höhere Varianten-Priorität, bei Gleichstand die Leave-Variante.

## Ein einzelnes Modul weitergeben

Für IT reicht der Ordner `effects/ITTransition/`, der öffentliche Vertrag aus `types.ts` und die Abhängigkeit `gsap`. Das Modul importiert zur Laufzeit weder React noch Registry, Engine oder Portfolio-Seiten. Im Zielprojekt den Typ-Import anpassen und die CSS-Module-Verarbeitung des Bundlers nutzen. Eine fremde Engine kann die Factory ebenso aufrufen, solange sie den Cover-/Commit-/Reveal-Vertrag einhält. Den gesamten Manager zu übernehmen ist optional.

## Tests und Grenzen

`npm test` prüft Registry/Prioritäten/Routenpaare/Lazy Loading, Zustandsfolge, Opaque-Commit, Bereitschaft, doppelte Navigation, Abbruch und Fehler-Fallback. React-Integrationstests verwenden `createBrowserRouter` in **jsdom**, echte Link-Ereignisse, `useNavigate`, `window.history.back()/forward()`, Fokus/Scroll und das echte GSAP-/Canvas-Modul mit einem simulierten Canvas-Kontext. Die isolierte Demo wird ebenfalls getestet. Das ersetzt keine visuelle Prüfung in einem verbundenen Browser oder auf einem Mobilgerät.

Browser-History außerhalb React Routers (manuelles `history.pushState`, fremde Origins, Hard Reloads) kann der SPA-Blocker nicht zuverlässig abfangen; dafür keine eigenen History-Hacks ergänzen. Direkter Einstieg in eine Seite spielt keine Intro-Transition. Neue, längere Seiteninitialisierung über Data-Router-Loader oder `useTransitionReady` bereitstellen, nicht über versteckte Zeitverzögerungen.
