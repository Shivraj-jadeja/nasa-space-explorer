// ===== NASA Space Explorer =====

// Class-provided APOD-like JSON feed (same fields as APOD; no key)
const CDN_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

let DATA = [];
let BY_DATE = new Map();

// ---- DOM ----
const startDateEl = document.getElementById('startDate');
const fetchBtn    = document.getElementById('fetchBtn');
const loadingEl   = document.getElementById('loading');
const galleryEl   = document.getElementById('gallery');
const factBox     = document.getElementById('factBox');

// Modal
const modal        = document.getElementById('apodModal');
const modalClose   = document.getElementById('modalClose');
const modalMedia   = document.getElementById('modalMedia');
const modalTitle   = document.getElementById('modalTitle');
const modalDate    = document.getElementById('modalDate');
const modalExplain = document.getElementById('modalExplain');

// ---- LevelUp: Random Space Fact ----
const FACTS = [
  "Neutron stars can spin 600+ times per second.",
  "Venus rotates backward—its day is longer than its year.",
  "Jupiter’s Great Red Spot is a storm larger than Earth.",
  "A day on Mercury has two sunrises.",
  "There are more trees on Earth than stars in the Milky Way (best estimates say ~3T vs. 100–400B)."
];
function showRandomFact(){
  const i = Math.floor(Math.random() * FACTS.length);
  factBox.textContent = `Did you know? ${FACTS[i]}`;
}

// ---- UTC-safe date helpers ----
function parts(iso){ const [y,m,d] = iso.split('-').map(Number); return {y,m,d}; }
function addDaysUTC(iso, n){
  const { y, m, d } = parts(iso);
  const t = new Date(Date.UTC(y, m-1, d));
  t.setUTCDate(t.getUTCDate() + n);
  const yyyy = t.getUTCFullYear();
  const mm   = String(t.getUTCMonth()+1).padStart(2,'0');
  const dd   = String(t.getUTCDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function cmp(a,b){ return a.localeCompare(b); } // dates are YYYY-MM-DD strings

// ---- Core: collect 9 items with graceful extension ----
// Start with [startISO .. startISO+8]. If fewer than 9 items found, keep
// extending the end date +1 day until we have 9 (cap extension to avoid loops).
function collectNine(startISO){
  const MAX_EXTENSION_DAYS = 45; // safety cap
  let endISO = addDaysUTC(startISO, 8);

  // Pre-sort all dates once (ascending)
  const dates = [...BY_DATE.keys()].sort(cmp);

  // Utility: return items within [a..b] inclusive
  const itemsInRange = (a, b) => {
    const out = [];
    for (const d of dates){
      if (cmp(d, a) >= 0 && cmp(d, b) <= 0){
        out.push(BY_DATE.get(d));
      }
    }
    return out;
  };

  // Try extending forward until we have 9
  for (let ext = 0; ext <= MAX_EXTENSION_DAYS; ext++){
    const endTry = addDaysUTC(endISO, ext);
    const picked = itemsInRange(startISO, endTry);
    if (picked.length >= 9) return picked.slice(0,9);
  }
  return null; // not enough items even after extension
}

// Fallback: latest 9 items in the whole dataset
function latestNine(){
  const sorted = [...BY_DATE.keys()].sort(cmp); // ascending
  return sorted.slice(-9).map(d => BY_DATE.get(d));
}

// Choose a sensible default start (latest - 8)
function getDefaultStart(){
  const sorted = [...BY_DATE.keys()].sort(cmp);
  const latest = sorted[sorted.length - 1];
  return addDaysUTC(latest, -8);
}

// ---- Cards / Modal ----
function buildCard(item){
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;

  const wrap = document.createElement('div');
  wrap.className = 'thumb-wrap';

  if (item.media_type === 'video'){
    const img = document.createElement('img');
    img.alt = item.title || 'APOD Video';
    img.className = 'thumb-video';
    img.src = item.thumbnail_url || 'https://i.ytimg.com/vi_webp/1/1.webp';
    wrap.appendChild(img);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Video';
    wrap.appendChild(badge);
  } else {
    const img = document.createElement('img');
    img.alt = item.title || 'APOD Image';
    img.src = item.url || item.hdurl;
    wrap.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';

  const h = document.createElement('h3');
  h.className = 'title';
  h.textContent = item.title || 'Untitled';

  const d = document.createElement('p');
  d.className = 'date';
  d.textContent = item.date;

  meta.append(h, d);
  card.append(wrap, meta);

  card.addEventListener('click', () => openModal(item));
  card.addEventListener('keyup', (e) => { if (e.key === 'Enter') openModal(item); });

  return card;
}

function openModal(item){
  modalMedia.innerHTML = '';

  if (item.media_type === 'video' && item.url){
    const iframe = document.createElement('iframe');
    iframe.src = item.url.includes('embed') ? item.url : item.url.replace('watch?v=', 'embed/');
    iframe.allowFullscreen = true;
    modalMedia.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    img.alt = item.title || 'APOD';
    img.src = item.hdurl || item.url;
    modalMedia.appendChild(img);
  }

  modalTitle.textContent   = item.title || 'Untitled';
  modalDate.textContent    = item.date  || '';
  modalExplain.textContent = item.explanation || '';
  modal.showModal();
}

modalClose.addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => {
  const rect = modal.querySelector('.modal-content').getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                 e.clientY >= rect.top  && e.clientY <= rect.bottom;
  if (!inside) modal.close();
});

// ---- Render / Init ----
function renderList(list){
  galleryEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  list.forEach(item => frag.appendChild(buildCard(item)));
  galleryEl.appendChild(frag);
}

function renderFrom(startISO){
  // Try the requested window with forward extension
  let nine = collectNine(startISO);
  if (nine){
    renderList(nine);
    return;
  }
  // Fallback to latest 9 so the UI never goes blank
  const fallback = latestNine();
  renderList(fallback);
  // Set the input to the fallback's first date (so the user sees the window)
  if (fallback.length) startDateEl.value = fallback[0].date;
}

async function init(){
  showRandomFact();
  loadingEl.hidden = false;
  try{
    const res = await fetch(CDN_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Network error fetching APOD feed');
    DATA = await res.json();
    BY_DATE = new Map(DATA.map(x => [x.date, x]));

    const def = getDefaultStart();
    startDateEl.value = def;
    renderFrom(def);
  }catch(err){
    console.error(err);
    galleryEl.innerHTML = `<p>Failed to load data. Please try again.</p>`;
  }finally{
    loadingEl.hidden = true;
  }
}

fetchBtn.addEventListener('click', () => {
  const fromISO = startDateEl.value || getDefaultStart();
  renderFrom(fromISO);
});

init();
