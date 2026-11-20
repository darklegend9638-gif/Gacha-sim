/* ===== Интерфейс (из gacha_1.html, Telegram-часть заменена на локальную игру) ===== */

const tg = null;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RC = ['#aab2c8','#5fd47a','#4aa3ff','#b565ff','#ffc447','#ff4d5e','#2ee6c8','#ffeaa6','#9d7bff'];
const $ = s => document.querySelector(s);
const fmt = n => Number(n).toLocaleString('ru-RU');
const pct = p => p >= 1 ? String(+p.toFixed(2)) : p >= 0.01 ? String(+p.toFixed(3)) : p.toFixed(8).replace(/0+$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} };
const hap = t => vib(t === 'heavy' ? 30 : t === 'medium' ? 18 : 8);
const notif = t => vib([20, 40, 30]);

let CONF = null, S = null, TAB = 'summon', COL = 0, busy = false, freeAt = 0, TOP = null, stageHTML = '', stageGlow = '';
let skipFlag = false;

async function api(action, extra = {}) {
  const j = await Game.api(action, extra);
  if (j.state) setState(j.state);
  if (j.error) { const e = new Error(j.error); e.data = j; throw e; }
  return j;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.k); toast.k = setTimeout(() => t.classList.remove('on'), 2600); }
function setState(s) { S = s; freeAt = Date.now() + s.free_left * 1000; $('#coins').textContent = fmt(s.coins); }
const rname = i => CONF.rar[i].name;

/* ---------- кольцо шансов: ширина сегмента ~ √шанса ---------- */
function arcs(ch) {
  const w = ch.map(Math.sqrt), sum = w.reduce((a, b) => a + b, 0), min = sum * 0.018;
  const w2 = w.map(x => Math.max(x, min)), s2 = w2.reduce((a, b) => a + b, 0);
  let a = 0; return w2.map(x => { const d = x / s2 * 360, r = [a, a + d]; a += d; return r; });
}
function ringBg(ch) {
  const g = 0.9, parts = arcs(ch).map(([a, b], i) => `#120e26 ${a}deg ${a + g}deg, ${RC[i]} ${a + g}deg ${b}deg`);
  return `conic-gradient(from 0deg, ${parts.join(',')})`;
}

/* ---------- экраны ---------- */
const idleHTML = () => `<div class="idle"><div class="halo"></div><div class="orbit o1"><i></i></div><div class="orbit o2"><i></i></div>
  <div class="cap"><div class="capin"><div class="col"></div><div class="gloss"></div><div class="knob"></div></div></div>
  <span class="sp" style="left:16%;top:20%">✦</span><span class="sp" style="left:80%;top:26%;animation-delay:.7s">✦</span>
  <span class="sp" style="left:24%;top:74%;animation-delay:1.3s">✦</span><span class="sp" style="left:74%;top:70%;animation-delay:1.9s">✦</span>
  <span class="sp" style="left:50%;top:8%;animation-delay:.3s;font-size:11px">✦</span></div>`;
function vSummon() {
  const pity = Math.min(100, S.pity / S.pity_max * 100), left = S.pity_max - S.pity;
  const can1 = S.coins >= S.price1, can10 = S.coins >= S.price10;
  return `
  <div class="stage ${stageHTML ? 'static' : ''}" id="stage" data-act="stage" style="${stageGlow ? '--glow:' + stageGlow : ''}">${stageHTML || idleHTML()}</div>
  <div class="pity"><div class="bar"><i style="width:${pity}%"></i></div>
    <span>Гарантированный ${rname(4)}+ через ${left} ${plural(left, 'крутку', 'крутки', 'круток')}</span>
    <span>${rname(5)}+ через ${fmt(S.pity_m_max - S.pity_m)} · ${rname(6)}+ через ${fmt(S.pity_s_max - S.pity_s)}</span></div>
  <button class="btn free ${S.free_left > 0 ? 'wait' : ''}" data-act="free" id="freeBtn">${freeLabel()}</button>
  <div class="row2">
    <button class="btn ${can1 ? '' : 'off'}" data-act="pull" data-n="1">Крутить ×1<small>${fmt(S.price1)} 👛</small></button>
    <button class="btn main ${can10 ? '' : 'off'}" data-act="pull" data-n="10">Крутить ×10<small>${fmt(S.price10)} 👛</small></button>
  </div>`;
}
function freeLabel() {
  const s = Math.max(0, Math.ceil((freeAt - Date.now()) / 1000));
  if (s <= 0) return '🎁 Бесплатная крутка';
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return `⏳ Бесплатная через ${h ? h + ' ч ' : ''}${m} мин${h ? '' : ' ' + ss + ' с'}`;
}
function plural(n, a, b, c) { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; }

