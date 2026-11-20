/* ===== Связь с базой данных (Supabase / Postgres) =====
   Вся игра живёт в базе: аккаунты, монеты, коллекция, крутки, топ.
   Приложение только показывает данные и вызывает функции базы (RPC). */
const Cloud = (() => {
  const TK = 'gachaup_token';
  const on = () => !!(CLOUD.url && CLOUD.key);
  const base = () => CLOUD.url.replace(/\/$/, '') + '/rest/v1';
  const token = () => { try { return localStorage.getItem(TK) || ''; } catch (e) { return ''; } };
  const setToken = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {} };

  // вызов функции базы; p_token подставляется автоматически
  async function rpc(fn, args, noToken) {
    const body = Object.assign({}, args);
    if (!noToken) body.p_token = token();
    let r;
    try {
      r = await fetch(base() + '/rpc/' + fn, {
        method: 'POST',
        headers: { apikey: CLOUD.key, Authorization: 'Bearer ' + CLOUD.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) { throw new Error('Нет связи с сервером. Проверьте интернет.'); }
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message; } catch (e) {}
      throw new Error(m || 'Ошибка сервера (' + r.status + ')');
    }
    return r.json();
  }
  return { on, rpc, token, setToken };
})();
