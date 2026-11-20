/* ===== Обязательная регистрация / вход и запуск приложения ===== */
let AUTH_MODE = 'login', authBusy = false;
const authEl = () => $('#auth');

function setAuthMode(m) {
  AUTH_MODE = m;
  document.querySelectorAll('[data-auth=login],[data-auth=reg]').forEach(b => b.classList.toggle('on', b.dataset.auth === m));
  $('#ap2').style.display = m === 'reg' ? '' : 'none';
  $('#ap').autocomplete = m === 'reg' ? 'new-password' : 'current-password';
  $('#abtn').textContent = m === 'reg' ? 'Создать аккаунт' : 'Войти';
  $('#aerr').textContent = '';
}
function showAuth(msg) {
  S = null; TOP = null; HIST = null; stageHTML = ''; stageGlow = ''; busy = false;
  $('#view').innerHTML = '';
  $('#ap').value = ''; $('#ap2').value = '';
  setAuthMode(AUTH_MODE);
  $('#aerr').textContent = msg || '';
  authEl().classList.add('on');
}
function enterGame(j) {
  CONF = j.conf; TAB = 'summon'; COL = 0;
  setState(j.state); setAvatar(j.state.name);
  authEl().classList.remove('on');
  render();
}
async function doLogout() {
  await Game.logout();
  AUTH_MODE = 'login'; $('#au').value = '';
  showAuth();
}
window.onAuthLost = () => showAuth('Сессия истекла. Войдите снова.');

async function submitAuth() {
  if (authBusy) return;
  const u = $('#au').value.trim(), p = $('#ap').value, err = $('#aerr');
  err.textContent = '';
  if (!u || !p) return err.textContent = 'Введите логин и пароль';
  if (AUTH_MODE === 'reg' && p !== $('#ap2').value) return err.textContent = 'Пароли не совпадают';
  authBusy = true; $('#abtn').classList.add('off');
  try {
    const r = AUTH_MODE === 'reg' ? await Game.register(u, p) : await Game.login(u, p);
    if (r.error) { err.textContent = r.error; return; }
    const j = await Game.api('init');
    if (j.error) { err.textContent = j.error; return; }
    enterGame(j);
  } finally { authBusy = false; $('#abtn').classList.remove('off'); }
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-auth]'); if (!t) return;
  const a = t.dataset.auth;
  if (a === 'login' || a === 'reg') setAuthMode(a);
  else if (a === 'go') submitAuth();
});
authEl().addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });

(async function boot() {
  if (window.Capacitor) document.body.classList.add('native');
  if ('serviceWorker' in navigator && !window.Capacitor && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost')
    navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!Cloud.on()) {
    authEl().classList.remove('on');
    $('#view').innerHTML = '<div class="center">База данных не подключена.<br>Впишите адрес и ключ Supabase в <b>www/config.js</b> (см. README) и пересоберите приложение.</div>';
    return;
  }
  if (!Cloud.token()) return showAuth();
  const j = await Game.api('init');
  if (j.auth) return;                       // onAuthLost уже показал вход
  if (j.error) {
    $('#view').innerHTML = `<div class="center">${esc(j.error)}<br><br><button class="btn sm" onclick="location.reload()">Повторить</button></div>`;
    return;
  }
  enterGame(j);
})();