function vCol() {
  const k = CONF.rar[COL].k, list = CONF.pool[k];
  const have = list.filter((_, i) => S.own[k + ':' + i]).length;
  const chips = CONF.rar.map((r, i) => {
    const h = CONF.pool[r.k].filter((_, j) => S.own[r.k + ':' + j]).length;
    return `<button class="rchip ${i === COL ? 'on' : ''}" style="--c:${RC[i]}" data-act="col" data-i="${i}">${r.emoji}<b>${h}/${CONF.pool[r.k].length}</b></button>`;
  }).join('');
  const tiles = list.map((c, i) => {
    const n = S.own[k + ':' + i];
    return n ? `<div class="tile r${COL === 8 ? 8 : ''}" style="--c:${RC[COL]}"><span class="cnt">×${n}</span><div class="ic">${c.i}</div><div class="nm">${c.n}</div></div>`
             : `<div class="tile lock"><div class="ic">${c.i}</div><div class="nm">???</div></div>`;
  }).join('');
  return `<h2>Коллекция <span class="muted" style="font-size:14px">${S.uniq}/${CONF.total}</span></h2>
  <div class="rchips">${chips}</div>
  <div class="prog" style="--c:${RC[COL]}"><span class="t">${rname(COL)} · ${have}/${list.length}</span></div>
  <div class="grid">${tiles}</div>`;
}

function vUp() {
  const ch = S.chances, nx = S.chances_next, mx = Math.max(...ch.map(Math.sqrt));
  const odds = ch.map((p, i) => {
    const d = nx ? nx[i] - p : 0;
    return `<div class="od" style="--c:${RC[i]}"><span>${rname(i)}</span><div class="b"><i style="width:${Math.max(2, Math.sqrt(p) / mx * 100)}%"></i></div>
      <span class="p">${pct(p)}%${d > 0.0005 ? `<em>+${pct(d)}</em>` : ''}</span></div>`;
  }).join('');
  const cards = S.upg.map(u => {
    const ok = u.cost !== null && S.coins >= u.cost, main = u.key === 'luck';
    const btn = u.cost === null ? `<button class="btn off" disabled>Максимум</button>`
      : `<button class="btn ${ok ? '' : 'off'}" data-act="upg" data-k="${u.key}"><span>Улучшить</span><span>${fmt(u.cost)} 👛</span></button>`;
    return `<div class="up ${main ? 'main' : ''}"><div class="h"><b>${u.name}</b><span>${u.lvl}/${u.max}</span></div><p>${u.desc}</p>
      <div class="lv"><i style="width:${u.lvl / u.max * 100}%"></i></div>${main ? `<div class="odds">${odds}</div>` : ''}${btn}</div>`;
  });
  return `<h2>Прокачка</h2><p class="muted" style="margin:-4px 0 12px;font-size:13px">Удача повышает шансы редких существ и покупается за монеты. Зелёные цифры — прирост шанса на следующем уровне.</p>${cards.join('')}`;
}

