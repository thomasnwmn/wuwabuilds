# Echo art

Add square Echo portraits to this folder. The app automatically expects a `.webp` image based on each Echo `name` in `public/builds.json`:

- `"name": "Juè"` → `public/echoes/jue.webp`
- `"name": "Chasm Guardian"` → `public/echoes/chasm-guardian.webp`

You can use a custom filename or format per Echo with an `image` property:

```json
"image": "/echoes/dreamless.png"
```
