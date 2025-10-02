// ===== MapTiler (vector) — your live config =====
const ORIGIN = location.hostname;
const MAPTILER_KEY = (
  ORIGIN === 'calbearsquared2025.github.io'
) ? 'jNqIsIVa4dP9qv7vQ8fy' // PROD
  : 'jNqIsIVa4dP9qv7vQ8fy'; // DEV (replace with localhost key if needed)

const MAPTILER_STYLE = `https://api.maptiler.com/maps/019997ef-99cb-7052-b842-98cc3dbf3d7c/style.json?key=${MAPTILER_KEY}`;

const DEFAULT_RADIUS_MILES = 50; // kept for possible future use

// ===== Trying to fix my jump =====
const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canAnimate = () =>
  !PREFERS_REDUCED &&
  document.visibilityState === 'visible' &&
  !!mapGL && mapGL.isStyleLoaded();

// ===== Globals =====
let mapGL = null;
let bars = [];            // populated by loadBars()
let barMarkers = [];
let userMarker = null;
let cameraLockUntil = 0;
const CAMERA_LOCK_MS = 1200;

const DEBUG_MOBILE = /(#|&)\bdebug=1\b/.test(location.hash + location.search)
  || localStorage.getItem('calbars_debug_mobile') === '1';

  

// ===== Increasing Padding =====
function uiPadding() {
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  // extra bottom so the bar pin + popup clear legend/attribution/safe-area
  if (isMobile) return { top: 80, right: 48, bottom: 160, left: 48 };
  return { top: 80, right: 80, bottom: 140, left: 80 };
}

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

// Wait until the #map box is stable (no size changes) for a short window.
// Handles flex-basis transitions + URL bar/keyboard changes on iOS.
function waitForMapStable({ minStable = 220, timeout = 1500 } = {}) {
  return new Promise(resolve => {
    const el = document.getElementById('map');
    if (!el) return resolve();

    let lastW = el.clientWidth, lastH = el.clientHeight;
    let stableSince = performance.now();
    let raf, to;

    const tick = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w !== lastW || h !== lastH) {
        lastW = w; lastH = h;
        stableSince = performance.now();
        try { mapGL && mapGL.resize(); } catch (_) {}
      }
      if (performance.now() - stableSince >= minStable) {
        cancelAnimationFrame(raf);
        clearTimeout(to);
        return resolve();
      }
      raf = requestAnimationFrame(tick);
    };

    // restart the “stable” clock once after the flex transition ends
    const onTE = () => { stableSince = performance.now(); };
    el.addEventListener('transitionend', onTE, { once: true });

    to = setTimeout(() => { cancelAnimationFrame(raf); resolve(); }, timeout);
    tick();
  });
}


function findMarkerByCoords(lat, lon) {
  const EPS = 1e-5;
  return barMarkers.find(m => {
    const ll = m.getLngLat();
    return Math.abs(ll.lat - (+lat)) < EPS && Math.abs(ll.lng - (+lon)) < EPS;
  }) || null;
}

function isLngLatVisible(lngLat, pad = 60) {
  if (!mapGL) return false;
  const p = mapGL.project(lngLat);
  const c = mapGL.getContainer();
  const w = c.clientWidth, h = c.clientHeight;
  return p.x >= pad && p.y >= pad && p.x <= (w - pad) && p.y <= (h - pad);
}

