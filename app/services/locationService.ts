import { NoteLocation } from '../types/note';

export type { NoteLocation };

export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

// ─── Reverse geocode a single coordinate ─────────────────────────────────────
async function reverseGeocode(lat: number, lng: number, zoom = 14): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&zoom=${zoom}&format=json&addressdetails=1`,
    { headers: { 'User-Agent': 'NoteApp/1.0' } }
  );
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  const addr = data.address ?? {};
  const name = data.name || '';
  const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? '';
  const state = addr.state ?? '';
  const country = addr.country ?? '';
  const parts = [...new Set([name, city, state !== city ? state : '', country].filter(Boolean))];
  return parts.join(', ') || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// ─── Nearby places by calling reverse geocode at multiple zoom levels ─────────
export async function getNearbyPlaces(lat: number, lng: number): Promise<LocationResult[]> {
  // Each zoom gives a progressively broader label: building → street → suburb → city
  const zooms = [18, 16, 14, 12, 10];
  const promises = zooms.map(async (zoom) => {
    try {
      const address = await reverseGeocode(lat, lng, zoom);
      return { lat, lng, address } as LocationResult;
    } catch {
      return null;
    }
  });

  const resolved = await Promise.all(promises);
  const seen = new Set<string>();
  const results: LocationResult[] = [];
  for (const r of resolved) {
    if (r && !seen.has(r.address)) {
      seen.add(r.address);
      results.push(r);
    }
  }
  return results;
}

// ─── Text search via Nominatim ────────────────────────────────────────────────
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
    { headers: { 'User-Agent': 'NoteApp/1.0' } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data as any[]).map((item) => {
    const addr = item.address ?? {};
    const name = item.name || item.display_name?.split(',')[0] || '';
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? '';
    const country = addr.country ?? '';
    const parts = [...new Set([name, city !== name ? city : '', country].filter(Boolean))];
    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: parts.join(', ') || item.display_name,
    } as LocationResult;
  });
}

// ─── GPS current location ─────────────────────────────────────────────────────
export function getCurrentLocation(): Promise<NoteLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        try {
          const address = await reverseGeocode(lat, lng);
          resolve({ lat, lng, address });
        } catch {
          resolve({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        }
      },
      (err) => reject(new Error(err.message)),
      { timeout: 12000, maximumAge: 60000 }
    );
  });
}
