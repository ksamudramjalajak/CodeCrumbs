const state = { user: null, posts: [], boards: [], authMode: 'login', feed: 'for-you', query: '' };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const fallbackBoards = [
  { title: 'Warm minimalism', count: '4.2k pins', image: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=180&q=75' },
  { title: 'Small spaces, big ideas', count: '2.8k pins', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=180&q=75' },
  { title: 'The creative shelf', count: '1.9k pins', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=180&q=75' }
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
}

function initials(name = '?') {
  return name.split(/[-\s_]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Something went wrong.');
  return payload;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

function openModal(id) {
  const modal = $(`#${id}`);
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusTarget = modal.querySelector('input, button');
  requestAnimationFrame(() => focusTarget?.focus());
}

function closeModal(id) {
  const modal = $(`#${id}`);
  if (!modal) return;
  modal.hidden = true;
  if ($$('.modal-backdrop:not([hidden])').length === 0) document.body.style.overflow = '';
}

function renderUser() {
  const user = state.user;
  $('#userAvatar').textContent = user ? initials(user.username) : '?';
  $('#userLabel').textContent = user ? user.username : 'Sign in';
  $('#sideAvatar').textContent = user ? initials(user.username) : '?';
  $('#sideName').textContent = user ? `@${user.username}` : 'Sign in to personalize';
  $('#sideBio').textContent = user ? (user.bio || 'Collecting little sparks of inspiration.') : 'Save ideas into your own little world.';
  $('#sideAction').innerHTML = user ? 'Sign out <span>↗</span>' : 'Sign in <span>→</span>';
}

function renderBoards() {
  const boardList = $('#boardList');
  const boards = state.boards.length ? state.boards.slice(0, 3) : fallbackBoards;
  boardList.innerHTML = boards.map((board) => `<div class="board-row"><img class="board-thumb" src="${escapeHtml(board.coverImage || board.image || fallbackBoards[0].image)}" alt=""><div><strong>${escapeHtml(board.title)}</strong><span>${escapeHtml(board.postsCount ? `${board.postsCount} pins` : board.count || 'A fresh collection')}</span></div></div>`).join('');
}

function renderSkeletons() {
  $('#pinGrid').innerHTML = Array.from({ length: 10 }, () => '<div class="skeleton-card"></div>').join('');
}

function pinMarkup(post) {
  const owner = post.owner || { username: 'creator', avatar: '' };
  const liked = post.isLiked ? 'active' : '';
  const saved = post.isSaved ? 'saved' : '';
  const image = escapeHtml(post.image);
  return `<article class="pin-card" data-pin-id="${escapeHtml(post.id)}">
    <div class="pin-media"><img src="${image}" alt="${escapeHtml(post.title)}" loading="lazy"><div class="pin-overlay"><button class="save-pin ${saved}" data-action="save" type="button">${post.isSaved ? 'Saved' : 'Save'}</button></div></div>
    <div class="pin-bottom"><h3 class="pin-title">${escapeHtml(post.title)}</h3><div class="pin-owner"><span class="pin-owner-avatar">${escapeHtml(initials(owner.username))}</span><span>@${escapeHtml(owner.username)}</span></div><div class="pin-footer"><span>${post.tags?.[0] ? `#${escapeHtml(post.tags[0])}` : 'inspiration'}</span><span class="pin-actions"><button class="pin-action ${liked}" data-action="like" type="button">♡ ${post.likesCount || 0}</button><button class="pin-action ${saved}" data-action="save" type="button">▱ ${post.savesCount || 0}</button></span></div></div>
  </article>`;
}

function renderPosts() {
  const grid = $('#pinGrid');
  const emptyState = $('#emptyState');
  $('#pinCount').textContent = state.posts.length;
  if (!state.posts.length) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  grid.innerHTML = state.posts.map(pinMarkup).join('');
}

async function loadFeed() {
  renderSkeletons();
  try {
    const query = state.query ? `?q=${encodeURIComponent(state.query)}` : '';
    const payload = await api(`/api/posts${query}`);
    state.posts = payload.posts || [];
    $('#feedStatus').textContent = payload.mode === 'mongo' ? 'Live from your MongoDB collection' : 'Demo collection · add MongoDB to persist changes';
    renderPosts();
  } catch (error) {
    $('#pinGrid').innerHTML = '';
    $('#emptyState').hidden = false;
    $('#feedStatus').textContent = 'Unable to reach the feed';
    showToast(error.message);
  }
}

async function loadMe() {
  try {
    const payload = await api('/api/auth/me');
    state.user = payload.user;
  } catch {
    state.user = null;
  }
  renderUser();
  if (state.user) await loadBoards();
}

async function loadBoards() {
  try { state.boards = (await api('/api/boards')).boards || []; } catch { state.boards = []; }
  renderBoards();
}

function setAuthMode(mode) {
  state.authMode = mode;
  $$('.auth-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.authMode === mode));
  $$('.register-only').forEach((field) => { field.hidden = mode !== 'register'; });
  $('#authTitle').textContent = mode === 'register' ? 'Make a place for good ideas.' : 'Keep the good stuff close.';
  $('#authSubmitLabel').textContent = mode === 'register' ? 'Create account' : 'Sign in';
  $('#authPassword').setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
  $('#authError').textContent = '';
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const body = Object.fromEntries(form.entries());
  $('#authError').textContent = '';
  try {
    const payload = await api(state.authMode === 'register' ? '/api/auth/register' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    state.user = payload.user;
    renderUser();
    closeModal('authModal');
    await loadBoards();
    await loadFeed();
    showToast(state.authMode === 'register' ? 'Welcome to the nest ✦' : 'Welcome back.');
    event.currentTarget.reset();
  } catch (error) { $('#authError').textContent = error.message; }
}

async function loginDemo() {
  try {
    const payload = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@pinnest.dev', password: 'demo123' }) });
    state.user = payload.user;
    renderUser();
    closeModal('authModal');
    await loadBoards();
    await loadFeed();
    showToast('You are exploring as demo ✦');
  } catch (error) { $('#authError').textContent = error.message; }
}

async function togglePostAction(postId, action) {
  if (!state.user) { openModal('authModal'); return; }
  try {
    const payload = await api(`/api/posts/${postId}/${action}`, { method: 'POST' });
    const post = state.posts.find((item) => item.id === postId);
    if (!post) return;
    if (action === 'like') { post.isLiked = payload.liked; post.likesCount = payload.likesCount; } else { post.isSaved = payload.saved; post.savesCount = payload.savesCount; }
    renderPosts();
    if (action === 'save') { await loadBoards(); showToast(payload.saved ? 'Saved to your ideas board.' : 'Removed from saved ideas.'); }
  } catch (error) { showToast(error.message); }
}

function openCreate() {
  if (!state.user) { openModal('authModal'); showToast('Sign in to publish a pin.'); return; }
  $('#createError').textContent = '';
  openModal('createModal');
}

async function handleCreateSubmit(event) {
  event.preventDefault();
  if (!state.user) return openModal('authModal');
  const form = new FormData(event.currentTarget);
  $('#createError').textContent = '';
  try {
    await api('/api/posts', { method: 'POST', body: form });
    closeModal('createModal');
    event.currentTarget.reset();
    $('#imagePreview').hidden = true;
    $('#uploadLabel').textContent = 'Drop an image here';
    await loadFeed();
    showToast('Pin published — nice one.');
  } catch (error) { $('#createError').textContent = error.message; }
}

async function handleBoardSubmit(event) {
  event.preventDefault();
  if (!state.user) return openModal('authModal');
  const form = new FormData(event.currentTarget);
  $('#boardError').textContent = '';
  try {
    await api('/api/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form.entries())) });
    closeModal('boardModal');
    event.currentTarget.reset();
    await loadBoards();
    showToast('Board created. Start filling it up.');
  } catch (error) { $('#boardError').textContent = error.message; }
}

async function handleUserMenu() {
  if (!state.user) return openModal('authModal');
  try { await api('/api/auth/logout', { method: 'POST' }); state.user = null; state.boards = []; renderUser(); renderBoards(); await loadFeed(); showToast('Signed out.'); } catch (error) { showToast(error.message); }
}

$('#pinGrid').addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  const card = event.target.closest('[data-pin-id]');
  if (action && card) togglePostAction(card.dataset.pinId, action);
});
$('#searchInput').addEventListener('input', (event) => { state.query = event.target.value.trim(); clearTimeout(state.searchTimer); state.searchTimer = setTimeout(loadFeed, 300); });
$('#openCreate').addEventListener('click', openCreate);
$('#emptyCreate').addEventListener('click', openCreate);
$('#sideAction').addEventListener('click', handleUserMenu);
$('#userMenu').addEventListener('click', handleUserMenu);
$('#createBoardLink').addEventListener('click', () => state.user ? openModal('boardModal') : openModal('authModal'));
$('#authForm').addEventListener('submit', handleAuthSubmit);
$('#demoLogin').addEventListener('click', loginDemo);
$('#createForm').addEventListener('submit', handleCreateSubmit);
$('#boardForm').addEventListener('submit', handleBoardSubmit);

$$('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.close)));
$$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(backdrop.id); }));
$$('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
$$('.feed-tab').forEach((tab) => tab.addEventListener('click', () => { $$('.feed-tab').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); state.feed = tab.dataset.feed; $('#feedStatus').textContent = state.feed === 'latest' ? 'Showing the newest pins first' : 'Curated from your interests'; loadFeed(); }));
$$('.nav-link').forEach((link) => link.addEventListener('click', () => { $$('.nav-link').forEach((item) => item.classList.remove('active')); link.classList.add('active'); if (link.dataset.view === 'explore') { $('#searchInput').focus(); showToast('Search the whole collection for your next rabbit hole.'); } else window.scrollTo({ top: 0, behavior: 'smooth' }); }));
$('#imageInput').addEventListener('change', (event) => { const file = event.target.files?.[0]; if (!file) return; $('#uploadLabel').textContent = file.name; const reader = new FileReader(); reader.addEventListener('load', () => { $('#imagePreview').src = reader.result; $('#imagePreview').hidden = false; }); reader.readAsDataURL(file); });
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') $$('.modal-backdrop:not([hidden])').forEach((modal) => closeModal(modal.id)); });

setAuthMode('login');
renderBoards();
loadMe().then(loadFeed);