// Show/hide the list programmatically and keep the toggle button in sync
function setListShown(shown){
  document.body.classList.toggle('list-shown', shown);
  document.body.classList.toggle('list-hidden', !shown);  // <-- add this line

  const btn = $('#toggleListBtn');
  if (btn){
    btn.textContent = shown ? 'Hide list' : 'Show list';
    btn.setAttribute('aria-expanded', String(shown));
  }
  // Map needs a resize after layout change
  if (mapGL && typeof mapGL.resize === 'function'){
    setTimeout(() => mapGL.resize(), 150);
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

function addBarMarkerDefault(b) {
  if (!mapGL) return null;

  const addr = [b.address, b.city, b.state, b.zip].filter(Boolean).join(', ');
  const isOfficial = !!(b.promo && /official/i.test(b.promo));

  // Escape + tidy content (strip surrounding quotes)
  const tidy = s => String(s || '').trim().replace(/^["'](.*)["']$/, '$1');

  const safe = {
    name: esc(b.name || 'Bar'),
    addr: esc(addr),
    promo: esc(tidy(b.promo)),
    details: esc(tidy(b.details)),
    tvs: esc(tidy(b.tvs)),
    aff: esc(tidy(b.affiliation || ''))
  };

  const linkHtml = b.url && /^https?:\/\//i.test(b.url)
    ? `<a class="res-link btn" href="${esc(b.url)}" target="_blank" rel="noopener"><span class="nowrap">Google&nbsp;Maps</span></a>`
    : '';

  const html = `
    <div class="popup-card">
      <div class="res-row">
        <span class="res-name">${safe.name}${isOfficial ? ' <span class="res-pill">Parties</span>' : ''}</span>
      </div>
      ${addr ? `<div class="res-meta">${safe.addr}</div>` : ''}
      <div class="res-actions">
        ${linkHtml}
        ${safe.promo ? `<span class="res-note">${safe.promo}</span>` : ''}
        ${safe.tvs ? `<span class="res-note">${safe.tvs}</span>` : ''}
        ${safe.details ? `<span class="res-note">${safe.details}</span>` : ''}
        ${safe.aff ? `<span class="res-note">${safe.aff}</span>` : ''}
      </div>
    </div>
  `;

  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const popup = new maplibregl.Popup({ offset: isMobile ? 28 : 18 }).setHTML(html);

  const mk = new maplibregl.Marker({ element: makeCalPinEl(isOfficial), anchor: 'bottom' })
    .setLngLat([parseFloat(b.lon), parseFloat(b.lat)])
    .setPopup(popup)
    .addTo(mapGL);

  // Tag marker for lookup
  mk.__bar = b;
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
// === Always show ALL pins (no filtering) and fit to bounds ===
function renderAllMarkersAndFit({ fit = true } = {}) {
  clearBarMarkers();

  // You’re not filtering right now—just render all bars
  for (const r of bars) addBarMarkerCompat(r);

  if (fit && barMarkers.length && mapGL) {
    const b = new maplibregl.LngLatBounds();
    for (const m of barMarkers) b.extend(m.getLngLat());
    mapGL.fitBounds(b, { padding: uiPadding(), maxZoom: 6, duration: 0 });
  }
}

// Keep the “you + nearest” framing for context
// Keep the “you + nearest” framing for context — iOS/mobile-safe
function focusUserAndNearest(loc){
  if (!mapGL || !loc) return;

  const MAX_REASONABLE_Z = 15;
  const pad = uiPadding();
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const log = (...a) => { if (DEBUG_MOBILE) console.log('[focusUserAndNearest]', ...a); };

  const doFocus = () => {
    try { mapGL.stop(); } catch(_) {}
    try { mapGL.resize(); } catch(_) {}

    const startZoom = mapGL.getZoom();
    const startCenter = mapGL.getCenter();
    log('start', { startZoom, startCenter });

    const nb = nearestBarTo(loc.lat, loc.lon);

    const jumpUserOnly = () => {
      const target = { center: [loc.lon, loc.lat], zoom: 13 };
      if (isIOS) mapGL.jumpTo(target);
      else mapGL.easeTo({ ...target, duration: 600, essential: true });
      log('jump user only');
    };

    if (!nb){ jumpUserOnly(); return; }

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([loc.lon, loc.lat]);
    bounds.extend([nb.lon, nb.lat]);

    const cam = mapGL.cameraForBounds(bounds, { padding: pad });
    if (cam && typeof cam.zoom === 'number') {
      cam.zoom = Math.min(cam.zoom, MAX_REASONABLE_Z);
    }
    log('computed cam', cam);


    cameraLockUntil = Date.now() + CAMERA_LOCK_MS;
    mapGL.once('moveend', () => { cameraLockUntil = 0; });

const applyCam = () => {
  const targetFit = { padding: pad, maxZoom: MAX_REASONABLE_Z };
  const targetEase = cam || mapGL.cameraForBounds(bounds, targetFit);

  // guard zoom
  if (targetEase && typeof targetEase.zoom === 'number') {
    targetEase.zoom = Math.min(targetEase.zoom, MAX_REASONABLE_Z);
  }

  if (canAnimate()) {
    // Try smooth ease first (even on iOS)
    if (cam) {
      mapGL.easeTo({ ...targetEase, duration: 700, essential: true });
    } else {
      // cameraForBounds occasionally returns null early; ease to center as fallback
      const c = bounds.getCenter();
      mapGL.easeTo({ center: c, zoom: 12, duration: 700, essential: true });
    }
    log('applied cam via ease (all platforms)');
  } else {
    // No animation (reduced motion / hidden tab / style not ready)
    if (cam) mapGL.jumpTo(targetEase);
    else mapGL.fitBounds(bounds, targetFit);
    log('applied cam via jump (no-animate)');
  }
};
    // Apply now…
    applyCam();

    // …and verify after ~700ms; if no effective change, force a hard jump
    const verifyDelay = isIOS ? 500 : 700;
setTimeout(() => {
  const endZoom = mapGL.getZoom();
  const endCenter = mapGL.getCenter();
  const zoomChanged = Math.abs((endZoom || 0) - (startZoom || 0)) > 0.1;
  const centerMoved =
    Math.abs((endCenter.lng || 0) - (startCenter.lng || 0)) > 0.001 ||
    Math.abs((endCenter.lat || 0) - (startCenter.lat || 0)) > 0.001;

  log('verify', { endZoom, endCenter, zoomChanged, centerMoved });

  if (!zoomChanged && !centerMoved) {
    const cam2 = mapGL.cameraForBounds(bounds, { padding: pad });
    if (cam2 && typeof cam2.zoom === 'number') {
      cam2.zoom = Math.min(cam2.zoom, MAX_REASONABLE_Z);
    }
    if (cam2) mapGL.jumpTo(cam2);
    else mapGL.fitBounds(bounds, { padding: pad, maxZoom: MAX_REASONABLE_Z });
    log('watchdog forced jump');

    // shorten the lock ONLY when the watchdog actually fired
    cameraLockUntil = Date.now() + 300;
  }
}, verifyDelay);

  };

// Always defer exactly one 'idle' tick; iOS may still be mid-layout otherwise
try {
  mapGL.once('idle', doFocus);
} catch (_) {
  requestAnimationFrame(() => requestAnimationFrame(doFocus));
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
    ? `<a class="res-link btn" href="${esc(r.url)}" target="_blank" rel="noopener"><span class="nowrap">Google&nbsp;Maps</span></a>`
      : '';

return `<li class="res-item" data-lat="${esc(r.lat)}" data-lon="${esc(r.lon)}" data-place="${esc(r.place_id || '')}">
      <div class="res-row">
        <span class="res-name">${safe.name}</span>
        <span class="res-dist">${dist} mi</span>
      </div>
      ${addr ? `<div class="res-meta">${safe.addr}</div>` : ''}
      <div class="res-actions">
        ${link}
        ${r.promo ? (/official/i.test(r.promo)
          ? `<span class="res-pill">Parties</span>`
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
  const btn   = $('#searchBtn');
  const input = $('#address');
  if (!btn || !input) return;

 const runSearch = async () => {
  const q = (input.value || '').trim();
  if (!q) return;

  setStatus('Geocoding…');
  try {
    const loc = await geocode(q);
    setStatus('');

    // Update user marker and show all pins (instant fit, no animation)
    drawUserMarker(loc);
    renderAllMarkersAndFit({ fit: false });

    // Update list + show it (mobile). This changes layout height.
    renderListAll(loc);
    setListShown(true);
    window.Legend?.collapse();

    // Wait for layout to settle, then focus
    await waitForMapStable();
    focusUserAndNearest(loc);
  } catch (e) {
    console.error(e);
    setStatus('Address not found');
  }
};
 

  // Click = search
  btn.addEventListener('click', runSearch);

  // Enter-to-search
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

  // Autofill commits on mobile
  input.addEventListener('change', () => {
    const v = (input.value || '').trim();
    if (v) runSearch();
  });

  // (optional) tame noisy virtual keyboards; keep if you like
  input.addEventListener('input', () => {}, { passive: true });
}

 function wireAutocomplete() {
  const input = document.getElementById('address');
  const suggestions = document.getElementById('autocomplete-list');
  if (!input || !suggestions) return;

  let controller = null;

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    if (!q) {
      suggestions.innerHTML = '';
      suggestions.classList.remove('open');   // hide
      return;
    }

    if (controller) controller.abort();
    controller = new AbortController();

    try {
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_KEY}&autocomplete=true&country=us&limit=5&language=en`;
      const resp = await fetch(url, { signal: controller.signal });
      if (!resp.ok) return;
      const data = await resp.json();

      suggestions.innerHTML = '';

      const feats = (data.features || []);
      if (feats.length === 0) {
        suggestions.classList.remove('open'); // hide if no results
        return;
      }

      for (const f of feats) {
        const li = document.createElement('li');
        li.textContent = f.place_name;
        li.dataset.lat = f.center[1];
        li.dataset.lon = f.center[0];
        suggestions.appendChild(li);

        li.addEventListener('click', () => {
          input.value = f.place_name;          // fill input
          suggestions.innerHTML = '';
          suggestions.classList.remove('open'); // hide
          document.getElementById('searchBtn').click(); // run flow
        });
      }

      suggestions.classList.add('open'); // show list when populated
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  });

  // Hide when clicking outside
  document.addEventListener('click', (e) => {
    if (!suggestions.contains(e.target) && e.target !== input) {
      suggestions.innerHTML = '';
      suggestions.classList.remove('open'); // hide
    }
  });

  // Also hide on escape or blur if you want:
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      suggestions.innerHTML = '';
      suggestions.classList.remove('open');
    }
  });
}


function wireFindMe() {
  const btn = $('#findMeBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    setStatus('Finding…');
    btn.disabled = true;

    try {
      const loc = await getCurrentLocation();
      setStatus('');

      // Update user marker and show all pins (instant fit, no animation)
      drawUserMarker(loc);
      renderAllMarkersAndFit({ fit: false });

      // Update list + show it (mobile). This changes layout height.
      renderListAll(loc);
      setListShown(true);
      window.Legend?.collapse();

      // Wait for layout to settle, then focus
      await waitForMapStable();
      focusUserAndNearest(loc);
    } catch (e) {
      console.error(e);
      setStatus(e?.message || 'Location failed');
    } finally {
      btn.disabled = false;
    }
  });
}


