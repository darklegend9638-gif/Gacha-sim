/* ===== Новые экраны для телефона: Бонусы и Профиль + запуск ===== */
let HIST = null, resetArm = false, RANK = { b: 'score', rows: null, rank: null, err: null, me: null };

const fmtT = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return (h ? h + ' ч ' : '') + (h || m ? m + ' мин' : '') + (h ? '' : (m ? ' ' : '') + ss + ' с'); };
const timerBtn = (act, left, ready, reward) =>
  `<button class="btn ${left > 0 ? 'off' : ''}" data-act="${act}" data-until="${Date.now() + left * 1000}" data-ready="${ready}">
     <span class="lbl">${left > 0 ? '⏳ ' + fmtT(left) : ready}</span><span>+${reward} 👛</span></button>`;

function vBonus() {
  return `<h2>Бонусы</h2>
  <div class="up main"><div class="h"><b>🎁 Ежедневный бонус</b><span>серия ${S.streak}/7</span></div>
    <p>Заходите регулярно: награда растёт с каждым днём серии. Пропустите больше двух суток — серия сбросится.</p>
    <div class="lv"><i style="width:${S.streak / 7 * 100}%"></i></div>
    ${timerBtn('daily', S.daily_left, 'Забрать бонус', fmt(S.daily_reward))}</div>
  <div class="up"><div class="h"><b>🛠 Подработка</b><span>каждые 15 мин</span></div>
    <p>Быстрый заработок монет. Награда случайная.</p>
    ${timerBtn('work', S.work_left, 'Поработать', S.work_min + '–' + S.work_max)}</div>
  <div class="up"><div class="h"><b>🎟 Бесплатная крутка</b><span>каждые 8 ч</span></div>
    <p>Находится на вкладке «Призыв». Дубликаты существ тоже возвращают немного монет.</p></div>`;
}

const RTITLE = ['Новичок', 'Искатель', 'Следопыт', 'Призыватель', 'Мастер', 'Легенда', 'Избранный', 'Божество', 'Космос'];
function vMe() {
  const bestN = S.best >= 0 ? rname(S.best) : '—';
  const hist = HIST === null ? '<p class="muted">Загрузка…</p>' : !HIST.length ? '<p class="muted">Пока пусто. Сделайте первую крутку.</p>'
    : HIST.map(h => { const q = CONF.rar[h.r], it = CONF.pool[q.k][h.c];
      return `<div class="hrow" style="--c:${RC[h.r]}"><span class="hi">${it.i}</span><span class="hn">${esc(it.n)}<small>${q.name}${h.n ? ' · NEW' : ''}${h.f ? ' · бесплатно' : ''}</small></span>
        <span class="ht">${new Date(h.t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>`; }).join('');
  return `<h2>Профиль</h2>
  <div class="up main"><div class="h"><b>${esc(S.name)}</b><span>${RTITLE[Math.max(0, S.best)]}</span></div>
    <div class="stats">
      <div><b>${fmt(S.score)}</b><small>очки</small></div><div><b>${S.uniq}/${CONF.total}</b><small>коллекция</small></div>
      <div><b>${fmt(S.pulls)}</b><small>круток</small></div><div><b>${bestN}</b><small>лучшая редкость</small></div>
      <div><b>${fmt(S.spent)}</b><small>потрачено 👛</small></div><div><b>${S.luck}/30</b><small>удача</small></div></div>
    <div class="inrow"><input class="inp" id="nm" maxlength="16" value="${esc(S.name)}" placeholder="Ваше имя"><button class="btn sm" data-act="rename">Сохранить</button></div></div>
  <h2 style="font-size:20px">Последние крутки</h2><div id="hist">${hist}</div>
  <h2 style="font-size:20px;margin-top:18px">Аккаунт</h2>
  <div class="up"><p>Вы вошли как <b>@${esc(S.username)}</b>. Прогресс хранится в облачной базе: войдите с тем же логином и паролем на любом телефоне, и всё будет на месте.</p>
    <button class="btn sm" data-act="logout" style="width:100%;justify-content:center">Выйти из аккаунта</button></div>
  <button class="btn sm danger" data-act="reset" style="margin:6px 0 10px">${resetArm ? 'Нажмите ещё раз — всё удалится' : 'Сбросить прогресс'}</button>`;
}

