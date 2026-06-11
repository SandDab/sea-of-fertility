/* ==========================================================
   Sea of Fertility — Gallery
   Data-driven: edit /data/gallery.json to add items.
   ========================================================== */

let allItems = [];
let activeFilter = 'all';

// ── Load gallery data ───────────────────────────────────────
fetch('../data/gallery.json')
  .then(r => r.json())
  .then(data => {
    allItems = data.items;
    buildFilterBar(data.categories);
    renderGallery();
  })
  .catch(err => {
    console.error('Could not load gallery.json:', err);
    document.getElementById('gallery-grid').innerHTML =
      '<p style="color:var(--vermillion);">Error loading gallery data.</p>';
  });

// ── Filter bar ──────────────────────────────────────────────
function buildFilterBar(categories) {
  const bar = document.getElementById('gallery-filter-bar');

  const allBtn = makeFilterBtn('all', 'All', allItems.length);
  allBtn.classList.add('active');
  bar.appendChild(allBtn);

  // Book filters
  const bookCounts = {};
  allItems.forEach(item => {
    bookCounts[item.book] = (bookCounts[item.book] || 0) + 1;
  });

  const bookLabels = {
    'spring-snow':       'Spring Snow',
    'runaway-horses':    'Runaway Horses',
    'temple-of-dawn':    'Temple of Dawn',
    'decay-of-the-angel':'Decay of the Angel',
  };

  Object.entries(bookCounts).forEach(([bookKey, count]) => {
    bar.appendChild(makeFilterBtn(bookKey, bookLabels[bookKey] || bookKey, count));
  });

  // Category filters
  const catCounts = {};
  allItems.forEach(item => {
    catCounts[item.category] = (catCounts[item.category] || 0) + 1;
  });

  Object.entries(catCounts).forEach(([catKey, count]) => {
    const label = categories[catKey]?.label || catKey;
    bar.appendChild(makeFilterBtn(catKey, label, count));
  });
}

function makeFilterBtn(key, label, count) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn';
  btn.dataset.filter = key;
  btn.innerHTML = `${label} <span class="filter-count">${count}</span>`;
  btn.style.cssText = 'flex-direction:row;align-items:center;';
  btn.addEventListener('click', () => setFilter(key, btn));
  return btn;
}

function setFilter(key, btn) {
  activeFilter = key;
  document.querySelectorAll('#gallery-filter-bar .filter-btn').forEach(b => {
    b.classList.toggle('active', b === btn);
    b.classList.toggle('inactive', b !== btn);
  });
  renderGallery();
}

// ── Render grid ─────────────────────────────────────────────
function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  const filtered = allItems.filter(item => {
    if (activeFilter === 'all') return true;
    return item.book === activeFilter || item.category === activeFilter;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--ash);font-size:0.9rem;">No items in this category yet.</p>';
    return;
  }

  filtered.forEach(item => {
    const isPending = !item.url;
    const el = document.createElement('div');
    el.className = `gallery-item${isPending ? ' pending' : ''}`;

    const bookClasses = {
      'spring-snow':        'spring-snow',
      'runaway-horses':     'runaway-horses',
      'temple-of-dawn':     'temple-of-dawn',
      'decay-of-the-angel': 'decay-of-angel',
    };
    const bookLabel = {
      'spring-snow':        'Spring Snow',
      'runaway-horses':     'Runaway Horses',
      'temple-of-dawn':     'Temple of Dawn',
      'decay-of-the-angel': 'Decay of the Angel',
    };
    const cls = bookClasses[item.book] || '';

    // Prefer image_url (direct binary) over url (page link); literature items may have neither
    const imgSrc = item.image_url || (item.category !== 'literature' ? item.url : '');
    const imgSection = imgSrc
      ? `<img class="gallery-img" src="${imgSrc}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'gallery-img-placeholder\\'><span>${item.title}</span></div>'">`
      : `<div class="gallery-img-placeholder"><span>${item.title}</span></div>`;

    el.innerHTML = `
      ${imgSection}
      <div class="gallery-caption">
        <div style="margin-bottom:0.4rem;">
          <span class="book-tag ${cls}">${bookLabel[item.book] || item.book}</span>
          <span style="font-size:0.68rem;color:var(--ash);letter-spacing:0.1em;text-transform:uppercase;margin-left:0.4rem;">${item.category}</span>
        </div>
        <div class="title">${item.title}</div>
        <div class="meta">${item.date}${item.credit ? ' · ' + item.credit : ''}</div>
        <div class="desc">${item.description}</div>
        ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" style="font-size:0.75rem;color:var(--gold);border-bottom:none;margin-top:0.5rem;display:inline-block;letter-spacing:0.06em;">View source ↗</a>` : ''}
      </div>
    `;

    if (imgSrc) {
      el.querySelector('.gallery-img')?.addEventListener('click', () => openLightbox(item));
    }

    grid.appendChild(el);
  });
}

// ── Lightbox ────────────────────────────────────────────────
function openLightbox(item) {
  const imgSrc = item.image_url || item.url;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <img class="lightbox-img" src="${imgSrc}" alt="${item.title}">
      <div class="lightbox-caption">
        <div class="title">${item.title}</div>
        <div class="meta">${item.date}${item.credit ? ' · ' + item.credit : ''}</div>
        <div class="desc">${item.description}</div>
      </div>
    </div>
  `;

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('lightbox-close')) close();
  });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(overlay);
}
