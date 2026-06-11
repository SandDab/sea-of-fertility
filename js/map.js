/* ==========================================================
   Sea of Fertility — Map
   Data-driven: edit /data/pois.json to add or change POIs.
   ========================================================== */

const MAP_CONFIG = {
  center: [35.5, 136.5],
  zoom: 6,
  minZoom: 5,
  maxZoom: 16,
};

// Tile layer: Stamen Watercolor (via Stadia Maps) — painterly, hand-drawn
// look reminiscent of Edo-period road maps. Stadia allows unauthenticated
// requests from localhost, which is how this site is served.
const TILE_URL = 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=458ee38f-d159-4454-8a99-1d4840c52447';
const TILE_ATTR = '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

// ── Initialise map ──────────────────────────────────────────
const map = L.map('map', {
  center: MAP_CONFIG.center,
  zoom: MAP_CONFIG.zoom,
  minZoom: MAP_CONFIG.minZoom,
  maxZoom: MAP_CONFIG.maxZoom,
  zoomControl: false,
});

L.tileLayer(TILE_URL, {
  attribution: TILE_ATTR,
  maxZoom: 16,
}).addTo(map);

// Move zoom control to bottom-right
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ── Major city labels (Japan, c. 1900) ─────────────────────
const CITY_LABELS = [
  { name: '東京', romaji: 'Tokyo',     lat: 35.6762, lng: 139.6503 },
  { name: '横浜', romaji: 'Yokohama',  lat: 35.4437, lng: 139.6380 },
  { name: '京都', romaji: 'Kyoto',     lat: 35.0116, lng: 135.7681 },
  { name: '大阪', romaji: 'Osaka',     lat: 34.6937, lng: 135.5023 },
  { name: '神戸', romaji: 'Kobe',      lat: 34.6901, lng: 135.1956 },
  { name: '名古屋', romaji: 'Nagoya',  lat: 35.1815, lng: 136.9066 },
  { name: '奈良', romaji: 'Nara',      lat: 34.6851, lng: 135.8048 },
  { name: '仙台', romaji: 'Sendai',    lat: 38.2682, lng: 140.8694 },
  { name: '広島', romaji: 'Hiroshima', lat: 34.3853, lng: 132.4553 },
  { name: '金沢', romaji: 'Kanazawa',  lat: 36.5613, lng: 136.6562 },
  { name: '長崎', romaji: 'Nagasaki',  lat: 32.7503, lng: 129.8779 },
  { name: '函館', romaji: 'Hakodate',  lat: 41.7687, lng: 140.7288 },
  { name: '札幌', romaji: 'Sapporo',   lat: 43.0618, lng: 141.3545 },
];

const cityLabelLayer = L.layerGroup().addTo(map);

CITY_LABELS.forEach(city => {
  const icon = L.divIcon({
    className: 'city-label',
    html: `<span class="city-label-ja ja">${city.name}</span><span class="city-label-en">${city.romaji}</span>`,
    iconSize: null,
  });
  L.marker([city.lat, city.lng], {
    icon,
    interactive: false,
    keyboard: false,
  }).addTo(cityLabelLayer);
});

// ── State ───────────────────────────────────────────────────
let allPOIs = [];
let markerLayer = L.layerGroup().addTo(map);
let activeBooks = new Set();

// ── Load POI data ───────────────────────────────────────────
fetch('../data/pois.json')
  .then(r => r.json())
  .then(data => {
    allPOIs = data.pois;
    const books = data.books;

    // All books active by default (only show those with POIs)
    const booksWithPOIs = [...new Set(allPOIs.map(p => p.book))];
    booksWithPOIs.forEach(b => activeBooks.add(b));

    buildFilters(books, booksWithPOIs);
    renderMarkers();
  })
  .catch(err => {
    console.error('Could not load pois.json:', err);
    document.getElementById('filter-container').innerHTML =
      '<p style="color:#a82510;font-size:0.8rem;">Error loading POI data.</p>';
  });

// ── Load character path data ────────────────────────────────
fetch('../data/characters.json')
  .then(r => r.json())
  .then(data => buildCharacterPanel(data.characters))
  .catch(err => {
    console.error('Could not load characters.json:', err);
    document.getElementById('character-container').innerHTML =
      '<p style="color:#a82510;font-size:0.8rem;">Error loading character data.</p>';
  });

// ── Build sidebar filter buttons ────────────────────────────
function buildFilters(books, booksWithPOIs) {
  const container = document.getElementById('filter-container');
  container.innerHTML = '';

  booksWithPOIs.forEach(bookKey => {
    const book = books[bookKey];
    if (!book) return;

    const count = allPOIs.filter(p => p.book === bookKey).length;

    const btn = document.createElement('button');
    btn.className = 'filter-btn active';
    btn.dataset.book = bookKey;
    btn.innerHTML = `
      <span class="filter-dot" style="background:${book.color}"></span>
      <span class="filter-label">
        <strong>${book.label}</strong>
        <span style="display:block;font-size:0.72rem;color:var(--ash);">${book.year}</span>
      </span>
      <span class="filter-count">${count}</span>
    `;
    btn.addEventListener('click', () => toggleFilter(bookKey, btn, book.color));
    container.appendChild(btn);
  });
}

// ── Toggle a book filter ────────────────────────────────────
function toggleFilter(bookKey, btn, color) {
  if (activeBooks.has(bookKey)) {
    activeBooks.delete(bookKey);
    btn.classList.remove('active');
    btn.classList.add('inactive');
  } else {
    activeBooks.add(bookKey);
    btn.classList.add('active');
    btn.classList.remove('inactive');
  }
  renderMarkers();
}

