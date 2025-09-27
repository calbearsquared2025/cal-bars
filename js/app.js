// ===== Config =====
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO6KT8rcNjx8vbKs2iXOYRFnttCOC6EN7QNGivJBRaRdyAfg8l4kYbsE8vt3onqxBqKrnSvh-EczhU/pub?gid=11952344&single=true&output=csv';
const SUBMIT_FORM_URL = 'https://forms.gle/maBc5Z1MUun3WQ4R8';
const MAX_RESULTS = 25;

// MapTiler (vector)
const ORIGIN = location.hostname;
const MAPTILER_KEY = (
  ORIGIN === 'calbearsquared2025.github.io'
) ? 'jNqIsIVa4dP9qv7vQ8fy' // PROD
  : 'jNqIsIVa4dP9qv7vQ8fy'; // DEV (replace with localhost key if needed)

const MAPTILER_STYLE = `https://api.maptiler.com/maps/0199885d-821b-7d60-9aba-5656da203820/style.json?key=${MAPTILER_KEY}`;

// ===== Globals =====
let map;
let bars = [];
let markers = [];

// ===== Utilities =====
function haversine(lat1, lon1, lat2, lon2){
  const toRad = d=> d*Math.PI/180;
  const R = 3958.8;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

async function geocode(q){
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if(!resp.ok) throw new Error('Geocoding failed');
  const data = await resp.json();
  if(!data.length) throw new Error('No results');
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
}

// Geolocation function
function getCurrentLocation(){
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        resolve({ 
          lat, 
          lon, 
          display: `Current location (${lat.toFixed(4)}, ${lon.toFixed(4)})` 
        });
      },
      (error) => {
        let message = 'Location access denied';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

function loadCSV(){
  return new Promise((resolve,reject)=>{
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results)=> resolve(results.data),
      error: reject
    });
  });
}

function setStatus(msg){
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function updateBarsCount(count) {
  const el = document.getElementById('barsCount');
  if (el) el.textContent = `${count} bars loaded`;
}

// ===== Custom Pins =====
const CAL_PIN_SVG_RAW = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#002676"/>
      <stop offset="100%" stop-color="#001b58"/>
    </linearGradient>
  </defs>
  <path d="M14 0C6.27 0 0 6.27 0 14c0 9.25 12.22 24.78 13.1 25.9a1.2 1.2 0 0 0 1.8 0C15.78 38.78 28 23.25 28 14 28 6.27 21.73 0 14 0z" fill="url(#g)"/>
  <circle cx="14" cy="14" r="6" fill="#FDB515"/>
</svg>`;

function makeCalPinEl(){
  const el = document.createElement('div');
  el.className = 'cal-pin';
  el.innerHTML = CAL_PIN_SVG_RAW;
  return el;
}

function makeYouDotEl(){
  const el = document.createElement('div');
  el.style.width = '18px';
  el.style.height = '18px';
  el.style.background = '#FDB515';
  el.style.border = '2px solid #002676';
  el.style.borderRadius = '50%';
  return el;
}

// ===== Map setup =====
function initMap(){
  map = new maplibregl.Map({
    container: 'map',
    style: MAPTILER_STYLE,
    // was Berkeley + zoom 11
    center: [-98.5795, 39.8283], // continental U.S. center
    zoom: 3.5                    // coast-to-coast view
  });
  map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

function clearMarkers(){
  markers.forEach(m=> m.remove());
  markers = [];
}

function addMarker(lon, lat, popupHtml, isOrigin = false){
  const el = isOrigin ? makeYouDotEl() : makeCalPinEl();
  const marker = new maplibregl.Marker({ element: el, anchor: isOrigin ? 'center' : 'bottom' })
    .setLngLat([lon, lat])
    .setPopup(new maplibregl.Popup({ offset: isOrigin ? 12 : 24 }).setHTML(popupHtml))
    .addTo(map);
  markers.push(marker);
  return marker;
}

function fitToMarkers(){
  if (!markers.length) return;
  const bounds = new maplibregl.LngLatBounds();
  markers.forEach(m=> bounds.extend(m.getLngLat()));
  map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
}
// ===== Rendering =====
function renderList(origin, radiusMiles){
  let withDist = bars.map(b=>{
    const lat = parseFloat(b.lat), lon = parseFloat(b.lon);
    const d = (isFinite(lat) && isFinite(lon)) ? haversine(origin.lat, origin.lon, lat, lon) : Infinity;
    return { ...b, distance: d };
  });

  if (isFinite(radiusMiles)) {
    withDist = withDist
      .filter(b => b.distance <= radiusMiles)
      .sort((a,b)=> a.distance - b.distance)
      .slice(0, MAX_RESULTS);
  } else {
    // Keep ALL bars; just reorder by distance to the chosen origin
    withDist = withDist.sort((a,b)=> a.distance - b.distance);
  }

  const ol = document.getElementById('results');
  if (!ol) return;
  ol.innerHTML = '';
  withDist.forEach(b=>{
    const miles = Number.isFinite(b.distance) ? b.distance.toFixed(1) + ' mi' : 'n/a';
    const addr  = [b.address, b.city, b.state, b.zip].filter(Boolean).join(', ');
    const url   = (b.url && b.url.startsWith('http')) ? b.url : null;

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${b.name || 'Unnamed Bar'}</strong> — ${miles}<br>
      <span>${addr}</span><br>
      ${url ? `<a href="${url}" target="_blank" rel="noopener">Google Maps</a>` : ''}
      ${b.promo   ? `<div><em>${b.promo}</em></div>` : ''}
      ${b.details ? `<div>${b.details}</div>` : ''}
      ${b.tvs     ? `<div>${b.tvs}</div>` : ''}
      ${b.affiliation ? `<div><small>${b.affiliation}</small></div>` : ''}
      ${b.submitted_as ? `<div><small>${b.submitted_as}</small></div>` : ''}
    `;
    li.style.cursor = 'pointer';
    li.addEventListener('click', ()=>{
      const lat = parseFloat(b.lat), lon = parseFloat(b.lon);
      if (isFinite(lat) && isFinite(lon)) map.jumpTo({ center: [lon, lat], zoom: 14 });
    });
    ol.appendChild(li);
  });
}

