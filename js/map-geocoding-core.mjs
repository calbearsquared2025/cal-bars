export function mapTilerCountryCode(feature) {
  const items = [feature, ...(Array.isArray(feature?.context) ? feature.context : [])].filter(Boolean);
  const country = items.find((item) => {
    const id = String(item?.id || '').toLowerCase();
    const types = [item?.type, item?.place_type]
      .flat()
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return id.startsWith('country.') || types.includes('country');
  });
  const raw = country?.short_code || country?.properties?.short_code ||
    country?.country_code || country?.properties?.country_code ||
    feature?.properties?.country_code || feature?.country_code || '';
  const parts = String(raw).toUpperCase().split(/[-_]/).filter(Boolean);
  const code = parts.at(-1)?.replace(/[^A-Z]/g, '') || '';
  if (code === 'USA') return 'US';
  return code.length === 2 ? code : '';
}

export function firstUsMapTilerResult(features, fallbackLabel) {
  for (const feature of features) {
    const explicitCountry = mapTilerCountryCode(feature);
    if (explicitCountry && explicitCountry !== 'US') continue;
    const coordinates = feature?.center || feature?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) continue;
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90) continue;
    return {
      lon,
      lat,
      label: feature.place_name || feature.matching_place_name || feature.text || feature.name || fallbackLabel
    };
  }
  return null;
}
