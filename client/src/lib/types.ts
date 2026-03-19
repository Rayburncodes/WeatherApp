export type ResolvedLocation = {
  input: string;
  resolvedCity: string;
  latitude: number;
  longitude: number;
};

export type CurrentWeather = {
  temperatureC: number;
  temperatureF: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number | null;
  uvIndex: number | null;
  icon: string | null;
  coordinates: { latitude: number; longitude: number };
};

export type ForecastDay = {
  date: string;
  minTempC: number;
  maxTempC: number;
  minTempF: number;
  maxTempF: number;
  condition: string;
  icon: string | null;
};

export type WeatherRecord = {
  id: string;
  location: string;
  resolvedCity: string;
  latitude: number;
  longitude: number;
  startDate: string | null;
  endDate: string | null;
  weatherData: unknown;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type YoutubeResult = { videoId: string; title: string; thumbnail: string | null };