function renderMarkers(origin, radiusMiles, showOrigin = true, { fit = true } = {}){
  clearMarkers();

  if (showOrigin) addMarker(origin.lon, origin.lat, 'You', true);

  bars.forEach(b=>{
    const lat = parseFloat(b.lat), lon = parseFloat(b.lon);
    if(!isFinite(lat) || !isFinite(lon)) return;
    const d = haversine(origin.lat, origin.lon, lat, lon);
    if (isFinite(radiusMiles) && d > radiusMiles) return;

    const addr = [b.address, b.city, b.state, b.zip].filter(Boolean).join(', ');
    const url  = (b.url && b.url.startsWith('http')) ? b.url : null;

    const popup = `
      <strong>${b.name || 'Unnamed Bar'}</strong><br>
      ${addr}
      ${url ? `<br><a href="${url}" target="_blank" rel="noopener">Google Maps</a>` : ''}
      ${b.promo   ? `<br><br><em>${b.promo}</em>` : ''}
      ${b.details ? `<br>${b.details}` : ''}
      ${b.tvs     ? `<br>${b.tvs}` : ''}
      ${b.affiliation ? `<br><small>${b.affiliation}</small>` : ''}
    `;
    addMarker(lon, lat, popup);
  });

  if (fit) fitToMarkers();
}

// ===== Main =====
async function main(){
  const submitLink = document.getElementById('submitLink');
  const dataLink = document.getElementById('dataSourceLink');
  if (submitLink) submitLink.href = SUBMIT_FORM_URL;
  if (dataLink) dataLink.href = CSV_URL;

  setStatus('Loading bars…');
  try {
    bars = await loadCSV();
    setStatus(`Loaded ${bars.length} bars`);
    updateBarsCount(bars.length);

    const origin = { lat: 39.8283, lon: -98.5795 }; // central U.S.
    const radius = Infinity;                        // include all bars
    renderMarkers(origin, radius, false, { fit: true }); // fit on initial load
    renderList(origin, radius);
  } catch(e){
    console.error(e);
    setStatus('Failed to load data');
  }
}

