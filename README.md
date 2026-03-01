# Map Timeline

Web app to view Google Maps Timeline / Location History on a map. Upload `Timeline.json`, filter by time range, explore cities and countries visited.

![Steps](/download-steps.png?raw=true "Steps")
![Screenshot](/screenshot.png?raw=true "Screenshot")

## Features

- **Upload**: Timeline.json exported from Google Maps Timeline app
- **Map**: Mapbox map with points and route line; Re-centre button
- **Timeline slider**: Filter points by time range
- **Day tab**: Timeline view with date range
- **Trips tab**: Stats (points, km), date range
- **Cities tab**:
  - List of cities visited (from place cache `formattedAddress`, no API calls)
  - Normalize city names: zipcode (leading/trailing), diacritics, aliases (Ho Chi Minh City ↔ Thành phố Hồ Chí Minh, Da Nang ↔ Đà Nẵng)
  - Click city → show places in that city, zoom map, hide route line
  - Back button to return to cities list
- **World tab**: Countries visited (GeoJSON point-in-polygon), country flags, selection highlight
- **Place cache**: Load from `TimelinePlaceCache.json`; optional Google Places API for "Fetch info" in popup
- **Outliers**: Automatic detection; mark and delete bad points
- **Merge**: Multiple datasets; toggle which to include
- **Mobile**: Bottom tab bar, sidebar drawer

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set:
   - `VITE_MAPBOX_TOKEN` – Mapbox public token (required for map)
   - `VITE_GOOGLE_PLACES_API_KEY` – optional, for "Fetch info" in point popup
3. Place `TimelinePlaceCache.json` in `public/` (or copy from project root)
4. Run dev server: `npm run dev` (http://localhost:3000)
5. Build: `npm run build`

## Project structure

- `src/context/TimelineContext.tsx` – React Context (datasets, place cache, time range, city/country visits)
- `src/lib/parseRecords.ts` – Parse Timeline.json / Semantic Timeline format
- `src/lib/uploadTakeout.ts` – Load Timeline.json
- `src/lib/geojson.ts` – Points/line GeoJSON and bbox
- `src/lib/outliers.ts` – Outlier detection
- `src/lib/cities.ts` – City grouping, normalization (zipcode, diacritics, aliases), places in city
- `src/lib/countries.ts` – Country aggregation (GeoJSON point-in-polygon)
- `src/lib/placesApi.ts` – Google Places API fetch
- `src/lib/cityImages.ts` – City thumbnails (Static Map or placehold.co)
- `src/lib/countryImages.ts` – Country flags (Rest Countries API)
- `src/components/` – MapView, CitiesTab, WorldTab, TripsTab, DayTab, TimelineSlider, UploadPanel, DatasetList, PointList

## Future

- Tab Places (category grid)
- Tab Insights (Travel / Visits charts)
- Tab Day: calendar picker, visits list
- Drag marker to edit point coordinates
- Stream/worker for large Timeline.json
