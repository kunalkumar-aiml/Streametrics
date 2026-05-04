// ─── Config ───
const API = window.location.protocol === 'file:'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

// ─── Arrow scroll for sliders ───
function scrollSlider(sliderId, direction) {
  const el = document.getElementById(sliderId);
  if (!el) return;
  const scrollAmount = el.clientWidth * 0.75;
  el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// ─── Auth (Login Page) ───
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        loginMessage.textContent = data.message || 'Login failed';
        return;
      }

      localStorage.setItem('ottUser', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch {
      loginMessage.textContent = 'Server unavailable. Start the backend first.';
    }
  });
}

// ─── Dashboard ───
const els = {
  navbar:       document.getElementById('navbar'),
  welcome:      document.getElementById('welcomeText'),
  logout:       document.getElementById('logoutBtn'),
  searchWrap:   document.getElementById('searchWrap'),
  searchBtn:    document.getElementById('searchBtn'),
  searchField:  document.getElementById('searchField'),
  hero:         document.getElementById('heroBanner'),
  heroTitle:    document.getElementById('heroTitle'),
  heroMatch:    document.getElementById('heroMatch'),
  heroYear:     document.getElementById('heroYear'),
  heroRating:   document.getElementById('heroRating'),
  heroDuration: document.getElementById('heroDuration'),
  heroDesc:     document.getElementById('heroDesc'),
  heroPlayBtn:  document.getElementById('heroPlayBtn'),
  heroFavBtn:   document.getElementById('heroFavBtn'),
  trendSlider:  document.getElementById('trendingSlider'),
  favRow:       document.getElementById('favoritesRow'),
  favSlider:    document.getElementById('favoritesSlider'),
  movieSlider:  document.getElementById('movieSlider'),
  allTitle:     document.getElementById('allMoviesTitle'),
  watchHistory: document.getElementById('watchHistory'),
  notifList:    document.getElementById('notificationList'),
  playerModal:  document.getElementById('playerModal'),
  playerTitle:  document.getElementById('playerTitle'),
};

let allMovies = [];
let userFavorites = new Set(); // track favorited movie_ids
let currentUser = null;
let heroMovie = null;
let searchTimer = null;

// ─── Bootstrap ───
async function boot() {
  const raw = localStorage.getItem('ottUser');
  if (!raw && window.location.pathname.includes('dashboard')) {
    window.location.href = 'login.html';
    return;
  }
  if (!raw) return;

  currentUser = JSON.parse(raw);
  if (els.welcome) els.welcome.textContent = currentUser.full_name;

  setupNav();
  setupSearch();

  await Promise.all([
    loadMovies(),
    loadFavorites(),
    loadHistory(),
    loadNotifications(),
  ]);
}

// ─── Navbar scroll ───
function setupNav() {
  if (!els.navbar) return;

  if (els.logout) {
    els.logout.addEventListener('click', () => {
      localStorage.removeItem('ottUser');
      window.location.href = 'login.html';
    });
  }

  window.addEventListener('scroll', () => {
    els.navbar.classList.toggle('solid', window.scrollY > 40);
  });
}

// ─── Search (live DB query) ───
function setupSearch() {
  if (!els.searchBtn || !els.searchField) return;

  els.searchBtn.addEventListener('click', () => {
    els.searchWrap.classList.toggle('open');
    if (els.searchWrap.classList.contains('open')) {
      els.searchField.focus();
    } else {
      els.searchField.value = '';
      renderSlider(els.movieSlider, allMovies);
      if (els.allTitle) els.allTitle.textContent = 'All Movies';
      document.getElementById('trendingRow').style.display = '';
    }
  });

  els.searchField.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = els.searchField.value.trim();

    if (!q) {
      renderSlider(els.movieSlider, allMovies);
      if (els.allTitle) els.allTitle.textContent = 'All Movies';
      document.getElementById('trendingRow').style.display = '';
      return;
    }

    // Debounce 300ms then query the database
    searchTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        if (data.success) {
          document.getElementById('trendingRow').style.display = 'none';
          if (els.allTitle) els.allTitle.textContent = `Results for "${q}"`;
          renderSlider(els.movieSlider, data.results);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);
  });
}

// ─── Movies ───
async function loadMovies() {
  try {
    const res = await fetch(`${API}/movies`);
    const data = await res.json();
    if (!data.success) return;

    allMovies = data.movies || [];

    // Hero = highest rated
    if (allMovies.length) {
      heroMovie = [...allMovies].sort((a, b) => b.rating - a.rating)[0];
      setHero(heroMovie);
    }

    // Trending = top watched
    const trending = [...allMovies].sort((a, b) => b.watch_count - a.watch_count).slice(0, 12);
    renderSlider(els.trendSlider, trending);

    // All
    renderSlider(els.movieSlider, allMovies);
  } catch (err) {
    console.error('Failed to load movies', err);
  }
}

function setHero(movie) {
  if (!movie || !els.hero) return;
  els.hero.style.backgroundImage = `url('${movie.poster_url}')`;
  els.heroTitle.textContent = movie.title;
  els.heroMatch.textContent = movie.rating >= 8.5 ? '98% Match' : '85% Match';
  els.heroYear.textContent = movie.release_year;
  els.heroRating.textContent = `⭐ ${movie.rating}`;
  els.heroDuration.textContent = `${movie.duration}m`;
  if (movie.description) els.heroDesc.textContent = movie.description;

  // Play button → writes to DB
  if (els.heroPlayBtn) {
    els.heroPlayBtn.onclick = () => playMovie(movie.movie_id, movie.title);
  }

  // Fav button
  if (els.heroFavBtn) {
    updateFavButton(els.heroFavBtn, movie.movie_id);
    els.heroFavBtn.onclick = () => toggleFav(movie.movie_id, els.heroFavBtn);
  }
}