// ── Render markers for active books ─────────────────────────
function renderMarkers() {
  markerLayer.clearLayers();

  allPOIs
    .filter(poi => activeBooks.has(poi.book))
    .forEach(poi => {
      // Fetch book color from the loaded data (stored on button)
      const dot = document.querySelector(`.filter-btn[data-book="${poi.book}"] .filter-dot`);
      const color = dot ? dot.style.background : '#666';

      const marker = L.circleMarker([poi.lat, poi.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.82,
      });

      marker.bindPopup(buildPopup(poi), {
        maxWidth: 320,
        className: 'sof-popup',
      });

      marker.on('mouseover', function() { this.openPopup(); });

      markerLayer.addLayer(marker);
    });
}

// ── Build popup HTML ─────────────────────────────────────────
function buildPopup(poi) {
  const bookClasses = {
    'spring-snow':      'spring-snow',
    'runaway-horses':   'runaway-horses',
    'temple-of-dawn':   'temple-of-dawn',
    'decay-of-the-angel': 'decay-of-angel',
  };

  const cls = bookClasses[poi.book] || '';
  const bookLabel = getBookLabel(poi.book);
  const nameJa = poi.name_ja ? `<div class="popup-name-ja ja">${poi.name_ja}</div>` : '';

  return `
    <div class="popup-header">
      <span class="book-tag ${cls}">${bookLabel}</span>
      <div class="popup-name">${poi.name}</div>
      ${nameJa}
    </div>
    <div class="popup-desc">${poi.description}</div>
  `;
}

// ── Character path panel ────────────────────────────────────
let activeCharacter = null;
let pathLayer = L.layerGroup().addTo(map);
let pathAnimFrame = null;

function buildCharacterPanel(characters) {
  const container = document.getElementById('character-container');
  container.innerHTML = '';

  characters.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.character = ch.id;
    btn.innerHTML = `
      <span class="filter-dot" style="background:${ch.color}"></span>
      <span class="filter-label">
        <strong>${ch.name}</strong>
        <span class="ja" style="display:block;font-size:0.72rem;color:var(--ash);">${ch.name_ja}</span>
      </span>
    `;
    btn.addEventListener('click', () => toggleCharacter(ch, btn));
    container.appendChild(btn);
  });
}

function toggleCharacter(character, btn) {
  const wasActive = activeCharacter && activeCharacter.id === character.id;

  // Reset all buttons
  document.querySelectorAll('#character-container .filter-btn').forEach(b => {
    b.classList.remove('active');
    b.querySelector('.filter-dot').style.opacity = '';
  });

  clearCharacterPath();

  if (wasActive) {
    activeCharacter = null;
    return;
  }

  activeCharacter = character;
  btn.classList.add('active');
  btn.querySelector('.filter-dot').style.opacity = '1';

  playCharacterPath(character);
}

function clearCharacterPath() {
  if (pathAnimFrame) {
    cancelAnimationFrame(pathAnimFrame);
    pathAnimFrame = null;
  }
  pathLayer.clearLayers();
}

function playCharacterPath(character) {
  const points = character.path
    .map(id => allPOIs.find(p => p.id === id))
    .filter(Boolean)
    .map(p => [p.lat, p.lng]);

  if (points.length < 2) return;

  // Faint full path, drawn immediately
  L.polyline(points, {
    color: character.color,
    weight: 2,
    opacity: 0.35,
    dashArray: '6 8',
  }).addTo(pathLayer);

  // Waypoint dots
  points.forEach((pt, i) => {
    L.circleMarker(pt, {
      radius: 5,
      color: '#fff',
      weight: 1.5,
      fillColor: character.color,
      fillOpacity: 0.9,
    }).addTo(pathLayer);
  });

  // Animated traveling marker + drawn trail
  const travelMarker = L.circleMarker(points[0], {
    radius: 7,
    color: '#fff',
    weight: 2,
    fillColor: character.color,
    fillOpacity: 1,
  }).addTo(pathLayer);

  const trail = L.polyline([points[0]], {
    color: character.color,
    weight: 3,
    opacity: 0.9,
  }).addTo(pathLayer);

  // Pace calibrated so Tokyo <-> Kyoto (~360km) takes 6 seconds.
  const SPEED_M_PER_MS = (360000 / 6000);
  const MIN_LEG_MS = 600; // floor so very close points still register as a step

  const numLegs = points.length - 1;
  const legDurations = [];
  for (let i = 0; i < numLegs; i++) {
    const d = map.distance(points[i], points[i + 1]);
    legDurations.push(Math.max(MIN_LEG_MS, d / SPEED_M_PER_MS));
  }
  const totalDuration = legDurations.reduce((a, b) => a + b, 0);
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);

    let i = 0;
    let elapsedInLeg = elapsed;
    while (i < numLegs - 1 && elapsedInLeg > legDurations[i]) {
      elapsedInLeg -= legDurations[i];
      i++;
    }
    const segProgress = Math.min(elapsedInLeg / legDurations[i], 1);

    const a = points[i], b = points[i + 1];
    const pos = [
      a[0] + (b[0] - a[0]) * segProgress,
      a[1] + (b[1] - a[1]) * segProgress,
    ];
    trail.setLatLngs([...points.slice(0, i + 1), pos]);
    travelMarker.setLatLng(pos);

    if (progress < 1) {
      pathAnimFrame = requestAnimationFrame(frame);
    } else {
      pathAnimFrame = null;
    }
  }

  pathAnimFrame = requestAnimationFrame(frame);
}

function getBookLabel(bookKey) {
  const labels = {
    'spring-snow':        'Spring Snow',
    'runaway-horses':     'Runaway Horses',
    'temple-of-dawn':     'Temple of Dawn',
    'decay-of-the-angel': 'Decay of the Angel',
  };
  return labels[bookKey] || bookKey;
}
