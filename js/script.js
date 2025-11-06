// ===== NASA Space Explorer =====
// Project feed: mirror of APOD-like objects (date/title/explanation/media_type/url/...)
// See brief/README for why we use the provided JSON instead of live API.  :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}

const CDN_URL = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json'; // provided JSON feed

// Elements
const startDateEl = document.getElementById('startDate');
const fetchBtn = document.getElementById('fetchBtn');
const loadingEl = document.getElementById('loading');
const galleryEl = document.getElementById('gallery');
const factBox = document.getElementById('factBox');

// Modal elements
const modal = document.getElementById('apodModal');
const modalClose = document.getElementById('modalClose');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
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

// ---- Utilities ----
const fmt = (d) => new Date(d).toISOString().slice(0,10); // yyyy-mm-dd

function addDays(iso, n){
  const dt = new Date(iso);
  dt.setDate(dt.getDate() + n);
  return fmt(dt);
}

// From an array of APOD-like entries, return exactly 9 consecutive days (start->start+8)
// If a date isn’t in the dataset (rare), we skip it gracefully.
function pickNineConsecutive(data, startISO){
  const need = new Set(Array.from({length:9}, (_,i)=> addDays(startISO, i)));
  const byDate = new Map(data.map(item => [item.date, item]));
  const out = [];
  for(const d of Array.from(need).sort()){ if(byDate.has(d)) out.push(byDate.get(d)); }
  return out;
}

// Build one card (handles image or video thumbnail)
function buildCard(item){
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0; // a11y focus

  const wrap = document.createElement('div');
  wrap.className = 'thumb-wrap';

  if(item.media_type === 'video'){
    // Show thumbnail if available; else a simple placeholder
    const img = document.createElement('img');
    img.alt = item.title || 'APOD Video';
    img.className = 'thumb-video';
    img.src = item.thumbnail_url || 'https://i.ytimg.com/vi_webp/1/1.webp'; // safe fallback
    wrap.appendChild(img);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Video';
    wrap.appendChild(badge);
  }else{
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

  // Open modal on click/enter
  card.addEventListener('click', () => openModal(item));
  card.addEventListener('keyup', (e) => { if(e.key === 'Enter') openModal(item); });

  return card;
}

// Modal open/close
function openModal(item){
  // Clear old media
  modalMedia.innerHTML = '';

  if(item.media_type === 'video' && item.url){
    // Embed YouTube (or use link if not embeddable)
    const iframe = document.createElement('iframe');
    iframe.src = item.url.includes('embed') ? item.url : item.url.replace('watch?v=', 'embed/');
    iframe.allowFullscreen = true;
    modalMedia.appendChild(iframe);
  }else{
    const img = document.createElement('img');
    img.alt = item.title || 'APOD';
    img.src = item.hdurl || item.url;
    modalMedia.appendChild(img);
  }

  modalTitle.textContent = item.title || 'Untitled';
  modalDate.textContent = item.date || '';
  modalExplain.textContent = item.explanation || '';
  modal.showModal();
}
modalClose.addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => {
  // click outside the content closes dialog
  const rect = modal.querySelector('.modal-content').getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if(!inside) modal.close();
});

// ---- Fetch + Render flow ----
async function fetchData(){
  // Show loading
  loadingEl.hidden = false;
  galleryEl.innerHTML = '';

  try{
    const res = await fetch(CDN_URL, {cache:'no-store'});
    if(!res.ok) throw new Error('Network error fetching APOD feed');
    const all = await res.json(); // array of items

    // Determine start date
    let startISO = startDateEl.value || fmt(new Date()); // default today if empty
    // Pick 9 consecutive days present in dataset
    const picked = pickNineConsecutive(all, startISO);

    if(picked.length === 0){
      galleryEl.innerHTML = `<p>No entries found for ${startISO} range.</p>`;
      return;
    }

    // Render cards
    const frag = document.createDocumentFragment();
    picked.forEach(item => frag.appendChild(buildCard(item)));
    galleryEl.appendChild(frag);

  }catch(err){
    console.error(err);
    galleryEl.innerHTML = `<p>Failed to load data. Please try again.</p>`;
  }finally{
    // Hide loading after render/attempt
    loadingEl.hidden = true;
  }
}

// Init
showRandomFact();
fetchBtn.addEventListener('click', fetchData);
