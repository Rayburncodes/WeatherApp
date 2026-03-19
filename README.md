# Weather App (PM Accelerator Technical Assessment)

Full-stack Weather App for the Product Manager Accelerator (PM Accelerator) internship technical assessment.

**Author:** Rayburn Lu

## API Architecture

This project implements a RESTful API. All endpoints follow REST conventions with proper HTTP verbs, status codes, and a consistent JSON response envelope.

## API Endpoints

### Weather
- GET  `/api/weather/current?location=` → fetch current weather for a location
- GET  `/api/weather/forecast?location=` → fetch 5-day forecast grouped by day
- GET  `/api/weather/history?location=&start=&end=` → fetch historical daily min/max temps (Open-Meteo) and store result

### Records (weather_records)
- POST   `/api/records` → create a weather record
- GET    `/api/records` → list all records
- GET    `/api/records/:id` → get one record
- PUT    `/api/records/:id` → update location/date_range/notes (re-validate location if changed)
- DELETE `/api/records/:id` → delete a record

### Integrations
- GET `/api/integrations/youtube?location=` → top 3 YouTube videos for location
- GET `/api/integrations/map?location=` → Google Maps embed URL + static map URL

### Export
- GET `/api/export?format=json|csv|xml|pdf|markdown` → export all records

## Prerequisites

- Node.js (18+ recommended)
- PostgreSQL
- API keys:
  - OpenWeather (`OPENWEATHER_API_KEY`)
  - Google Maps (`GOOGLE_MAPS_API_KEY`)
  - YouTube Data API v3 (`YOUTUBE_API_KEY`)

## Setup

1. **Clone**
   - Set the repo to public **or** grant collaborator access to `community@pmaccelerator.io` and `hr@pmaccelerator.io`.

2. **Create env**
   - Copy `.env.example` to `.env` and fill values.
   - (Optional) Copy `client/.env.example` to `client/.env` if you want to override the backend base URL from the frontend.

3. **Install**

```bash
cd weather-app
npm install
npm -w client install
npm -w server install
```

4. **Database & Prisma**

```bash
cd weather-app
npm run prisma:generate
npm run prisma:migrate
```

5. **Run**

```bash
cd weather-app
npm run dev:server
npm run dev:client
```

Frontend runs on Vite’s default port; backend defaults to `PORT=3001`.

## Database Schema

Prisma model `WeatherRecord`:
- location, resolvedCity, latitude, longitude
- optional startDate/endDate (historical range)
- weatherData (full JSON payload stored)
- optional notes
- createdAt/updatedAt

## Export

Use the UI export dropdown, or call:
- `GET /api/export?format=json|csv|xml|pdf|markdown`

## Demo Video

[Insert hosted video link here — YouTube, Google Drive, or Vimeo]

Video should be 1–2 minutes showing the running app and a walkthrough of the code.

## Known limitations / assumptions

- No authentication; all records are globally visible/editable/deletable as required.
- Location resolution uses geocoding to pick the closest match when exact input is not found.
- The footer and project description include PM Accelerator’s LinkedIn “About” text as provided by the author.