function vTop() {
  if (!TOP) return `<div class="center">Загрузка…</div>`;
  const rows = TOP.top.map((t, i) => `<div class="lb ${t.me ? 'me' : ''}"><div class="n">${i + 1}</div><div class="nm">${esc(t.name)}</div>
    <div class="sc">${fmt(t.score)}<small>${t.uniq}/${CONF.total} существ</small></div></div>`).join('');
  return `<h2>Коллекционеры</h2>${rows || '<p class="muted">Пока никого. Станьте первым.</p>'}
    ${TOP.rank ? `<p class="muted" style="text-align:center">Ваше место: #${TOP.rank}</p>` : ''}`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render() {
  const v = $('#view');
  if (!S) return;
  v.innerHTML = TAB === 'summon' ? vSummon() : TAB === 'col' ? vCol() : TAB === 'up' ? vUp() : vTop();
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.v === TAB));
}
setInterval(() => { const b = $('#freeBtn'); if (b && !busy) { b.textContent = freeLabel(); b.classList.toggle('wait', freeAt > Date.now()); } }, 1000);

/* ---------- призыв ---------- */
async function pull(n, free) {
  if (busy) return;
  if (free && freeAt > Date.now()) return toast('Бесплатная крутка ещё не готова');
  if (!free && S.coins < (n === 10 ? S.price10 : S.price1)) return toast('Не хватает монет. Монет не хватает: ждите дохода или заберите бонус');
  busy = true;
  let res;
  try { res = await api('pull', free ? { free: true } : { n }); }
  catch (e) { busy = false; toast(e.message); render(); return; }
  stageHTML = ''; stageGlow = '';
  if (TAB !== 'summon') { TAB = 'summon'; render(); }
  await spin(res.res);
  busy = false; render();
}

