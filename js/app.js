/* ---------------------------------
   Cal Bars — app.js (final, lean)
   - Always show ALL pins on the map
   - Always show ALL bars in the list, sorted by distance
   - Initial list sorted from Cal Memorial Stadium
   - ZIP-aware geocoding
   - Uses mapGL (no window.map collisions)
   - Loads bars from footer #dataSourceLink (published Google Sheets CSV)
   - Strict CSV headers:
     name,address,city,state,zip,lat,lon,url,promo,details,tvs,affiliation,submitted_as,place_id
---------------------------------- */

// ===== MapTiler (vector) — your live config =====
const ORIGIN = location.hostname;
const MAPTILER_KEY = (
  ORIGIN === 'calbearsquared2025.github.io'
) ? 'jNqIsIVa4dP9qv7vQ8fy' // PROD
  : 'jNqIsIVa4dP9qv7vQ8fy'; // DEV (replace with localhost key if needed)

const MAPTILER_STYLE = `https://api.maptiler.com/maps/019997ef-99cb-7052-b842-98cc3dbf3d7c/style.json?key=${MAPTILER_KEY}`;

const DEFAULT_RADIUS_MILES = 50; // kept for possible future use

// ===== Globals =====
let mapGL = null;
let bars = [];            // populated by loadBars()
let barMarkers = [];
let userMarker = null;

// ===== DOM helpers =====
const $ = (sel) => document.querySelector(sel);
function setStatus(msg) { const el = $('#status'); if (el) el.textContent = msg || ''; }
function setBarsCount(text) { const el = $('#barsCount'); if (el) el.textContent = text || ''; }
const esc = (s = '') => String(s).replace(/[&<>"']/g, m => ({
'&': '&amp;',
'<': '&lt;',
'>': '&gt;',
'"': '&quot;',
"'": '&#39;'
}[m]));
// Show/hide the list programmatically and keep the toggle button in sync
function setListShown(shown){
  document.body.classList.toggle('list-shown', shown);
  document.body.classList.toggle('list-hidden', !shown);  // <-- add this line

  const btn = $('#toggleListBtn');
  if (btn){
    btn.textContent = shown ? 'Hide list ↓' : 'Show list ↑';
    btn.setAttribute('aria-expanded', String(shown));
  }
  // Map needs a resize after layout change
  if (mapGL && typeof mapGL.resize === 'function'){
    setTimeout(() => mapGL.resize(), 50);
  }
}

// ===== CSV loader (strict headers) =====
function normalizeBar(row){
  const lat = parseFloat(row.lat);
  const lon = parseFloat(row.lon);
  if (!isFinite(lat) || !isFinite(lon)) return null;

  return {
    name: row.name || 'Bar',
    address: row.address || '',
    city: row.city || '',
    state: row.state || '',
    zip: row.zip || '',
    lat, lon,
    url: row.url || '',
    promo: row.promo || '',
    details: row.details || '',
    tvs: row.tvs || '',
    affiliation: row.affiliation || '',
    submitted_as: row.submitted_as || '',
    place_id: row.place_id || ''
  };
}

function getDataSourceUrl(){
  const raw = document.getElementById('dataSourceLink')?.getAttribute('href') || '';
  return raw && raw !== '#' ? raw : 'data/bars.csv';
}


function loadBars(){
  return new Promise((resolve, reject)=>{
    if (Array.isArray(window.bars) && window.bars.length){
      bars = window.bars.map(normalizeBar).filter(Boolean);
      setBarsCount(`${bars.length} bars loaded`);
      return resolve(bars);
    }

    const url = getDataSourceUrl();
    setStatus('Loading bars…');

    if (typeof Papa === 'undefined'){
      const err = new Error('PapaParse not loaded');
      console.error(err);
      setStatus('CSV parser missing');
      return reject(err);
    }

    Papa.parse(url, {
      download: true,
      header: true,          // relies on your exact headers
      skipEmptyLines: true,
      complete: (res)=>{
        const rows = Array.isArray(res.data) ? res.data : [];
        bars = rows.map(normalizeBar).filter(Boolean);
        setStatus('');
        setBarsCount(bars.length ? `${bars.length} bars loaded` : 'No bars in dataset');
        resolve(bars);
      },
      error: (err)=>{
        console.error('CSV load error:', err);
        setStatus('Could not load bar data.');
        reject(err);
      }
    });
  });
}

