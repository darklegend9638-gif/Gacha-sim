/* Данные существ — взяты из gacha_1.py */
const RAR = [{"k": "common", "name": "Common", "emoji": "⚪", "w": 44.4455899, "dup": 1}, {"k": "uncommon", "name": "Uncommon", "emoji": "🟢", "w": 28.5, "dup": 3}, {"k": "rare", "name": "Rare", "emoji": "🔵", "w": 17.5, "dup": 8}, {"k": "epic", "name": "Epic", "emoji": "🟣", "w": 8.5, "dup": 25}, {"k": "legendary", "name": "Legendary", "emoji": "🟡", "w": 1.0, "dup": 80}, {"k": "mythic", "name": "Mythic", "emoji": "🔴", "w": 0.05, "dup": 250}, {"k": "secret", "name": "Secret", "emoji": "⚫", "w": 0.004, "dup": 800}, {"k": "divine", "name": "Divine", "emoji": "✨", "w": 0.0004, "dup": 2500}, {"k": "astral", "name": "Astral", "emoji": "🌌", "w": 1.01e-05, "dup": 8000}];
const POOL = {"common": [["Слизень", "🐌"], ["Лесной гном", "🧙"], ["Крыса-вор", "🐀"], ["Болотная жаба", "🐸"], ["Пыльный голем", "🗿"], ["Серый волк", "🐺"]], "uncommon": [["Эльф-лучник", "🏹"], ["Огненный лис", "🦊"], ["Каменный краб", "🦀"], ["Ночная сова", "🦉"], ["Речной дух", "💧"], ["Грибной маг", "🍄"]], "rare": [["Грифон", "🦅"], ["Тёмный рыцарь", "⚔️"], ["Ледяная волчица", "❄️"], ["Песчаный джинн", "🧞"], ["Сирена", "🧜"], ["Кристальный олень", "🦌"]], "epic": [["Мантикора", "🦁"], ["Громовой титан", "⚡"], ["Теневой убийца", "🥷"], ["Вампир-лорд", "🧛"], ["Лунная жрица", "🌙"], ["Лавовый голем", "🌋"]], "legendary": [["Феникс", "🔥"], ["Дракон Бездны", "🐉"], ["Король-лич", "💀"], ["Ангел Рассвета", "👼"], ["Кракен", "🐙"], ["Валькирия", "👸"]], "mythic": [["Ёрмунганд", "🐍"], ["Пожиратель Миров", "🌑"], ["Древо Мира", "🌳"], ["Хронос", "⏳"], ["Анубис", "🏺"], ["Ифрит Пустоты", "👹"]], "secret": [["??? Безымянный", "❓"], ["Пустотный Страж", "👁️"], ["Дитя Хаоса", "🌀"], ["Зеркальный Двойник", "🪞"], ["Забытый Бог", "🕳️"], ["Глитч", "👾"]], "divine": [["Солярис", "☀️"], ["Серафим Света", "😇"], ["Владыка Времени", "🕰️"], ["Создатель Звёзд", "⭐"], ["Око Вечности", "🧿"], ["Богиня Судьбы", "👑"]], "astral": [["Галактический Левиафан", "🐋"], ["Квазар-Дракон", "🌠"], ["Хранитель Мультивселенной", "🌌"], ["Туманность-Дева", "💫"], ["Сингулярность", "⚫"], ["Первозданный Космос", "🪐"]]};

/* ===== Игра ===== Вся логика (крутки, монеты, гарант, бонусы) выполняется в базе данных,
   см. supabase.sql. Здесь только данные для отрисовки и вызовы функций базы. */
const Game = (() => {
  const TOTAL = Object.values(POOL).reduce((a, v) => a + v.length, 0);

  function conf() {
    return { rar: RAR.map(r => ({ k: r.k, name: r.name, emoji: r.emoji })),
      pool: Object.fromEntries(Object.entries(POOL).map(([k, v]) => [k, v.map(([n, i]) => ({ n, i }))])), total: TOTAL };
  }

  // действие интерфейса -> функция базы + её аргументы
  const ROUTES = {
    state:   () => ['game_state', {}],
    pull:    q => ['game_pull', { p_free: !!q.free, p_n: q.n === 10 ? 10 : 1 }],
    upgrade: q => ['game_upgrade', { p_key: String(q.key || '') }],
    daily:   () => ['game_daily', {}],
    work:    () => ['game_work', {}],
    rename:  q => ['game_rename', { p_name: String(q.name || '') }],
    history: q => ['game_history', { p_limit: q.limit || 40 }],
    reset:   () => ['game_reset', {}],
    top:     q => ['game_top', { p_board: q.board || 'score', p_limit: q.limit || 50 }],
  };

  async function api(action, req = {}) {
    try {
      if (action === 'init') {
        const j = await api('state');
        return j.error ? j : { conf: conf(), state: j.state, name: j.state.name };
      }
      const route = ROUTES[action];
      if (!route) return { error: 'Неизвестное действие' };
      const [fn, args] = route(req);
      const j = await Cloud.rpc(fn, args);
      if (j && j.auth) { Cloud.setToken(''); if (window.onAuthLost) window.onAuthLost(); }
      return j;
    } catch (e) { return { error: e.message || 'Ошибка' }; }
  }

  // регистрация и вход: при успехе сохраняем токен сессии
  async function auth(fn, username, password) {
    try {
      const j = await Cloud.rpc(fn, { p_username: username, p_password: password }, true);
      if (j.token) Cloud.setToken(j.token);
      return j;
    } catch (e) { return { error: e.message || 'Ошибка' }; }
  }
  const register = (u, p) => auth('auth_register', u, p);
  const login = (u, p) => auth('auth_login', u, p);
  async function logout() {
    try { await Cloud.rpc('auth_logout', {}); } catch (e) {}
    Cloud.setToken('');
  }

  return { api, conf, register, login, logout };
})();
