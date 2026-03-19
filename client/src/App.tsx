import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiJson } from './lib/api';
import type { CurrentWeather, ForecastDay, ResolvedLocation, WeatherRecord, YoutubeResult } from './lib/types';

type WeatherCurrentResponse = { location: ResolvedLocation; weather: CurrentWeather };
type WeatherForecastResponse = { location: ResolvedLocation; forecast: ForecastDay[] };
type YoutubeResponse = { location: ResolvedLocation; results: YoutubeResult[] };
type MapResponse = { location: ResolvedLocation; embedUrl: string; staticMapUrl: string };
type HistoryResponse = { location: ResolvedLocation; days: Array<{ date: string; tempMinC: number; tempMaxC: number }>; record: WeatherRecord };

function iconUrl(icon: string | null) {
  return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : null;
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function App() {
  const [locationInput, setLocationInput] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [youtube, setYoutube] = useState<YoutubeResult[]>([]);
  const [map, setMap] = useState<MapResponse | null>(null);

  const [records, setRecords] = useState<WeatherRecord[]>([]);
  const [recordsQuery, setRecordsQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');

  const [historyLocation, setHistoryLocation] = useState('');
  const [historyStart, setHistoryStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateOnly(d);
  });
  const [historyEnd, setHistoryEnd] = useState(() => toDateOnly(new Date()));
  const [historyDays, setHistoryDays] = useState<HistoryResponse['days']>([]);

  const filteredRecords = useMemo(() => {
    const q = recordsQuery.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const hay = `${r.location} ${r.resolvedCity} ${r.notes ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [records, recordsQuery]);

  async function refreshRecords() {
    const data = await apiGet<WeatherRecord[]>('/api/records');
    setRecords(data);
  }

  async function runSearch(input: string) {
    setBusy(true);
    setError(null);
    try {
      const [cur, fc, yt, mp] = await Promise.all([
        apiGet<WeatherCurrentResponse>(`/api/weather/current?location=${encodeURIComponent(input)}`),
        apiGet<WeatherForecastResponse>(`/api/weather/forecast?location=${encodeURIComponent(input)}`),
        apiGet<YoutubeResponse>(`/api/integrations/youtube?location=${encodeURIComponent(input)}`),
        apiGet<MapResponse>(`/api/integrations/map?location=${encodeURIComponent(input)}`),
      ]);
      setResolved(cur.location);
      setCurrent(cur.weather);
      setForecast(fc.forecast);
      setYoutube(yt.results);
      setMap(mp);

      // Save the query + result (CREATE)
      await apiJson<WeatherRecord>('/api/records', 'POST', {
        location: input,
        weatherData: { current: cur, forecast: fc },
        notes: null,
      });
      await refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshRecords().catch(() => {});

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setLocationInput(coords);
        await runSearch(coords);
      },
      () => {
        // Fallback if denied: do nothing until user searches.
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onExport(format: 'json' | 'csv' | 'xml' | 'pdf' | 'markdown') {
    try {
      setError(null);
      const resp = await fetch(`${(import.meta.env.VITE_API_BASE ?? 'http://localhost:3001')}/api/export?format=${format}`);
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
      const blob = await resp.blob();
      const cd = resp.headers.get('content-disposition') ?? '';
      const m = cd.match(/filename="([^"]+)"/);
      const filename = m?.[1] ?? `export.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    }
  }

  function validateHistoryForm(): string | null {
    const loc = historyLocation.trim();
    if (!loc) return 'Location is required for historical query.';
    if (!historyStart || !historyEnd) return 'Start and end dates are required.';
    if (new Date(historyStart).getTime() > new Date(historyEnd).getTime()) return 'Start date must be before end date.';
    const today = toDateOnly(new Date());
    if (historyStart > today || historyEnd > today) return 'Historical dates cannot be in the future.';
    return null;
  }

  async function submitHistory() {
    const msg = validateHistoryForm();
    if (msg) return setError(msg);
    setBusy(true);
    setError(null);
    try {
      const data = await apiGet<HistoryResponse>(
        `/api/weather/history?location=${encodeURIComponent(historyLocation.trim())}&start=${encodeURIComponent(
          historyStart,
        )}&end=${encodeURIComponent(historyEnd)}`,
      );
      setHistoryDays(data.days);
      await refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Historical query failed.');
    } finally {
      setBusy(false);
    }
  }

  async function startEdit(r: WeatherRecord) {
    setEditingId(r.id);
    setEditNotes(r.notes ?? '');
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiJson<WeatherRecord>(`/api/records/${id}`, 'PUT', { notes: editNotes });
      setEditingId(null);
      setEditNotes('');
      await refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(id: string) {
    setBusy(true);
    setError(null);
    try {
      await fetch(`${(import.meta.env.VITE_API_BASE ?? 'http://localhost:3001')}/api/records/${id}`, { method: 'DELETE' });
      await refreshRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Weather App</h1>
              <p className="text-sm text-slate-600">PM Accelerator technical assessment</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`rounded px-3 py-1 text-sm font-medium ${unit === 'C' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                onClick={() => setUnit('C')}
                type="button"
              >
                °C
              </button>
              <button
                className={`rounded px-3 py-1 text-sm font-medium ${unit === 'F' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
                onClick={() => setUnit('F')}
                type="button"
              >
                °F
              </button>
              <details className="relative">
                <summary className="cursor-pointer list-none rounded bg-slate-100 px-3 py-1 text-sm font-medium">
                  Export
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-44 rounded border bg-white p-2 shadow">
                  {(['json', 'csv', 'pdf', 'xml', 'markdown'] as const).map((f) => (
                    <button
                      key={f}
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-50"
                      onClick={() => onExport(f)}
                      type="button"
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <div>
              <div className="font-medium">Something went wrong</div>
              <div className="mt-0.5">{error}</div>
            </div>
            <button className="rounded px-2 py-1 hover:bg-red-100" onClick={() => setError(null)} type="button">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="rounded border bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Search location</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                placeholder="City, zip/postal, coordinates (lat,lon), or landmark"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
            </div>
            <button
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={busy || !locationInput.trim()}
              onClick={() => runSearch(locationInput)}
              type="button"
            >
              {busy ? 'Loading…' : 'Search'}
            </button>
          </div>
          {resolved && (
            <div className="mt-3 text-sm text-slate-600">
              Resolved: <span className="font-medium text-slate-900">{resolved.resolvedCity}</span> ({resolved.latitude.toFixed(4)},{' '}
              {resolved.longitude.toFixed(4)})
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded border bg-white p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Current weather</h2>
              {current?.icon && <img className="h-10 w-10" src={iconUrl(current.icon) ?? ''} alt="" />}
            </div>
            {current ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-3xl font-semibold">
                    {unit === 'C' ? `${Math.round(current.temperatureC)}°C` : `${Math.round(current.temperatureF)}°F`}
                  </div>
                  <div className="mt-1 text-sm capitalize text-slate-600">{current.condition}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-500">Humidity</div>
                    <div className="font-medium">{current.humidity}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Visibility</div>
                    <div className="font-medium">{current.visibility != null ? `${(current.visibility / 1000).toFixed(1)} km` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Wind</div>
                    <div className="font-medium">
                      {current.windSpeed} m/s · {current.windDirection}°
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">UV index</div>
                    <div className="font-medium">{current.uvIndex != null ? current.uvIndex : '—'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">Search a location to see current conditions.</div>
            )}
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="text-base font-semibold">YouTube</h2>
            <div className="mt-3 space-y-3">
              {youtube.length ? (
                youtube.map((v) => (
                  <a
                    key={v.videoId}
                    className="flex gap-3 rounded border p-2 hover:bg-slate-50"
                    href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img className="h-14 w-24 rounded object-cover" src={v.thumbnail ?? ''} alt="" />
                    <div className="text-sm font-medium leading-snug">{v.title}</div>
                  </a>
                ))
              ) : (
                <div className="text-sm text-slate-600">Search a location to load videos.</div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded border bg-white p-4">
          <h2 className="text-base font-semibold">5-day forecast</h2>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {forecast.length ? (
              forecast.map((d) => (
                <div key={d.date} className="min-w-44 rounded border bg-slate-50 p-3">
                  <div className="text-sm font-medium">{d.date}</div>
                  <div className="mt-2 flex items-center gap-2">
                    {d.icon && <img className="h-10 w-10" src={iconUrl(d.icon) ?? ''} alt="" />}
                    <div className="text-sm capitalize text-slate-600">{d.condition}</div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">
                      {unit === 'C' ? `${Math.round(d.maxTempC)}°` : `${Math.round(d.maxTempF)}°`}
                    </span>{' '}
                    <span className="text-slate-500">
                      / {unit === 'C' ? `${Math.round(d.minTempC)}°` : `${Math.round(d.minTempF)}°`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-600">No forecast yet.</div>
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded border bg-white p-4">
            <h2 className="text-base font-semibold">Google Map</h2>
            {map ? (
              <div className="mt-3">
                <iframe className="h-72 w-full rounded border" src={map.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">Search a location to load the map embed.</div>
            )}
          </section>

          <section className="rounded border bg-white p-4">
            <h2 className="text-base font-semibold">Historical temperature (stores to DB)</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Location</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={historyLocation}
                  onChange={(e) => setHistoryLocation(e.target.value)}
                  placeholder="City, zip, coords, landmark"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-sm" type="date" value={historyStart} onChange={(e) => setHistoryStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <input className="mt-1 w-full rounded border px-3 py-2 text-sm" type="date" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <button
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  disabled={busy}
                  onClick={submitHistory}
                  type="button"
                >
                  Fetch & store
                </button>
              </div>
            </div>
            {historyDays.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Min (°C)</th>
                      <th className="py-2">Max (°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyDays.map((d) => (
                      <tr key={d.date} className="border-t">
                        <td className="py-2">{d.date}</td>
                        <td className="py-2">{Math.round(d.tempMinC)}</td>
                        <td className="py-2">{Math.round(d.tempMaxC)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">Submit a date range to view historical temps.</div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded border bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Past queries (DB)</h2>
              <p className="text-sm text-slate-600">Search, edit notes, or delete records (globally editable).</p>
            </div>
            <div className="w-full md:w-80">
              <label className="text-sm font-medium">Search records</label>
              <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={recordsQuery} onChange={(e) => setRecordsQuery(e.target.value)} placeholder="Filter by location / notes" />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="py-2">Location</th>
                  <th className="py-2">Resolved</th>
                  <th className="py-2">Range</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.location}</div>
                      <div className="text-xs text-slate-500">
                        {r.latitude.toFixed(3)},{r.longitude.toFixed(3)}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{r.resolvedCity}</td>
                    <td className="py-2 pr-3">
                      {r.startDate && r.endDate ? (
                        <span>
                          {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {editingId === r.id ? (
                        <textarea className="w-72 rounded border p-2 text-sm" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                      ) : (
                        <span className="text-slate-700">{r.notes ?? ''}</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {editingId === r.id ? (
                          <>
                            <button className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white" disabled={busy} onClick={() => saveEdit(r.id)} type="button">
                              Save
                            </button>
                            <button
                              className="rounded bg-slate-100 px-3 py-1 text-xs font-medium"
                              onClick={() => {
                                setEditingId(null);
                                setEditNotes('');
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button className="rounded bg-slate-100 px-3 py-1 text-xs font-medium" onClick={() => startEdit(r)} type="button">
                            Edit
                          </button>
                        )}
                        <button className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white" disabled={busy} onClick={() => removeRecord(r.id)} type="button">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td className="py-3 text-sm text-slate-600" colSpan={5}>
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-700">
          <div className="font-semibold">About PM Accelerator</div>
          <div className="mt-2 space-y-3 text-slate-600">
            <div>
              <span className="font-medium text-slate-900">Name:</span> Rayburn Lu
            </div>
            <p>
              The Product Manager Accelerator Program is designed to support PM professionals through every stage of their careers. From
              students looking for entry-level jobs to Directors looking to take on a leadership role, our program has helped over hundreds
              of students fulfill their career aspirations.
            </p>
            <p>
              Our Product Manager Accelerator community are ambitious and committed. Through our program they have learnt, honed and
              developed new PM and leadership skills, giving them a strong foundation for their future endeavors.
            </p>
            <p>
              Here are the examples of services we offer. Check out our website (link under my profile) to learn more about our services.
            </p>
            <ul className="list-none space-y-2 pl-0">
              <li>
                <span className="font-medium text-slate-900">🚀 PMA Pro</span> — End-to-end product manager job hunting program that helps
                you master FAANG-level Product Management skills, conduct unlimited mock interviews, and gain job referrals through our
                largest alumni network. 25% of our offers came from tier 1 companies and get paid as high as $800K/year.
              </li>
              <li>
                <span className="font-medium text-slate-900">🚀 AI PM Bootcamp</span> — Gain hands-on AI Product Management skills by
                building a real-life AI product with a team of AI Engineers, data scientists, and designers. We will also help you launch
                your product with real user engagement using our 100,000+ PM community and social media channels.
              </li>
              <li>
                <span className="font-medium text-slate-900">🚀 PMA Power Skills</span> — Designed for existing product managers to sharpen
                their product management skills, leadership skills, and executive presentation skills
              </li>
              <li>
                <span className="font-medium text-slate-900">🚀 PMA Leader</span> — We help you accelerate your product management career,
                get promoted to Director and product executive levels, and win in the board room.
              </li>
              <li>
                <span className="font-medium text-slate-900">🚀 1:1 Resume Review</span> — We help you rewrite your killer product manager
                resume to stand out from the crowd, with an interview guarantee. Get started by using our FREE killer PM resume template
                used by over 14,000 product managers.{' '}
                <a className="underline" href="https://www.drnancyli.com/pmresume" target="_blank" rel="noreferrer">
                  https://www.drnancyli.com/pmresume
                </a>
              </li>
              <li>
                <span className="font-medium text-slate-900">🚀</span> We also published over 500+ free training and courses. Please go to
                my YouTube channel{' '}
                <a className="underline" href="https://www.youtube.com/c/drnancyli" target="_blank" rel="noreferrer">
                  https://www.youtube.com/c/drnancyli
                </a>{' '}
                and Instagram @drnancyli to start learning for free today.
              </li>
            </ul>
            <p>
              LinkedIn:{' '}
              <a className="underline" href="https://www.linkedin.com/company/product-manager-accelerator" target="_blank" rel="noreferrer">
                Product Manager Accelerator
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
