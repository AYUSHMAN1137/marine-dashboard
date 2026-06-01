# IME Weather Routing Dashboard

Functional MVP for the IME Innovation Challenge 2026 weather-routing problem statement.

## What It Does

- Lets the operator choose a voyage scenario:
  - `Rotterdam -> Singapore (Suez)`
  - `Rotterdam -> Singapore (Cape)`
- Samples route weather using:
  - deterministic simulated weather for demo stability
  - Open-Meteo marine API support for live data
- Calculates:
  - route distance
  - ETA and laycan risk
  - speed loss from Beaufort conditions
  - per-leg and total fuel burn
  - ECA and non-ECA fuel cost
  - CO2 cost impact
- Flags bad-weather legs and suggests a monsoon detour where relevant.

## MVP Scope

This project is intentionally built as a demo-ready MVP/prototype, aligned with the clarification shared by the organizers:

- focus on implementation and practical workflow
- basic UI is acceptable
- core logic matters more than polish
- suitable for demo video and deployment

## Tech Stack

- React
- TypeScript
- Vite
- Leaflet / React-Leaflet

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Important Files

- `src/App.tsx`: app flow and state orchestration
- `src/data/routes.ts`: voyage scenarios and waypoint data
- `src/services/weatherService.ts`: weather loading logic
- `src/utils/physics.ts`: voyage, fuel, cost, detour calculations
- `src/components/Map/VoyageMap.tsx`: route and weather visualization

## Demo Notes

- Default mode uses simulated weather for stable hackathon demos.
- To use live weather, switch `WEATHER_MODE` in `src/App.tsx` from `simulated` to `live`.
