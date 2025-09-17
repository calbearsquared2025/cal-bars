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

// ---------- Helpers ----------
function normKeys(row){
  const out = {};
  Object.keys(row).forEach(k => out[k.trim().toLowerCase()] = row[k]);
  return out;
}
function pick(row, names){
  for (const n of names) {
    const v = row[n];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}
function toNumLoose(row, keys){
  const v = pick(row, keys);
  const n = parseFloat(String(v).replace(/[^\d.+-]/g,''));
  return Number.isFinite(n) ? n : null;
}

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
    const lat = toNumLoose(b, ['lat','latitude']);
    const lon = toNumLoose(b, ['lon','lng','longitude']);
    const d = (lat!=null && lon!=null) ? haversine(origin.lat, origin.lon, lat, lon) : Infinity;
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
bars = await loadCSV();
console.log("First few rows:", bars.slice(0,3));
function renderMarkers(origin, radiusMiles){
  markers.clearLayers();
  const originMarker = L.circleMarker([origin.lat, origin.lon], { radius: 8 }).bindPopup('You');
  originMarker.addTo(markers);
  bars.forEach(b=>{
    const lat = toNumLoose(b, ['lat','latitude']);
    const lon = toNumLoose(b, ['lon','lng','longitude']);
    if(lat==null || lon==null) return;
    const d = haversine(origin.lat, origin.lon, lat, lon);
    if(d <= radiusMiles){
      const popup = `<strong>${b.name || 'Unnamed Bar'}</strong><br>${[b.address, b.city, b.state, b.zip].filter(Boolean).join(', ')}${b.url ? `<br><a href="${b.url}" target="_blank" rel="noopener">Website</a>`:''}${b.notes?`<br><em>${b.notes}</em>`:''}`;
      L.marker([lat, lon]).addTo(markers).bindPopup(popup);
    }
  });
}

async function main(){
  document.getElementById('status').textContent = 'Loading bars…';
  try{
    let rows = await loadCSV();
    rows = rows.map(r=>normKeys(r));
    bars = rows;
    document.getElementById('status').textContent = `Loaded ${bars.length} bars`;
    console.log('Sample row:', bars[0]);
  }catch(e){
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