// ─── Render a slider row ───
function renderSlider(container, movies) {
  if (!container) return;
  container.innerHTML = movies.length
    ? movies.map(m => cardHTML(m)).join('')
    : '<p class="empty-state">No movies found.</p>';
}

function cardHTML(m) {
  const isFav = userFavorites.has(m.movie_id);
  const matchText = m.rating >= 8.5 ? '98%' : '85%';
  return `
    <div class="card" data-id="${m.movie_id}">
      <img class="card-poster" src="${m.poster_url}" alt="${m.title}"
           onerror="this.src='https://via.placeholder.com/320x180/1a1a1a/666?text=No+Image'" />
      <div class="card-overlay">
        <div class="card-overlay-title">${m.title}</div>
        <div class="card-overlay-meta">
          <span class="match">${matchText}</span>
          <span>${m.release_year}</span>
          <span>${m.duration}m</span>
        </div>
        <div class="card-overlay-actions">
          <button class="card-btn play-btn" onclick="playMovie(${m.movie_id}, '${m.title.replace(/'/g, "\\'")}')">▶</button>
          <button class="card-btn ${isFav ? 'fav-active' : ''}" id="fav-${m.movie_id}" onclick="toggleFav(${m.movie_id}, this)">
            ${isFav ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>`;
}

// ─── Play Movie (writes to watch_history + recommendations in DB) ───
async function playMovie(movieId, title) {
  if (!els.playerModal) return;

  els.playerTitle.textContent = `Now Playing: ${title}`;
  els.playerModal.classList.remove('hidden');

  try {
    await fetch(`${API}/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.user_id, movie_id: movieId }),
    });
  } catch (err) {
    console.error('Watch error:', err);
  }

  setTimeout(async () => {
    els.playerModal.classList.add('hidden');
    // Refresh history & notifications live
    await loadHistory();
    await loadNotifications();
    // Refresh movies to update watch_count
    await loadMovies();
    await loadFavorites();
  }, 1500);
}

// ─── Favorites (writes to favorites table in DB) ───
async function loadFavorites() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API}/favorites?user_id=${currentUser.user_id}`);
    const data = await res.json();
    if (!data.success) return;

    userFavorites = new Set(data.favorites.map(f => f.movie_id));

    // Show/hide favorites row
    if (data.favorites.length && els.favRow && els.favSlider) {
      els.favRow.style.display = '';
      renderSlider(els.favSlider, data.favorites);
    } else if (els.favRow) {
      els.favRow.style.display = 'none';
    }

    // Re-render all cards to update fav icons
    renderSlider(els.movieSlider, allMovies);
    const trending = [...allMovies].sort((a, b) => b.watch_count - a.watch_count).slice(0, 12);
    renderSlider(els.trendSlider, trending);

    // Update hero fav button
    if (heroMovie && els.heroFavBtn) updateFavButton(els.heroFavBtn, heroMovie.movie_id);
  } catch (err) {
    console.error('Favorites error:', err);
  }
}

async function toggleFav(movieId, btn) {
  const isFav = userFavorites.has(movieId);
  const endpoint = isFav ? `${API}/favorites/remove` : `${API}/favorites`;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.user_id, movie_id: movieId }),
    });

    // Instantly update UI
    if (isFav) {
      userFavorites.delete(movieId);
    } else {
      userFavorites.add(movieId);
    }

    updateFavButton(btn, movieId);

    // Reload favorites row & notifications from DB
    await loadFavorites();
    await loadNotifications();
  } catch (err) {
    console.error('Toggle fav error:', err);
  }
}

function updateFavButton(btn, movieId) {
  if (!btn) return;
  const isFav = userFavorites.has(movieId);
  btn.textContent = isFav ? '✓' : '+';
  btn.classList.toggle('fav-active', isFav);
  btn.classList.toggle('active', isFav);
}

// ─── Watch History (reads from DB) ───
async function loadHistory() {
  if (!els.watchHistory || !currentUser) return;
  try {
    const res = await fetch(`${API}/watch-history?user_id=${currentUser.user_id}`);
    const data = await res.json();
    const items = data.history || [];

    els.watchHistory.innerHTML = items.length
      ? items.map(h => `
        <div class="panel-item">
          <strong>${h.title}</strong>
          <div class="meta">Watched ${new Date(h.watch_timestamp).toLocaleString()}</div>
        </div>`).join('')
      : '<p class="empty-state">No watch history yet. Click ▶ on any movie!</p>';
  } catch {}
}

// ─── Notifications (reads from DB — populated by triggers) ───
async function loadNotifications() {
  if (!els.notifList || !currentUser) return;
  try {
    const res = await fetch(`${API}/notifications?user_id=${currentUser.user_id}`);
    const data = await res.json();
    const items = data.notifications || [];

    els.notifList.innerHTML = items.length
      ? items.map(n => `
        <div class="panel-item">
          <span class="notif-type">${n.type.replace('_', ' ')}</span>
          <div style="color:#ccc; font-size:13px; margin-top:2px;">${n.message}</div>
          <div class="meta">${new Date(n.created_at).toLocaleString()}</div>
        </div>`).join('')
      : '<p class="empty-state">No notifications yet.</p>';
  } catch {}
}

// ─── Go ───
boot();