// ===== Distance + nearest =====
function haversine(lat1, lon1, lat2, lon2){
  const R = 3958.7613; // miles
  const toRad = (d)=> d*Math.PI/180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

function nearestBarTo(lat, lon){
  let best = null, bestD = Infinity, bestBar = null;
  for (const b of bars || []){
    const bl = parseFloat(b.lat), blon = parseFloat(b.lon);
    if (!isFinite(bl) || !isFinite(blon)) continue;
    const d = haversine(lat, lon, bl, blon);
    if (d < bestD){ bestD = d; best = { lat: bl, lon: blon, d }; bestBar = b; }
  }
  return best ? { ...best, bar: bestBar } : null;
}

// ===== Geocoding (ZIP-aware) =====
async function geocode(q){
  const raw = (q || '').trim();
  if (!raw) throw new Error('Empty query');

  const isZip5 = /^\d{5}$/.test(raw);
  const zipDigits = raw;

  const base = 'https://api.maptiler.com/geocoding';
  const center = (mapGL && mapGL.getCenter && mapGL.getCenter()) || null;
  const prox = center ? `&proximity=${center.lng},${center.lat}` : '';
  const common = `key=${MAPTILER_KEY}&language=en&limit=1`;

  if (isZip5) {
    // Try 1 — strict US postal_code ONLY, no autocomplete/fuzzy
    const url1 = `${base}/${zipDigits}.json?${common}&types=postal_code&country=us&autocomplete=false&fuzzyMatch=false`;
    let resp = await fetch(url1);
    let data = resp.ok ? await resp.json() : null;
    let feat = data?.features?.[0];

    // Guard: accept only real postal_code
    if (feat && !(Array.isArray(feat.place_type) && feat.place_type.includes('postal_code'))) {
      feat = null;
    }

    // Try 2 — still postal_code only, but drop country filter
    if (!feat) {
      const url2 = `${base}/${zipDigits}.json?${common}&types=postal_code&autocomplete=false&fuzzyMatch=false`;
      resp = await fetch(url2);
      data = resp.ok ? await resp.json() : null;
      feat = data?.features?.find(f => Array.isArray(f.place_type) && f.place_type.includes('postal_code')) || null;
    }

    // If still nothing, fail cleanly
    if (!feat) throw new Error('ZIP code not found');

    const [lon, lat] = feat.center || feat.geometry?.coordinates || [];
    if (!isFinite(lat) || !isFinite(lon)) throw new Error('Bad geocode');
    return { lat, lon, display: feat.place_name || feat.text || raw };
  }

  // Non-ZIP text search
  const urlUS = `${base}/${encodeURIComponent(raw)}.json?${common}&country=us${prox}`;
  let resp = await fetch(urlUS);
  if (!resp.ok) throw new Error('Geocoding failed');

  const data = await resp.json();
  const feat = data?.features?.[0];
  if (!feat) throw new Error('No results');

  const [lon, lat] = feat.center || feat.geometry?.coordinates || [];
  if (!isFinite(lat) || !isFinite(lon)) throw new Error('Bad geocode');
  return { lat, lon, display: feat.place_name || feat.text || raw };
}

// ===== Location (getCurrentLocation) =====
function getCurrentLocation(){
  return new Promise((resolve, reject)=>{
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (pos)=> resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err)=> reject(new Error(err?.message || 'Failed to get location')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

// ===== Map + markers =====
// === Custom Cal pin (blue gradient + gold dot), and a yellow "you" dot ===
// Blue pin with gold dot (default)
const CAL_PIN_SVG_RAW = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
  <defs>
    <linearGradient id="g-blue" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#002676"/>
      <stop offset="100%" stop-color="#001b58"/>
    </linearGradient>
  </defs>
  <path d="M14 0C6.27 0 0 6.27 0 14c0 9.25 12.22 24.78 13.1 25.9a1.2 1.2 0 0 0 1.8 0C15.78 38.78 28 23.25 28 14 28 6.27 21.73 0 14 0z" fill="url(#g-blue)"/>
  <circle cx="14" cy="14" r="6" fill="#FDB515"/>
</svg>`;

// Gold pin with blue dot (official)
const CAL_PIN_SVG_OFFICIAL = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
  <defs>
    <linearGradient id="g-gold" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#FDB515"/>
      <stop offset="100%" stop-color="#e6a413"/>
    </linearGradient>
  </defs>
  <path d="M14 0C6.27 0 0 6.27 0 14c0 9.25 12.22 24.78 13.1 25.9a1.2 1.2 0 0 0 1.8 0C15.78 38.78 28 23.25 28 14 28 6.27 21.73 0 14 0z" fill="url(#g-gold)"/>
  <circle cx="14" cy="14" r="6" fill="#002676"/>
</svg>`;


function makeCalPinEl(isOfficial = false){
  const el = document.createElement('div');
  el.className = 'cal-pin';
  el.innerHTML = isOfficial ? CAL_PIN_SVG_OFFICIAL : CAL_PIN_SVG_RAW;
  return el;
}


function makeYouDotEl(){
  const el = document.createElement('div');
  el.className = 'you-dot';
  return el;
}


function clearBarMarkers(){
  for (const m of barMarkers) { try { m.remove(); } catch(_){} }
  barMarkers = [];
}

function drawUserMarker(loc){
  if (!mapGL) return;
  if (userMarker){ try { userMarker.remove(); } catch(_){} userMarker = null; }
  userMarker = new maplibregl.Marker({ element: makeYouDotEl(), anchor: 'center' })
    .setLngLat([loc.lon, loc.lat])
    .addTo(mapGL);
}
function addBarMarkerDefault(b){
  if (!mapGL) return null;

  const addr = [b.address, b.city, b.state, b.zip].filter(Boolean).join(', ');
  const isOfficial = !!(b.promo && /official/i.test(b.promo));

  // Escape text fields
  const name = esc(b.name || 'Bar');
  const safeAddr = esc(addr);
  const promo = esc(b.promo || '');
  const details = esc(b.details || '');
  const tvs = esc(b.tvs || '');
  const aff = esc(b.affiliation || '');

  // Validate and escape URL
  const linkHtml = b.url && /^https?:\/\//i.test(b.url)
    ? `<br><a href="${esc(b.url)}" target="_blank" rel="noopener">Google Maps</a>`
    : '';

  const mk = new maplibregl.Marker({ element: makeCalPinEl(isOfficial), anchor: 'bottom' })
    .setLngLat([parseFloat(b.lon), parseFloat(b.lat)])
    .setPopup(
      new maplibregl.Popup({ offset: 18 }).setHTML(
        `<strong>${name}</strong>` +
        (addr ? `<br>${safeAddr}` : '') +
        linkHtml +
        (b.promo ? `<br><em>${promo}</em>` : '') +
        (b.details ? `<br>${details}` : '') +
        (b.tvs ? `<br>${tvs}` : '') +
        (b.affiliation ? `<br><small>${aff}</small>` : '')
      )
    )
    .addTo(mapGL);

  barMarkers.push(mk);
  return mk;
}


function addBarMarkerCompat(b){
  if (typeof window.addBarMarker === 'function'){
    const mk = window.addBarMarker(b, mapGL);
    if (mk) barMarkers.push(mk);
    return mk;
  }
  return addBarMarkerDefault(b);
}

// === Always show ALL pins (no filtering) and fit to bounds ===
function renderAllMarkersAndFit(){
  clearBarMarkers();
  for (const b of bars || []){
    const lat = parseFloat(b.lat), lon = parseFloat(b.lon);
    if (!isFinite(lat) || !isFinite(lon)) continue;
    addBarMarkerCompat(b);
  }
  if (barMarkers.length && mapGL){
    const bounds = new maplibregl.LngLatBounds();
    barMarkers.forEach(m => bounds.extend(m.getLngLat()));
    mapGL.fitBounds(bounds, { padding: 64, maxZoom: 6, duration: 0 });
  }
}

// Keep the “you + nearest” framing for context
function focusUserAndNearest(loc){
  if (!mapGL) return;
  const nb = nearestBarTo(loc.lat, loc.lon);
  if (nb){
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([loc.lon, loc.lat]);
    bounds.extend([nb.lon, nb.lat]);
    mapGL.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 600 });
  } else {
    mapGL.jumpTo({ center: [loc.lon, loc.lat], zoom: 13 });
  }
}

// ===== List: ALWAYS show ALL bars, sorted by distance to `loc` =====
function renderListAll(loc){
  const listEl = $('#results');
  if (!listEl) return;

  const items = (bars || []).map(b=>{
    const d = haversine(loc.lat, loc.lon, parseFloat(b.lat), parseFloat(b.lon));
    return { ...b, _dist: d };
  }).sort((a,b)=> a._dist - b._dist);

  listEl.innerHTML = items.map(r=>{
    const dist = Number.isFinite(r._dist) ? (Math.round(r._dist*10)/10).toFixed(1) : '–';
    const addr = [r.address, r.city, r.state, r.zip].filter(Boolean).join(', ');

    // Escape text fields
    const safe = {
      name: esc(r.name || 'Bar'),
      addr: esc(addr),
      promo: esc(r.promo || ''),
      tvs: esc(r.tvs || ''),
      details: esc(r.details || ''),
      aff: esc(r.affiliation || '')
    };

    // Validate and escape URL
    const link = r.url && /^https?:\/\//i.test(r.url)
      ? `<a class="res-link" href="${esc(r.url)}" target="_blank" rel="noopener">Google Maps</a>`
      : '';

    return `<li class="res-item">
      <div class="res-row">
        <span class="res-name">${safe.name}</span>
        <span class="res-dist">${dist} mi</span>
      </div>
      ${addr ? `<div class="res-meta">${safe.addr}</div>` : ''}
      <div class="res-actions">
        ${link}
        ${r.promo ? (/official/i.test(r.promo)
          ? `<span class="res-pill">${safe.promo}</span>`
          : `<span class="res-note">${safe.promo}</span>`) : ''}
        ${r.tvs ? `<span class="res-note">${safe.tvs}</span>` : ''}
        ${r.details ? `<span class="res-note">${safe.details}</span>` : ''}
        ${r.affiliation ? `<span class="res-note">${safe.aff}</span>` : ''}
      </div>
    </li>`;
  }).join('');

  const total = items.length;
  setBarsCount(`${total} Cal bars`);
}

// ===== Controls =====
function wireSearch(){
  const btn = $('#searchBtn');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const q = ($('#address')?.value || '').trim();
    if (!q) return;
    setStatus('Geocoding…');
    try{
      const loc = await geocode(q);
      setStatus('');
      drawUserMarker(loc);

      // Keep ALL pins visible
      renderAllMarkersAndFit();

      // List: ALL bars sorted by the searched spot
      renderListAll(loc);
      setListShown(true); // auto-show list on mobile

      // Frame you + nearest for context
      focusUserAndNearest(loc);
    } catch (e){
      console.error(e);
      setStatus('Address not found');
    }
  });
  const input = $('#address');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btn.click(); // trigger the same handler as clicking Search
      }
    });
  }

}

