import { readFileSync } from 'node:fs';
import path from 'node:path';

export const banned: string[] = [];
export const reserved: string[] = [];

export interface GeoOverride {
  /** [latitude, longitude] — required so the node can be placed on the map. */
  ll: [number, number];
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

/**
 * Optional, deployment-specific geo overrides.
 *
 * geoip-lite's bundled GeoLite2 DB is inaccurate for IPv6 and cloud/hosting
 * ranges (which often resolve to the provider's home country), so an operator
 * can pin the true location of known nodes WITHOUT editing source code. The
 * data lives outside the repository: set `GEO_OVERRIDES_FILE`, or drop a
 * `geo-overrides.json` at the project root. Keys are matched against a node's
 * id or display name. See `geo-overrides.example.json`.
 */
export function loadGeoOverrides(): Record<string, GeoOverride> {
  const file = process.env.GEO_OVERRIDES_FILE || path.resolve(process.cwd(), 'geo-overrides.json');
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, GeoOverride>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    // A missing file simply means no overrides are configured.
    if (e.code !== 'ENOENT') {
      console.warn(`Failed to load geo overrides from ${file}:`, e.message);
    }
    return {};
  }
}
