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
  - SOG impact from Beaufort, wave height, wave direction, and ocean current
  - per-leg and total fuel burn
  - ECA and non-ECA fuel cost
  - CO2 cost impact
  - weather delay, extra fuel, and estimated weather cost exposure
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

## APIs

No paid API key is required for the current MVP.

- Marine forecast: `https://marine-api.open-meteo.com/v1/marine`
- Wind forecast: `https://api.open-meteo.com/v1/forecast`

The dashboard has a `Weather Data Mode` dropdown:

- `Demo forecast corridor`: deterministic simulated data, recommended for judging and video recording.
- `Live Open-Meteo API`: fetches real marine/wind data. Internet is required.

Live fields used:

- `wave_height`
- `wave_direction`
- `swell_wave_height`
- `swell_wave_direction`
- `ocean_current_velocity`
- `ocean_current_direction`
- `wind_speed_10m`
- `wind_direction_10m`

For production, this can later be upgraded to Copernicus Marine / ERA5 / paid routing-grade data.

## Important Files

- `src/App.tsx`: app flow and state orchestration
- `src/data/routes.ts`: voyage scenarios and waypoint data
- `src/services/weatherService.ts`: weather loading logic
- `src/utils/physics.ts`: voyage, fuel, cost, detour calculations
- `src/components/Map/VoyageMap.tsx`: route and weather visualization

## Demo Notes

- Default mode uses simulated weather for stable hackathon demos.
- To use live weather, choose `Live Open-Meteo API` in the input panel.
- Recommended demo route: `Rotterdam -> Singapore (Suez)`.
- Recommended demo action: show main-route weather risk, review total cost, then accept the suggested detour.

## Submission Checklist

- Run `npm run lint`.
- Run `npm run build`.
- Deploy the project on Vercel, Netlify, or any static host using `npm run build`.
- Submit source code / GitHub repository.
- Submit short PPT or documentation.
- Submit demo video.
- Submit live deployment link.

## Suggested Video Script

1. Open the dashboard and show the selected route.
2. Explain that weather changes SOG, ETA, fuel burn, CO2, and laycan risk.
3. Keep `Demo forecast corridor` selected for stable output.
4. Click `Calculate Voyage`.
5. Point out red bad-weather segments, risk circles, and weather snapshots.
6. Show weather delay, extra fuel, total cost, and laycan status.
7. Accept the detour and compare the revised result.
