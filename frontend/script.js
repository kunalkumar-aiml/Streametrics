const API_BASE = window.location.protocol === 'file:'
  ? 'http://localhost:5050/api'
  : `${window.location.origin}/api`;

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        loginMessage.textContent = data.message || 'Login failed';
        return;
      }

      localStorage.setItem('ottUser', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } catch (error) {
      loginMessage.textContent = 'Server unavailable. Please start backend first.';
    }
  });
}

const movieGrid = document.getElementById('movieGrid');
const trendingMovies = document.getElementById('trendingMovies');
const watchHistory = document.getElementById('watchHistory');
const notificationList = document.getElementById('notificationList');
const playerOverlay = document.getElementById('playerOverlay');
const playingTitle = document.getElementById('playingTitle');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ottUser');
    window.location.href = 'login.html';
  });
}

async function loadDashboard() {
  const rawUser = localStorage.getItem('ottUser');
  if (!rawUser && window.location.pathname.includes('dashboard.html')) {
    window.location.href = 'login.html';
    return;
  }

  if (!rawUser) return;

  const user = JSON.parse(rawUser);
  if (welcomeText) {
    welcomeText.textContent = `Welcome, ${user.full_name} (${user.username})`;
  }

  await Promise.all([
    loadMovies(user.user_id),
    loadWatchHistory(user.user_id),
    loadNotifications(user.user_id),
  ]);
}

async function loadMovies(userId) {
  const response = await fetch(`${API_BASE}/movies`);
  const data = await response.json();

  if (!data.success) return;

  const movies = data.movies || [];
  const topTrending = [...movies].sort((a, b) => b.watch_count - a.watch_count).slice(0, 5);

  if (trendingMovies) {
    trendingMovies.innerHTML = topTrending.map((movie) => renderMovieCard(movie, true)).join('');
  }

  if (movieGrid) {
    movieGrid.innerHTML = movies.map((movie) => renderMovieCard(movie, false)).join('');
  }

  document.querySelectorAll('[data-movie-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const movieId = Number(card.dataset.movieId);
      const title = card.dataset.movieTitle;
      simulatePlayback(userId, movieId, title);
    });
  });
}

function renderMovieCard(movie, trending) {
  return `
    <article class="movie-card" data-movie-id="${movie.movie_id}" data-movie-title="${movie.title.replace(/"/g, '&quot;')}">
      <img src="${movie.poster_url}" alt="${movie.title}" />
      <div class="movie-content">
        <h3>${movie.title}</h3>
        <div class="meta">${movie.release_year} • ${movie.duration} min • ⭐ ${movie.rating}</div>
        <div class="meta">${movie.genre || 'Unknown'}</div>
        ${trending ? '<span class="badge">Trending</span>' : ''}
      </div>
    </article>
  `;
}

async function simulatePlayback(userId, movieId, title) {
  if (playingTitle && playerOverlay) {
    playingTitle.textContent = `Now Playing: ${title}`;
    playerOverlay.classList.remove('hidden');
  }

  await fetch(`${API_BASE}/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, movie_id: movieId }),
  });

  setTimeout(() => {
    if (playerOverlay) {
      playerOverlay.classList.add('hidden');
    }
    loadWatchHistory(userId);
    loadNotifications(userId);
  }, 1200);
}

async function loadWatchHistory(userId) {
  if (!watchHistory) return;
  const response = await fetch(`${API_BASE}/watch-history?user_id=${userId}`);
  const data = await response.json();

  const items = data.history || [];
  watchHistory.innerHTML = items.length
    ? items
        .map(
          (item) => `
      <div class="list-item">
        <strong>${item.title}</strong>
        <div class="meta">Watched: ${new Date(item.watch_timestamp).toLocaleString()}</div>
      </div>
    `
        )
        .join('')
    : '<div class="list-item">No watch history yet.</div>';
}

async function loadNotifications(userId) {
  if (!notificationList) return;
  const response = await fetch(`${API_BASE}/notifications?user_id=${userId}`);
  const data = await response.json();

  const items = data.notifications || [];
  notificationList.innerHTML = items.length
    ? items
        .map(
          (item) => `
      <div class="list-item">
        <strong>${item.type.replace('_', ' ').toUpperCase()}</strong>
        <div>${item.message}</div>
        <div class="meta">${new Date(item.created_at).toLocaleString()}</div>
      </div>
    `
        )
        .join('')
    : '<div class="list-item">No notifications yet.</div>';
}

loadDashboard();
