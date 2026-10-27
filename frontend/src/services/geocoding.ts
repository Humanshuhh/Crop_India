import indiaLocations from '../data/indiaLocations.json';

export interface GeocodingResult {
  state: string;
  city: string;
  rawState?: string;
  rawCity?: string;
  displayName?: string;
}

interface StateData {
  name: string;
  districts: string[];
}

const statesData: StateData[] = indiaLocations.states;

// Normalize names for fuzzy comparison
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b(state of|district|city|division|division of|union territory of|nct of)\b/gi, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Special alias dictionary for Indian states/territories
const STATE_ALIASES: Record<string, string> = {
  'orissa': 'Odisha',
  'pondicherry': 'Puducherry',
  'uttaranchal': 'Uttarakhand',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'andaman & nicobar': 'Andaman and Nicobar Islands',
  'andaman & nicobar islands': 'Andaman and Nicobar Islands',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'national capital territory of delhi': 'Delhi',
};

/**
 * Match raw state string to an exact state entry in indiaLocations.json
 */
export function matchStateInDataset(rawState: string): StateData | null {
  if (!rawState) return null;

  const normalized = normalizeName(rawState);

  // Check alias table first
  if (STATE_ALIASES[normalized]) {
    const aliasMatch = statesData.find(
      s => s.name.toLowerCase() === STATE_ALIASES[normalized].toLowerCase()
    );
    if (aliasMatch) return aliasMatch;
  }

  // Exact or normalized match
  for (const s of statesData) {
    const normState = normalizeName(s.name);
    if (normState === normalized || normState.includes(normalized) || normalized.includes(normState)) {
      return s;
    }
  }

  return null;
}

/**
 * Match a city or district query to a district in the state's district list.
 */
export function matchDistrictInState(stateData: StateData, candidates: string[]): string | null {
  if (!stateData || !stateData.districts || stateData.districts.length === 0) return null;

  for (const rawCandidate of candidates) {
    if (!rawCandidate) continue;
    const normalizedCandidate = normalizeName(rawCandidate);
    if (!normalizedCandidate) continue;

    // 1. Exact match (case insensitive)
    const exact = stateData.districts.find(
      d => d.toLowerCase() === rawCandidate.toLowerCase().trim()
    );
    if (exact) return exact;

    // 2. Normalized match
    const normMatch = stateData.districts.find(
      d => normalizeName(d) === normalizedCandidate
    );
    if (normMatch) return normMatch;

    // 3. Substring / contains match
    const subMatch = stateData.districts.find(d => {
      const normD = normalizeName(d);
      return normD.includes(normalizedCandidate) || normalizedCandidate.includes(normD);
    });
    if (subMatch) return subMatch;
  }

  return null;
}

/**
 * Client-side reverse geocoding with BigDataCloud (primary, CORS-enabled, no key needed)
 * and OpenStreetMap Nominatim (fallback).
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult | null> {
  let rawState = '';
  let candidateCities: string[] = [];
  let displayName = '';

  // 1. Try BigDataCloud Reverse Geocoding API (client-side free tier)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(bdcUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      rawState = data.principalSubdivision || '';
      if (data.city) candidateCities.push(data.city);
      if (data.locality) candidateCities.push(data.locality);
      if (Array.isArray(data.localityInfo?.administrative)) {
        for (const admin of data.localityInfo.administrative) {
          if (admin.name && admin.adminLevel >= 4) {
            candidateCities.push(admin.name);
          }
        }
      }
      displayName = [data.locality || data.city, rawState, data.countryName].filter(Boolean).join(', ');
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode error or timeout, trying fallback...', err);
  }

  // 2. Fallback to OpenStreetMap Nominatim if BigDataCloud didn't provide state
  if (!rawState) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(nominatimUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        rawState = address.state || address.province || address.state_district || '';
        if (address.city) candidateCities.push(address.city);
        if (address.town) candidateCities.push(address.town);
        if (address.village) candidateCities.push(address.village);
        if (address.county) candidateCities.push(address.county);
        if (address.state_district) candidateCities.push(address.state_district);
        if (address.suburb) candidateCities.push(address.suburb);
        displayName = data.display_name || '';
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode error or timeout:', err);
    }
  }

  if (!rawState && candidateCities.length === 0) {
    return null;
  }

  // Match state against dataset
  const matchedState = matchStateInDataset(rawState);
  let resolvedState = matchedState ? matchedState.name : rawState;
  let resolvedCity = '';

  if (matchedState) {
    const matchedDistrict = matchDistrictInState(matchedState, candidateCities);
    resolvedCity = matchedDistrict || candidateCities[0] || '';
  } else {
    resolvedCity = candidateCities[0] || '';
  }

  return {
    state: resolvedState,
    city: resolvedCity,
    rawState,
    rawCity: candidateCities[0] || '',
    displayName,
  };
}