function wireListClicks() {
  const list = document.getElementById('results');
  if (!list) return;

  list.addEventListener('click', (e) => {
    // Don’t hijack real links (e.g., Google Maps)
    if (e.target.closest('a')) return;

    const li = e.target.closest('.res-item');
    if (!li) return;

    const lat = li.getAttribute('data-lat');
    const lon = li.getAttribute('data-lon');
    if (!lat || !lon) return;

    // visual and a11y state
document.querySelectorAll('.res-item.is-active').forEach(n => n.classList.remove('is-active'));
li.classList.add('is-active');
li.setAttribute('aria-selected', 'true');


const latF = parseFloat(lat), lonF = parseFloat(lon);
const ll = [lonF, latF];
const mk = findMarkerByCoords(latF, lonF);
const currentZoom = mapGL.getZoom() || 0;

// if already visible, just open the popup
if (isLngLatVisible(ll)) {
  if (mk && mk.togglePopup) mk.togglePopup();
  return;
}

// otherwise, pan to it at the SAME zoom (no zoom-in/out)
const wantPan = () => {
  if (isLngLatVisible(ll)) { if (mk && mk.togglePopup) mk.togglePopup(); return; }
  const currentZoom = mapGL.getZoom() || 0;
  mapGL.easeTo({ center: ll, zoom: currentZoom, duration: 500, essential: true });
  if (mk && mk.togglePopup) mapGL.once('moveend', () => { try { mk.togglePopup(); } catch(_){} });
};

if (Date.now() < cameraLockUntil) {
  mapGL.once('moveend', wantPan);   // defer until focus completes
  return;
}
wantPan();

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
      window.Legend?.collapse(); // <— collapse legend when list opens
      setTimeout(()=>{
        const y = listEl.getBoundingClientRect().top + window.pageYOffset - 6;
        window.scrollTo({ top: y, behavior: 'smooth' });
  }, 60);
}

    
  });
}