async function spin(list) {
  const win = list.reduce((a, b) => b.r > a.r ? b : a), st = $('#stage');
  skipFlag = false; st.classList.remove('static');
  const W = 84, G = 8, STEP = W + G, N = 40, WIN = 31;
  const wts = S.chances.map(p => Math.pow(p, .55)), tot = wts.reduce((x, y) => x + y, 0);
  const pickR = () => { let x = Math.random() * tot; for (let i = 0; i < wts.length; i++) { x -= wts[i]; if (x <= 0) return i; } return 0; };
  const rndC = r => Math.floor(Math.random() * CONF.pool[CONF.rar[r].k].length);
  const cards = [];
  for (let i = 0; i < N; i++) {
    let r, c;
    if (i === WIN) { r = win.r; c = win.c; }
    else if (i === WIN + 1 && win.r < 8 && Math.random() < .55) { r = Math.min(8, win.r + 1 + Math.floor(Math.random() * 3)); c = rndC(r); }
    else { r = pickR(); c = rndC(r); }
    cards.push({ r, c });
  }
  const cardHtml = x => { const q = CONF.rar[x.r];
    return `<div class="rcard r${x.r}" style="--c:${RC[x.r]}"><div class="ic">${CONF.pool[q.k][x.c].i}</div><b>${q.name}</b></div>`; };
  st.innerHTML = `<div class="reel" id="reel"><div class="strip" id="strip">${cards.map(cardHtml).join('')}</div><div class="mark" id="mark"></div></div><div class="ssub" id="ssub"></div>`;
  st.style.setProperty('--glow', '#7b5cff33');
  const reel = $('#reel'), strip = $('#strip'), mark = $('#mark'), RW = reel.clientWidth;
  const off = (Math.random() - .5) * W * .7;
  const startX = RW / 2 - W / 2, centerX = RW / 2 - (WIN * STEP + W / 2), dist = centerX - off - startX;
  const T = RM ? 500 : 4200, ease = t => 1 - Math.pow(1 - t, 5);
  reel.classList.add("go");
  await new Promise(res => {
    const t0 = performance.now(); let lastIdx = -1, lastTick = 0;
    const frame = now => {
      const p = skipFlag ? 1 : Math.min(1, (now - t0) / T), x = startX + dist * ease(p) + (p < .08 ? 30 * Math.sin(p / .08 * Math.PI) : 0);
      strip.style.transform = `translate3d(${x}px,0,0)`;
      const idx = Math.floor((RW / 2 - x) / STEP), cd = cards[idx];
      for (let k = idx - 2; k <= idx + 2; k++) { const e = strip.children[k]; if (!e) continue; const d = Math.abs(k * STEP + W / 2 - (RW / 2 - x)) / STEP; const sc = 1 + .16 * Math.max(0, 1 - d); e.style.transform = `scale(${sc})`; e.style.zIndex = sc > 1.08 ? 2 : 0; e.style.filter = `brightness(${.75 + .45 * Math.max(0, 1 - d)})`; }
      if (idx !== lastIdx && cd) {
        lastIdx = idx; st.style.setProperty('--glow', RC[cd.r] + '44');
        if (now - lastTick > 55 && p < 1) { hap('light'); lastTick = now; }
        mark.classList.remove('tick'); void mark.offsetWidth; mark.classList.add('tick');
      }
      p < 1 ? requestAnimationFrame(frame) : res();
    };
    requestAnimationFrame(frame);
  });

  // ---- приземление ----
  const r = win.r, q = CONF.rar[r], c = RC[r], it = CONF.pool[q.k][win.c];
  reel.classList.remove('go'); [...strip.children].forEach(e => { e.style.transform = ''; e.style.filter = ''; e.style.zIndex = ''; });
  strip.style.transition = 'transform .3s ease-out'; strip.style.transform = `translate3d(${centerX}px,0,0)`;
  [...strip.children].forEach((e, i) => e.classList.add(i === WIN ? 'win' : 'dim'));
  mark.style.cssText = 'opacity:0;transition:opacity .3s';
  stageGlow = c + '88'; st.style.setProperty('--glow', stageGlow);
  const ss = $('#ssub'); ss.style.setProperty('--c', c);
  const cnt = S.own[q.k + ':' + win.c];
  ss.innerHTML = `${it.n}<small>${q.name} · ${win.new ? 'NEW' : 'повтор ×' + cnt}</small>`;
  requestAnimationFrame(() => ss.classList.add('on'));
  if (r >= 4) notif('success'); else hap('heavy');
  if (!RM) {
    const fl = document.createElement('div'); fl.className = 'flash'; fl.style.setProperty('--c', c); st.appendChild(fl);
    if (r >= 4) { st.classList.add('shake'); setTimeout(() => st.classList.remove('shake'), 460); }
    const br = st.getBoundingClientRect(), rr = reel.getBoundingClientRect();
    const px = rr.left - br.left + rr.width / 2, py = rr.top - br.top + rr.height / 2;
    const k = r >= 6 ? 60 : r >= 4 ? 38 : r >= 2 ? 20 : 8;
    for (let i = 0; i < k; i++) {
      const pt = document.createElement('div'), a = Math.random() * 6.283, d = 70 + Math.random() * 150;
      pt.className = 'pt';
      pt.style.cssText = `left:${px}px;top:${py}px;--c:${r === 8 ? RC[Math.floor(Math.random() * 9)] : c};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;animation-delay:${Math.random() * .1}s`;
      st.appendChild(pt);
    }
  }
  await sleep(skipFlag || RM ? 120 : r >= 4 ? 900 : 450);

  // ---- ×10: после лучшей карточки показываем все 10 ----
  if (list.length > 1) {
    const sorted = [...list].sort((a, b) => a.r - b.r);
    st.innerHTML = `<div class="mgrid">${sorted.map((x, i) => { const k = CONF.rar[x.r], t = CONF.pool[k.k][x.c];
      return `<div class="mt r${x.r}" style="--c:${RC[x.r]};--i:${i}">${x.new ? '<span class="nw">NEW</span>' : ''}<div class="ic">${t.i}</div><b>${t.n}</b></div>`; }).join('')}</div>`;
    sorted.forEach((x, i) => setTimeout(() => { x.r >= 4 ? notif('success') : hap(x.r >= 2 ? 'medium' : 'soft'); }, i * 55));
    await sleep(skipFlag || RM ? 100 : sorted.length * 55 + 450);
  }
  st.querySelectorAll('.flash,.pt').forEach(e => e.remove());
  stageHTML = st.innerHTML;
}