function wireFindMe(){
  const btn = $('#findMeBtn');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    setStatus('Locating…');
    try{
      const loc = await getCurrentLocation();
      setStatus('');
      drawUserMarker(loc);

      // Keep ALL pins visible
      renderAllMarkersAndFit();

      // List: ALL bars sorted by your location
      renderListAll(loc);
      setListShown(true);

      // Frame you + nearest
      focusUserAndNearest(loc);
    } catch(e){
      setStatus(e.message || 'Location failed');
    }
  });
}

// ===== Show/Hide List toggle — map becomes half-height when list shown =====
function wireListToggle(){
  const btn = $('#toggleListBtn');
  const listEl = $('#list');
  if (!btn || !listEl) return;

  const applyState = (shown) => {
      setListShown(shown);

  };

  // init based on current class
  applyState(document.body.classList.contains('list-shown'));

  btn.addEventListener('click', () => {
    const nowShown = !document.body.classList.contains('list-shown');
    applyState(nowShown);
    if (nowShown) {
      setTimeout(()=>{
        const y = listEl.getBoundingClientRect().top + window.pageYOffset - 6;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 60);
    }
  });
}
// Compute [ [minLon, minLat], [maxLon, maxLat] ] from loaded bars
function getBarsExtent(){
  let minLon =  Infinity, minLat =  Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;
  for (const b of bars || []){
    const lon = parseFloat(b.lon), lat = parseFloat(b.lat);
    if (!isFinite(lon) || !isFinite(lat)) continue;
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  return (isFinite(minLon) && isFinite(minLat) && isFinite(maxLon) && isFinite(maxLat))
    ? [[minLon, minLat], [maxLon, maxLat]]
    : null;
}

// ===== Map init =====
function ensureMap(initialBounds){
  if (mapGL) return;
  if (typeof maplibregl === 'undefined') {
    console.error('MapLibre GL JS not loaded');
    return;
  }
  const mapEl = $('#map');
  if (!mapEl){
    console.warn('No #map element found — cannot initialize map.');
    return;
  }

  const opts = { container: 'map', style: MAPTILER_STYLE };

  // Start at final bounds to avoid initial camera jump
  if (initialBounds){
    opts.bounds = initialBounds;                       // [[west,south],[east,north]]
    opts.fitBoundsOptions = { padding: 64, maxZoom: 6 };
  } else {
    // Fallback if no bars yet
    opts.center = [-98.5795, 39.8283];
    opts.zoom = 4;
  }

  mapGL = new maplibregl.Map(opts);
  requestAnimationFrame(() => requestAnimationFrame(() => { if (mapGL) mapGL.resize(); }));
  mapGL.addControl(new maplibregl.NavigationControl(), 'top-right');

  
  // --- Legend control (inside the map, won't affect list layout)
  function createLegendControl(){
    const ctrl = {
      onAdd(){
        const el = document.createElement('div');
        el.className = 'maplibregl-ctrl map-legend';
        el.innerHTML = `
          <div class="legend-item">
            <span class="legend-pin legend-official"></span>
            Watch Parties/Promos
          </div>
          <div class="legend-item">
            <span class="legend-pin legend-regular"></span>
            Cal Bar
          </div>
        `;
        this._container = el;
        return el;
      },
      onRemove(){
        if (this._container?.parentNode) {
          this._container.parentNode.removeChild(this._container);
        }
        this._container = undefined;
      }
    };
    return ctrl;
  }

  // Add legend to bottom-left corner of the map
  mapGL.addControl(createLegendControl(), 'bottom-left');

  mapGL.on('error', (e)=>{
    if (e?.error?.status === 403) {
      console.error('Map style 403. Check MAPTILER_KEY or allowed domains.');
      setStatus('Map style blocked (403). Double-check MapTiler key/domains.');
    }
  });
}


// ===== Boot =====
async function boot(){
  setListShown(false); // start with list hidden on mobile
  wireSearch();
  wireFindMe();

  try{
    await loadBars();

    // Create map already framed to all bars to avoid initial zoom jump
    const extent = getBarsExtent();
    ensureMap(extent);

    // Map: show ALL pins and fit (no visible move if bounds already set)
    renderAllMarkersAndFit();

    setTimeout(() => { if (mapGL) mapGL.resize(); });


    // List: sort by California Memorial Stadium
    const memorialStadium = { lat: 37.8719, lon: -122.2600 };
    renderListAll(memorialStadium);
  } catch(e){
    console.error(e);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  boot();
  wireListToggle();
});

// Expose a few helpers for quick console checks
window.CalBars = { loadBars, geocode, nearestBarTo, renderAllMarkersAndFit, renderListAll, haversine };