function wireAboutModal() {
  const btn   = document.getElementById('aboutBtn');
  const modal = document.getElementById('aboutModal');
  const close = document.getElementById('aboutClose');

  if (!btn || !modal || !close) return; // nothing to wire

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    modal.setAttribute('aria-hidden', 'false');
  });

  close.addEventListener('click', () => {
    modal.setAttribute('aria-hidden', 'true');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.setAttribute('aria-hidden', 'true'); // close if clicking backdrop
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.setAttribute('aria-hidden', 'true');
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

 const opts = { container: 'map', style: MAPTILER_STYLE, attributionControl: false };

  // Start at final bounds to avoid initial camera jump
  if (initialBounds){
    opts.bounds = initialBounds;                       // [[west,south],[east,north]]
    opts.fitBoundsOptions = { padding: uiPadding(), maxZoom: 6 };
  } else {
    // Fallback if no bars yet
    opts.center = [-98.5795, 39.8283];
    opts.zoom = 4;
  }

  mapGL = new maplibregl.Map(opts);
  requestAnimationFrame(() => requestAnimationFrame(() => { if (mapGL) mapGL.resize(); }));
  mapGL.addControl(new maplibregl.NavigationControl(), 'top-right');

// Surface useful errors when #debug=1
mapGL.on('error', (e) => { if (DEBUG_MOBILE) console.error('[MapLibre error]', e?.error || e); });

// If the map container’s box changes (keyboard/list/legend), force a resize
try {
  const ro = new ResizeObserver(() => { try { mapGL.resize(); } catch(_) {} });
  ro.observe(document.getElementById('map'));
} catch(_) {}


  // Attribution: compact on mobile, expanded on desktop
const isMobile = window.matchMedia('(max-width: 900px)').matches;
mapGL.addControl(new maplibregl.AttributionControl({ compact: isMobile }), 'bottom-right');

// Guard: on some setups attribution starts expanded until first move.
// Force-collapse once on mobile.
if (isMobile) {
  mapGL.once('load', () => {
    const el = document.querySelector('.maplibregl-ctrl-attrib');
    if (el) {
      el.classList.add('maplibregl-compact');          // <— ensure compact class is present
      el.classList.remove('maplibregl-ctrl-attrib-expanded'); // ensure collapsed
    }
  });
}
// Add the collapsible legend to bottom-left
mapGL.addControl(createLegendControl(), 'bottom-left');

  
// --- Collapsible legend control (clean version, defaults to collapsed)
function createLegendControl({ collapsedDefault = true } = {}) {
  // bump the key so everyone starts fresh collapsed
  const LS_KEY = 'legendCollapsed_v2';

  const getInitial = () => {
    const v = localStorage.getItem(LS_KEY);
    return v == null ? collapsedDefault : v === 'true';
  };

  let container, toggleBtn, isCollapsed = getInitial();

  const updateUI = () => {
    container.classList.toggle('is-collapsed', isCollapsed);
    toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
    toggleBtn.setAttribute('aria-label', isCollapsed ? 'Show legend' : 'Hide legend');
    localStorage.setItem(LS_KEY, String(isCollapsed));
  };

  const onToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isCollapsed = !isCollapsed;
    updateUI();
  };

  return {
    onAdd() {
      container = document.createElement('div');
      container.className = 'maplibregl-ctrl map-legend is-collapsible';

      container.innerHTML = `
        <button class="legend-toggle" type="button" aria-expanded="false">
          <!-- Collapsed: two pins side-by-side -->
          <div class="legend-mini" aria-hidden="true">
            <span class="legend-pin legend-official"></span>
            <span class="legend-pin legend-regular"></span>
          </div>

          <!-- Expanded: full legend rows -->
          <div class="legend-full">
            <div class="legend-item">
              <span class="legend-pin legend-official"></span>
              <span class="legend-label">Watch Parties/Promos</span>
            </div>
            <div class="legend-item">
              <span class="legend-pin legend-regular"></span>
              <span class="legend-label">Cal Bar</span>
            </div>
          </div>
        </button>
      `;

      toggleBtn = container.querySelector('.legend-toggle');
      toggleBtn.addEventListener('click', onToggle);
      // expose a tiny API for other code paths (safe if not yet created)
window.Legend = {
  collapse(){ isCollapsed = true; updateUI(); },
  expand(){ isCollapsed = false; updateUI(); },
  toggle(){ onToggle(new Event('click')); }
};

      updateUI();
      return container;
    },

    
    onRemove() {
      if (toggleBtn) toggleBtn.removeEventListener('click', onToggle);
      if (container && container.parentNode) container.parentNode.removeChild(container);
    }
  };
}

}

// ===== Boot =====
async function boot(){
  setListShown(false); // start with list hidden on mobile
  wireSearch();
  wireFindMe();
  wireListClicks();
  wireAutocomplete();


  try{
    await loadBars();

    // Create map already framed to all bars to avoid initial zoom jump
    const extent = getBarsExtent();
    ensureMap(extent);

    // Map: show ALL pins and fit (no visible move if bounds already set)
    renderAllMarkersAndFit({ fit: false });

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
  wireAboutModal(); // <-- add this line

});

// Minimal debounce
const _debounce = (fn, d=200) => {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); };
};

window.addEventListener('orientationchange', () => { if (mapGL) mapGL.resize(); });

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', _debounce(() => { if (mapGL) mapGL.resize(); }, 200));
}

// Expose a few helpers for quick console checks
window.CalBars = { loadBars, geocode, nearestBarTo, renderAllMarkersAndFit, renderListAll, haversine };