const BOARDS = [['score', 'Очки'], ['uniq', 'Коллекция'], ['rate', 'Доход']];
function vRank() {
    const chips = BOARDS.map(([k, n]) => `<button class="rchip ${RANK.b === k ? 'on' : ''}" style="--c:#8a63ff" data-act="board" data-b="${k}">${n}</button>`).join('');
  const val = r => RANK.b === 'score' ? [fmt(r.score), r.uniq + '/' + CONF.total + ' существ'] : RANK.b === 'uniq' ? [r.uniq + '/' + CONF.total, fmt(r.score) + ' очков'] : [fmt(r.rate) + '/с', fmt(r.score) + ' очков'];
  let body;
  if (RANK.err) body = `<p class="muted" style="text-align:center">${esc(RANK.err)}</p>`;
  else if (!RANK.rows) body = '<p class="muted" style="text-align:center">Загрузка…</p>';
  else body = (RANK.rows.map((r, i) => { const v = val(r);
      return `<div class="lb ${r.id === RANK.me ? 'me' : ''}"><div class="n">${i + 1}</div><div class="nm">${esc(r.name)}</div><div class="sc">${v[0]}<small>${v[1]}</small></div></div>`; }).join('')
      || '<p class="muted">Пока никого. Станьте первым.</p>')
    + (RANK.rank ? `<p class="muted" style="text-align:center">Ваше место: #${RANK.rank}</p>` : '');
  return `<h2>Топ игроков</h2><div class="rchips">${chips}<button class="rchip" data-act="board" data-b="${RANK.b}">🔄</button></div>${body}`;
}
async function loadRank() {
  RANK.rows = null; RANK.err = null; render();
  const j = await Game.api('top', { board: RANK.b });
  if (j.error) { if (!j.auth) RANK.err = j.error; }
  else { RANK.rows = j.rows; RANK.rank = j.rank; RANK.me = j.me; }
  if (TAB === 'rank') render();
}

function render() {
  const v = $('#view'); if (!S) return;
  const keep = v.scrollTop, ae = document.activeElement && document.activeElement.id;
  v.innerHTML = TAB === 'summon' ? vSummon() : TAB === 'col' ? vCol() : TAB === 'up' ? vUp() : TAB === 'bonus' ? vBonus() : TAB === 'rank' ? vRank() : vMe();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.v === TAB));
  if (TAB !== 'summon') v.scrollTop = keep;
}

// курсор дохода: подпись «+N/с»; монеты между сверками с базой считаем на экране
const _setState = setState;
setState = function (st) { _setState(st); st._t0 = Date.now(); st._c0 = st.coins; const r = $('#rate'); if (r) r.textContent = '+' + fmt(st.rate) + '/с'; };
setInterval(() => {
  if (!S || busy || S._c0 === undefined) return;
  S.coins = S._c0 + Math.floor((Date.now() - S._t0) / 1000) * S.rate; $('#coins').textContent = fmt(S.coins);
  document.querySelectorAll('[data-act=pull]').forEach(b => b.classList.toggle('off', S.coins < (+b.dataset.n === 10 ? S.price10 : S.price1)));
  document.querySelectorAll('[data-act=upg]').forEach(b => { const u = S.upg.find(x => x.key === b.dataset.k); if (u && u.cost !== null) b.classList.toggle('off', S.coins < u.cost); });
}, 1000);
setInterval(async () => {
  if (!S || busy || !Cloud.token()) return;
  const j = await Game.api('state'); if (busy || !j.state) return; setState(j.state);
}, 30000);

// тикающие таймеры на кнопках бонусов
setInterval(() => {
  document.querySelectorAll('[data-until]').forEach(b => {
    const s = Math.max(0, Math.ceil((+b.dataset.until - Date.now()) / 1000));
    b.querySelector('.lbl').textContent = s > 0 ? '⏳ ' + fmtT(s) : b.dataset.ready;
    b.classList.toggle('off', s > 0);
  });
}, 1000);

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t || !S) return;
  const a = t.dataset.act;
  try {
    if (a === 'tab' && t.dataset.v === 'me') { resetArm = false; HIST = null; render(); HIST = (await api('history')).hist; if (TAB === 'me') render(); }
    else if (a === 'tab' && t.dataset.v === 'rank') { await loadRank(); }
    else if (a === 'board') { RANK.b = t.dataset.b; await loadRank(); }
    else if (a === 'daily' || a === 'work') {
      if (t.classList.contains('off')) return toast('Ещё не готово');
      const j = await api(a); notif('success'); toast('+' + fmt(j.gain) + ' 👛'); render();
    }
    else if (a === 'rename') { await api('rename', { name: $('#nm').value }); setAvatar(S.name); toast('Имя сохранено'); render(); }
    else if (a === 'logout') { await doLogout(); }
    else if (a === 'reset') {
      if (!resetArm) { resetArm = true; t.textContent = 'Нажмите ещё раз — всё удалится'; setTimeout(() => { resetArm = false; if (t.isConnected) t.textContent = 'Сбросить прогресс'; }, 4000); return; }
      resetArm = false; await api('reset'); HIST = []; RANK.rows = null; setAvatar(S.name); toast('Прогресс сброшен'); render();
    }
  } catch (er) { toast(er.message); render(); }
});
