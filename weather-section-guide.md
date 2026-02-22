# Weather / Anemos Section — Implementation Guide

This section was removed from epowweb during a cleanup pass (Feb 2026) because the feature is planned for a separate app. This document captures everything needed to recreate it.

## What it was

A panel on the homepage displaying atmospheric weather data (Anemos) with three selectable layers:
- **Solar Radiation** — Global horizontal irradiance (10 min intervals)
- **Air Temperature** — Surface air temperature at 2m height
- **Wind Speed & Direction** — From atmospheric models

## UI behavior

- Toggle group to switch between radiation / temperature / wind
- Each layer shows a static preview image (`/anemos/{layer}.png`)
- Header with "Anemos Weather Data" title, "Static Previews" badge, "Full Explorer" button
- Description text updates per-layer selection

## Component structure

```
AnemosPanel (default export, client component)
├── Header section
│   ├── Cloud icon + "Anemos Weather Data" label
│   ├── Title: "EU 20km Atmospheric Layers"
│   ├── Description text
│   └── Actions: Badge("Static Previews") + Button("Full Explorer")
├── Layer selector (ToggleGroup with icons)
│   ├── Radiation (Sun icon)
│   ├── Wind (Wind icon)
│   └── Temperature (Cloud icon)
└── Preview card
    ├── Header: layer icon + title + "Preview" badge
    └── Image: next/image with aspect-[16/9], min-h-[280px]
```

## Dependencies

- `lucide-react`: Cloud, ImageIcon, Wind, Sun, ExternalLink
- `next/image`: Image component
- UI components: Badge, ToggleGroup, Button (from `@/components/ui`)

## Assets needed

Three static preview images in `public/anemos/`:
- `radiation.png`
- `temperature.png`
- `wind.png`

## Types/constants

```typescript
type Layer = 'radiation' | 'temperature' | 'wind';

const titles: Record<Layer, string> = {
  radiation: 'Solar Radiation (10 min intervals)',
  temperature: 'Air Temperature',
  wind: 'Wind Speed & Direction',
};

const descriptions: Record<Layer, string> = {
  radiation: 'Global horizontal irradiance across the European region',
  temperature: 'Surface air temperature measurements at 2m height',
  wind: 'Wind speed and direction from atmospheric models',
};
```

## Homepage integration

The panel was placed in a section on the homepage (`src/app/page.tsx`) between the live data section and the heatmap CTA:

```tsx
<section className="mt-14 space-y-5">
  <div className="flex items-center gap-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 to-sky-600/20 ring-1 ring-sky-400/30">
      <Activity className="h-6 w-6 text-sky-400" />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase ...">Weather Data</p>
      <h2 className="font-display text-2xl ...">Anemos Atmospheric Layers</h2>
    </div>
  </div>
  <AnemosPanel />
</section>
```

## Git recovery

The full component source and assets can be recovered from git history. Look for the commit that removes `src/components/AnemosPanel.tsx` and `public/anemos/`.

## Notes for the new app

- The "Full Explorer" button had no href — it was a placeholder for linking to an interactive Anemos explorer
- Consider fetching live data from an Anemos API instead of static preview images
- The ToggleGroup component from the UI library works well for layer switching
- The gradient background (`from-sky-500/10 via-indigo-500/10 to-emerald-400/10`) gives a nice weather-themed feel
