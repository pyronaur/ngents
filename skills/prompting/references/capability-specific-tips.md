# Capability-Specific Tips

## Read when

- Need vision-centric prompt tactics (image extraction, zoom/crop workflows).
- Need explicit frontend aesthetics steering to avoid generic outputs.

## Capability-specific tips

### Improved vision capabilities

Vision-capable models can be strong at image processing and data extraction tasks, particularly when there are multiple images present in context. These improvements carry over to computer-use agents, where the model can more reliably interpret screenshots and UI elements. You can also analyze videos by breaking them up into frames.

One technique that often boosts performance is giving the model a crop/zoom tool. Performance improves when the model can “zoom” in on relevant regions of an image.

### Frontend design

Some models excel at building complex, real-world web applications with strong frontend design. However, without guidance, models can default to generic patterns that create what users call an “AI slop” aesthetic. To create distinctive, creative frontends:

Here's a system prompt snippet you can use to encourage better frontend design:

```text
<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight.

Focus on:
- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use a motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. Avoid converging on the same defaults across generations.
</frontend_aesthetics>
```
