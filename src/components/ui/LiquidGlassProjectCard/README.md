# Liquid Glass project cards

The homepage pairs `LiquidGlassProjectCard` with **one** `LiquidGlassBackdrop` canvas in its project section. Other `ProjectCard` variants stay independent. The DOM card keeps links, headings, artwork, descriptions and status accessible and sharp; all decorative rendering is `aria-hidden` and ignores pointer events.

```tsx
const section = useRef<HTMLElement>(null)
return <section ref={section}>
  <LiquidGlassBackdrop containerRef={section} />
  <div className={styles.content}>
    <LiquidGlassProjectCard title="Example" category="IT" description="…" status="Fertig" />
  </div>
</section>
```

The section needs `position: relative; overflow: clip`. Place its content at `position: relative; z-index: 1` above the canvas. Cards register with `data-liquid-glass-card` automatically. The renderer reads their rectangles, so responsive grid changes and filters need no duplicated layout data.

## Rendering and reference

The shader adapts the SDF/edge-refraction approach from [Liquid Glass Studio](https://github.com/iyinchao/liquid-glass-studio), specifically its [main shader](https://github.com/iyinchao/liquid-glass-studio/blob/main/src/shaders/fragment-main.glsl). The upstream Snell-law lens profile, RGB dispersion and Fresnel/glare idea are fitted to static portfolio panes. Its MIT notice is included in `THIRD_PARTY_LICENSE.txt`. This is a focused adaptation, without the studio application's MUI, Leva, editor, WebGPU backend or animation engine.

`glassShaders.ts` draws an analytic royal-blue background with a 64px grid, soft diagonal light ribbons and glass panes. The very same background function supplies every refracted sample; refraction cannot drift away from the page pattern. Separate red/green/blue samples bend near the rounded rim, with a short five-tap background blur and steady directional rim light. The project images are rendered only once, as undistorted DOM thumbnails. This renderer refracts the section's own procedural backdrop; it does not attempt to screenshot arbitrary HTML behind the cards.

All geometry uses section CSS pixels. On scroll the canvas occupies only the section's visible intersection with the viewport, with `uWorldTop` translating pixel coordinates back to the section. `uBackgroundOffset` shifts only background sampling by minus 60% of section scroll, so the backdrop travels at 40% of normal scroll speed. Card rectangles are read from their actual DOM bounds, including the homepage content's independent vertical drift. The CSS fallback receives the opposite `background-position` offset and continues moving without WebGL or after context loss. The buffer is capped at DPR 1.5 and roughly two million pixels. Only visible cards are sent to the shader (maximum sixteen; if a future layout exposes more simultaneously, the entire section retains its CSS fallback). Scroll, resize, filter and `project-layout` events invalidate a single frame; there is no continuous canvas loop, and hidden documents do not draw. Uniform locations are cached once, and the program, buffer, shaders, observers, listeners and queued frame are freed on disposal.

The card's `topRow`, `body` and `footer` carry `data-project-reveal`, with delays of 0/80/140 ms for the homepage reveal controller. The card container itself is never translated or scaled by these reveals, keeping its WebGL lens aligned.

Before the first successful draw, without WebGL2 or on context loss, CSS provides the blue grid and translucent blurred panes. `data-glass-renderer="webgl"` disables the CSS card blur/background after the GPU image is ready, avoiding a second blur over the refraction. Context loss atomically returns to CSS while its scroll controller continues; remounting retries WebGL. Reduced motion disables the background drift while preserving normal scroll alignment. In the CSS-only fallback the background approximates the shader's light ribbons while sharing its base blue and 64px grid.

## Verification

`node --test src/components/ui/LiquidGlassProjectCard/*.test.mjs` checks independent background sampling/card registration, CSS-only parallax, reduced motion, viewport allocation, DPR, the buffer budget, idle/queued frames, cleanup, unsupported contexts, shader failure and context-loss fallback. GPU shader output and the final glass appearance still require a real WebGL2 browser.
