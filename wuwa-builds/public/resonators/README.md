# Resonator art

Add full-body, transparent PNG or WebP character art to this folder.

By default, the app looks for a `.webp` file based on the `character` value in `public/builds.json`:

- `"character": "Jinhsi"` → `public/resonators/jinhsi.webp`
- `"character": "Rover"` → `public/resonators/rover.webp`
- `"character": "Yinlin"` → `public/resonators/yinlin.webp`

Names are lowercased, accents are removed, and spaces become hyphens. To use another filename or image format, add an `image` property to that build object, for example:

```json
"image": "/resonators/jinhsi-render.png"
```