function wireSearch(){
  const btn = document.getElementById('searchBtn');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    const q = (document.getElementById('address')?.value || '').trim();
    // We want to keep ALL bars in the list/map; only reorder by distance
    const listRadius = Infinity;
    if(!q) return;
    setStatus('Geocoding…');
    try{
      const loc = await geocode(q);
      setStatus(`Center: ${loc.display}`);
      map.jumpTo({ center: [loc.lon, loc.lat], zoom: 11 });

      // Map: keep ALL markers, draw origin dot, don't auto-fit (stay zoomed near the dot)
      renderMarkers(loc, Infinity, true, { fit: false });

      // List: ALL bars, reordered by distance to the searched location
      renderList(loc, listRadius);
    }catch(e){
      setStatus('Address not found');
    }
  });
}

function wireFindMe(){
  const btn = document.getElementById('findMeBtn');
  if (!btn) return;
  
  btn.addEventListener('click', async ()=>{
    // Keep ALL bars; list will reorder by distance to your location
    const listRadius = Infinity;
    
    // Disable button and show loading state
    btn.disabled = true;
    btn.textContent = 'Finding...';
    setStatus('Getting your location…');
    
    try{
      const loc = await getCurrentLocation();
      setStatus(`Found: ${loc.display}`);
      map.jumpTo({ center: [loc.lon, loc.lat], zoom: 13 });

      // Map: keep ALL markers, draw origin dot, don't auto-fit
      renderMarkers(loc, Infinity, true, { fit: false });

      // List: ALL bars, reordered by distance to you
      renderList(loc, listRadius);
    }catch(e){
      setStatus(e.message);
      console.error('Geolocation error:', e);
    }finally{
      // Re-enable button
      btn.disabled = false;
      btn.textContent = 'Find Me';
    }
  });
}

function wireModal(){
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const aboutClose = document.getElementById('aboutClose');
  if (aboutBtn && aboutModal && aboutClose) {
    const open = () => aboutModal.setAttribute('aria-hidden','false');
    const close = () => aboutModal.setAttribute('aria-hidden','true');
    aboutBtn.addEventListener('click', open);
    aboutClose.addEventListener('click', close);
    aboutModal.addEventListener('click', (e)=> { if (e.target === aboutModal) close(); });
    document.addEventListener('keydown', (e)=> { if (e.key === 'Escape') close(); });
  }
}
// Show/Hide List toggle (mobile)
function wireListToggle(){
  const btn = document.getElementById('toggleListBtn');
  if (!btn) return;

  const update = () => {
    const hidden = document.body.classList.contains('list-hidden');
    btn.textContent = hidden ? 'Show list ↓' : 'Hide list ↑';
    btn.setAttribute('aria-expanded', String(!hidden));
  };

  btn.addEventListener('click', () => {
    document.body.classList.toggle('list-hidden');
    update();

    // Keep tiles crisp after layout change
    if (window.map && typeof map.resize === 'function') map.resize();

    // If we just revealed the list, bring it into view
    if (!document.body.classList.contains('list-hidden')) {
      document.getElementById('list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  update();
}


// Mobile detection and landscape warning
function initMobileDetection() {
  const landscapeWarning = document.getElementById('landscape-warning');
  if (!landscapeWarning) return;

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
           window.innerWidth <= 768;
  }

  function checkOrientation() {
    if (isMobileDevice() && window.innerWidth > window.innerHeight && window.innerWidth <= 900) {
      landscapeWarning.classList.add('mobile-landscape');
    } else {
      landscapeWarning.classList.remove('mobile-landscape');
    }
  }

  // Check on load and orientation change
  checkOrientation();
  window.addEventListener('orientationchange', () => {
    setTimeout(checkOrientation, 100); // Small delay to let orientation settle
  });
  window.addEventListener('resize', checkOrientation);
}

// Boot
initMap();
wireSearch();
wireFindMe();
wireModal();
wireListToggle();        // NEW: replaces wireMapToggle()
initMobileDetection();

// Start map-first on small screens (hide list by default)
if (window.innerWidth <= 900) {
  document.body.classList.add('list-hidden');
}

// Optional: if the screen gets wide (rotate / desktop), auto-show the list
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    document.body.classList.remove('list-hidden');
  }
});

main();