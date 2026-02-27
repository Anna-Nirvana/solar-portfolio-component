# `<solar-portfolio>` Web Component

A standalone, framework-free Web Component that renders Solarpunk Studio's portfolio as an interactive 3D constellation (Three.js) or a static accessible grid.

## Quick Start

```bash
cd web-component
npm install
npm run build
```

This produces `dist/solar-portfolio.js` — a single ES module that self-registers the `<solar-portfolio>` custom element.

## Development

```bash
npm run dev
```

Opens `demo.html` with hot reload via Vite.

## Usage

```html
<script type="module" src="dist/solar-portfolio.js"></script>

<solar-portfolio
  data-json="portfolio.json"
  variant="constellation"
  accent="#8C52FF"
></solar-portfolio>
```

## Attributes

| Attribute   | Type     | Default           | Description |
|-------------|----------|-------------------|-------------|
| `data-json` | URL      | —                 | Path or URL to a JSON file containing portfolio items |
| `variant`   | `constellation` \| `grid` | `constellation` | `constellation` renders an interactive 3D scene; `grid` renders a static CSS grid |
| `poster`    | URL      | —                 | Optional static placeholder image shown while loading |
| `accent`    | Hex color| `#8C52FF`         | Accent color for highlights, borders, and interactive elements |

## Accessibility

- **`prefers-reduced-motion`**: Automatically falls back to the static grid, regardless of `variant` attribute.
- **WebGL unavailable**: Falls back to the static grid with a notice.
- **Keyboard navigation**: Grid items are focusable; cards can be dismissed with Escape.
- **ARIA labels**: All interactive elements are labeled.

## JSON Schema

```json
{
  "items": [
    {
      "id": "unique-slug",
      "title": "Project Title",
      "description": "Project description text.",
      "image": "https://example.com/image.png",
      "tags": ["Tag One", "Tag Two"],
      "url": "https://example.com"
    }
  ]
}
```

## Architecture

- **Shadow DOM** encapsulates all styles — no CSS leaks in or out.
- **Vanilla Three.js** (no React, no R3F) for the constellation scene.
- **~80-120KB gzipped** depending on Three.js tree-shaking.
- The Telescope GLB model is excluded; the constellation is fully procedural geometry.

## Build Output

```
dist/
  solar-portfolio.js    ← single ES module entry point
```

All styles are inlined in Shadow DOM — no separate CSS file needed.

## Dependencies

| Package | Purpose |
|---------|---------|
| `three` | 3D rendering for constellation mode |
| `vite`  | Build tooling (dev only) |
| `terser`| Minification (dev only) |