/* ---------- события ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t || !S) return;
  const act = t.dataset.act;
  if (act === 'tab') { if (busy) return; TAB = t.dataset.v; render(); hap('light');
    if (TAB === 'top') { TOP = null; render(); try { TOP = await api('top'); } catch (er) { toast(er.message); } if (TAB === 'top') render(); } }
  else if (act === 'pull') pull(+t.dataset.n, false);
  else if (act === 'free') pull(1, true);
  else if (act === 'col') { COL = +t.dataset.i; render(); hap('light'); }
  else if (act === 'stage') { if (busy) skipFlag = true; else if (stageHTML) { stageHTML = ''; stageGlow = ''; render(); } }
  else if (act === 'upg') {
    if (t.classList.contains('off')) return toast('Не хватает монет');
    try { await api('upgrade', { key: t.dataset.k }); notif('success'); render(); } catch (er) { toast(er.message); render(); }
  }
});



vSummon = function(){
  const pity = Math.min(100, S.pity / S.pity_max * 100), left = S.pity_max - S.pity;
  const can1 = S.coins >= S.price1, can10 = S.coins >= S.price10;
  const pick = i => { const l = CONF.pool[CONF.rar[Math.min(i,3)].k]; return l[(i*2+1) % l.length].i; };
  const pre = [0,1,3,2,1].map((r,i)=>`<div class="${i==2?'mid':''}">${pick(r+i)}</div>`).join('');
  const drops = CONF.rar.map((r,i)=>`<div class="drop" style="--c:${RC[i]}"><div class="ic">${CONF.pool[r.k][0].i}</div><div class="nm">${r.name}</div><div class="p">${pct(S.chances[i])}%</div></div>`).join('');
  return `<div class="case">
    <div class="hd"><div class="ico">🌀</div><h1>Гача-кейс</h1></div>
    <div class="stage ${stageHTML ? 'static' : ''}" id="stage" data-act="stage" style="${stageGlow ? '--glow:' + stageGlow : ''}">${stageHTML || idleReel()}</div>
    <div class="pity"><div class="bar"><i style="width:${pity}%"></i></div>
      <span>Гарант ${rname(4)}+ через ${left} ${plural(left,'крутку','крутки','круток')}</span></div>
    <button class="btn free ${S.free_left > 0 ? 'wait' : ''}" data-act="free" id="freeBtn">${freeLabel()}</button>
    <div class="row2">
      <button class="btn ${can1 ? '' : 'off'}" data-act="pull" data-n="1">Крутить ×1<small>${fmt(S.price1)} 👛</small></button>
      <button class="btn main ${can10 ? '' : 'off'}" data-act="pull" data-n="10" style="font-size:16px;margin:0">Крутить ×10<small>${fmt(S.price10)} 👛</small></button>
    </div></div>`;
};


function setAvatar(name){
  const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user || {}, el = $('#who');
  const nm = name || u.first_name || '?', ch = String(nm).trim().charAt(0).toUpperCase() || '?';
  el.textContent = ch;
  if (u.photo_url) { const im = new Image(); im.alt = ''; im.onload = () => { el.textContent = ''; el.appendChild(im); }; im.src = u.photo_url; }
}


function idleReel(){
  const rs=[1,0,2,3,2,0,1], c=rs.map((r,i)=>{const q=CONF.rar[r],l=CONF.pool[q.k];return `<div class="rcard r${r}${i===3?'':' dim'}" style="--c:${RC[r]}"><div class="ic">${l[(i+r)%l.length].i}</div><b>${q.name}</b></div>`}).join('');
  return `<div class="reel"><div class="strip" style="left:50%;transform:translateX(-50%)">${c}</div><div class="mark"></div></div><div class="ssub"></div>`;
}
