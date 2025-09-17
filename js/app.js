// Simple static app: loads a CSV of bars, geocodes user input, shows nearest.
// Swap CSV_URL to your published Google Sheets CSV when ready.
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTO6KT8rcNjx8vbKs2iXOYRFnttCOC6EN7QNGivJBRaRdyAfg8l4kYbsE8vt3onqxBqKrnSvh-EczhU/pub?gid=11952344&single=true&output=csv';
const SUBMIT_FORM_URL = 'https://forms.gle/maBc5Z1MUun3WQ4R8';
const MAX_RESULTS = 25;

const map = L.map('map').setView([37.8715, -122.2730], 11); // Berkeley default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

document.getElementById('submitLink').href = SUBMIT_FORM_URL;
document.getElementById('dataSourceLink').href = CSV_URL;

let bars = [];
let markers = L.layerGroup().addTo(map);

// ---------- Custom Cal Icons ----------

// Berkeley Blue marker with Cal Gold dot
const CalIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#002676"/>
          <stop offset="100%" stop-color="#001b58"/>
        </linearGradient>
      </defs>
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.25 12.22 24.78 13.1 25.9a1.2 1.2 0 0 0 1.8 0C15.78 38.78 28 23.25 28 14 28 6.27 21.73 0 14 0z" fill="url(#g)"/>
      <circle cx="14" cy="14" r="6" fill="#FDB515"/>
    </svg>
  `),
  iconSize: [28, 42],
  iconAnchor: [14, 40],
  popupAnchor: [0, -34],
});

// Gold circle for "You" (search location)
const YouIcon = L.divIcon({
  className: '',
  html: '<div style="background:#FDB515;border:2px solid #002676;width:16px;height:16px;border-radius:50%;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ---------- Utils ----------
function haversine(lat1, lon1, lat2, lon2){
  const toRad = d=> d*Math.PI/180;
  const R = 3958.8; // miles
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

function renderList(origin, radiusMiles){
  const withDist = bars.map(b=>{
    const lat = parseFloat(b.lat), lon = parseFloat(b.lon);
    const d = (isFinite(lat) && isFinite(lon)) ? haversine(origin.lat, origin.lon, lat, lon) : Infinity;
    return { ...b, distance: d };
  }).filter(b => b.distance <= radiusMiles).sort((a,b)=> a.distance - b.distance).slice(0, MAX_RESULTS);

  const ol = document.getElementById('results');
  ol.innerHTML = '';
  withDist.forEach(b=>{
    const li = document.createElement('li');
    const miles = Number.isFinite(b.distance) ? b.distance.toFixed(1) + ' mi' : 'n/a';
    const url = b.url && b.url.startsWith('http') ? b.url : null;
    li.innerHTML = `
      <strong>${b.name || 'Unnamed Bar'}</strong> — ${miles}<br>
      <span>${[b.address, b.city, b.state, b.zip].filter(Boolean).join(', ')}</span><br>
      ${url ? `<a href="${url}" target="_blank" rel="noopener">Website</a>` : ''}
      ${b.notes ? `<div><em>${b.notes}</em></div>` : ''}
      ${b.affiliation ? `<div><small>${b.affiliation}</small></div>` : ''}
    `;
    ol.appendChild(li);
  });
}

function renderMarkers(origin, radiusMiles, showOrigin = true){
  markers.clearLayers();

  // Only show the search/origin marker when requested
  if (showOrigin) {
    L.marker([origin.lat, origin.lon], { icon: YouIcon })
      .addTo(markers)
      .bindPopup('You');
  }

  bars.forEach(b=>{
    const lat = parseFloat(b.lat), lon = parseFloat(b.lon);
    if(!isFinite(lat) || !isFinite(lon)) return;
    const d = haversine(origin.lat, origin.lon, lat, lon);
    if(d <= radiusMiles){
      const popup = `<strong>${b.name || 'Unnamed Bar'}</strong><br>${[b.address, b.city, b.state, b.zip].filter(Boolean).join(', ')}${b.url ? `<br><a href="${b.url}" target="_blank" rel="noopener">Website</a>`:''}${b.notes?`<br><em>${b.notes}</em>`:''}`;
      L.marker([lat, lon], { icon: CalIcon }).addTo(markers).bindPopup(popup);
    }
  });
}

async function main(){
  document.getElementById('status').textContent = 'Loading bars…';
  try {
    bars = await loadCSV();
    document.getElementById('status').textContent = `Loaded ${bars.length} bars`;

    // Plot all bars on load (but no "You")
    const origin = { lat: 37.8715, lon: -122.2730 };
    const radius = 500;
    renderMarkers(origin, radius, false);
    renderList(origin, radius);

  } catch(e) {
    console.error(e);
    document.getElementById('status').textContent = 'Failed to load data';
  }
}


document.getElementById('searchBtn').addEventListener('click', async ()=>{
  const q = document.getElementById('address').value.trim();
  const radius = parseFloat(document.getElementById('radius').value) || 50;
  if(!q) return;
  document.getElementById('status').textContent = 'Geocoding…';
  try{
    const loc = await geocode(q);
    document.getElementById('status').textContent = `Center: ${loc.display}`;
    map.setView([loc.lat, loc.lon], 11);
    renderMarkers(loc, radius);
    renderList(loc, radius);
  }catch(e){
    document.getElementById('status').textContent = 'Address not found';
  }
});

main();
