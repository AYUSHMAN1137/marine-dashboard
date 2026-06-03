# Marine Weather Routing Dashboard

A weather-based voyage routing dashboard built for the IME Innovation Challenge 2026.

## About

This project helps ship operators plan voyages by analyzing weather conditions along a route. You pick a voyage (like Rotterdam → Singapore), and it calculates things like estimated arrival time, fuel cost, CO2 impact, and flags any bad-weather legs along the way.

It also suggests detours if the weather looks risky on the main route.

## Features

- Choose between two route scenarios: Suez Canal or Cape of Good Hope
- Weather-based speed adjustments (Beaufort scale, wave height, ocean currents)
- Fuel burn and cost estimation (ECA vs non-ECA zones)
- CO2 cost impact
- Laycan risk warning
- Monsoon detour suggestion
- Live weather via Open-Meteo API or demo mode for stable testing

## Tech Stack

- React + TypeScript
- Vite
- Leaflet (for the map)

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Weather Data

The app works in two modes:

- **Demo mode** — uses simulated weather, good for presentations
- **Live mode** — fetches real data from [Open-Meteo](https://open-meteo.com/), no API key needed

## Build

```bash
npm run build
```
