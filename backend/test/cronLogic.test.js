/**
 * Pruebas de la lógica de los dos fallos corregidos en cronJobs.js:
 *   1) Señal de compra solo en el CRUCE a la baja (no repetir cada día) + rearme.
 *   2) Tramo de rotación pausado por crash se COMPLETA al recuperarse el mercado.
 *
 * No usa red ni PostgreSQL real: mockea axios (Twelve Data + Brevo) y el pool.
 * Ejecutar: node test/cronLogic.test.js
 */
const assert = require('assert');
const axios = require('axios');

// --- Mock de axios (singleton compartido con cronJobs y emailService) ---
let marketBelow = true; // controla si el precio del "fetch" queda por debajo de la EMA200
axios.get = async () => {
  // 260 velas: todas a 100 salvo la última (índice 0 = más reciente).
  const values = Array.from({ length: 260 }, () => ({ close: '100' }));
  values[0] = { close: marketBelow ? '50' : '200' }; // 50 => por debajo, 200 => por encima
  return { data: { values } };
};
axios.post = async () => ({ data: { messageId: 'mock' } }); // Brevo (sendEmail) no hace nada real

// --- Mock de pool (base de datos en memoria) ---
function createMockPool() {
  const state = { ema200_history: [], users: [], rotation_history: [], email_log: [] };
  let seq = 1;
  const pool = {
    state,
    query: async (sql, params = []) => {
      const s = sql.replace(/\s+/g, ' ').trim();

      if (s.startsWith('SELECT signal FROM ema200_history')) {
        const last = state.ema200_history[state.ema200_history.length - 1];
        return { rows: last ? [{ signal: last.signal }] : [] };
      }
      if (s.startsWith('INSERT INTO ema200_history')) {
        state.ema200_history.push({ id: seq++, date: params[0], price: params[1], ema200: params[2], signal: params[3] });
        return { rows: [] };
      }
      if (s.startsWith('SELECT * FROM ema200_history ORDER BY')) {
        const last = state.ema200_history[state.ema200_history.length - 1];
        return { rows: last ? [last] : [] };
      }
      if (s.startsWith('SELECT * FROM users WHERE status')) {
        return { rows: state.users.filter(u => u.status === params[0]) };
      }
      if (s.startsWith('SELECT * FROM users WHERE email')) {
        return { rows: state.users.filter(u => u.email === params[0]) };
      }
      if (s.startsWith('INSERT INTO email_log')) {
        state.email_log.push({ user_id: params[0], email_type: params[1], subject: params[2] });
        return { rows: [] };
      }
      if (s.startsWith('SELECT * FROM rotation_history WHERE user_id')) {
        return { rows: state.rotation_history.filter(r => r.user_id === params[0] && r.rotation_year === params[1]) };
      }
      if (s.startsWith('INSERT INTO rotation_history')) {
        const row = { id: seq++, user_id: params[0], rotation_year: params[1], status: params[2], percentage: params[3], completed_at: /completed_at/.test(s) ? new Date() : null };
        state.rotation_history.push(row);
        return { rows: [] };
      }
      if (s.startsWith('UPDATE rotation_history SET status')) {
        const row = state.rotation_history.find(r => r.id === params[1]);
        if (row) { row.status = params[0]; row.completed_at = new Date(); }
        return { rows: [] };
      }
      if (s.startsWith('SELECT rh.id, rh.rotation_year')) {
        const rows = state.rotation_history
          .filter(r => r.status === 'paused')
          .map(r => {
            const u = state.users.find(x => x.id === r.user_id);
            return u && u.status === 'approved' ? { id: r.id, rotation_year: r.rotation_year, email: u.email, name: u.name } : null;
          })
          .filter(Boolean);
        return { rows };
      }
      throw new Error('SQL no manejado en el mock: ' + s);
    }
  };
  return pool;
}

const cron = require('../jobs/cronJobs');

function countEmails(pool, prefix) {
  return pool.state.email_log.filter(e => e.email_type.startsWith(prefix)).length;
}

(async () => {
  // ================= FALLO 1: señal de compra solo en el cruce =================
  {
    const pool = createMockPool();
    cron._setPool(pool);
    pool.state.users.push({ id: 1, email: 'a@test.com', name: 'A', status: 'approved', birth_date: '1990-01-01' });

    // Día 1: mercado cruza a la baja (sin historial previo) -> DEBE avisar
    marketBelow = true;
    await cron.dailyEMA200Check();
    assert.strictEqual(countEmails(pool, 'buy_signal'), 1, 'Día1: debe enviarse 1 señal de compra en el cruce');

    // Día 2: sigue por debajo -> NO debe reenviar
    await cron.dailyEMA200Check();
    assert.strictEqual(countEmails(pool, 'buy_signal'), 1, 'Día2: no debe reenviar mientras siga por debajo');

    // Día 3: se recupera por encima -> NO avisa (y rearma)
    marketBelow = false;
    await cron.dailyEMA200Check();
    assert.strictEqual(countEmails(pool, 'buy_signal'), 1, 'Día3: por encima no envía señal de compra');

    // Día 4: vuelve a cruzar a la baja -> DEBE avisar de nuevo (rearmado)
    marketBelow = true;
    await cron.dailyEMA200Check();
    assert.strictEqual(countEmails(pool, 'buy_signal'), 2, 'Día4: nuevo cruce debe volver a avisar');

    console.log('✅ FALLO 1 OK: señal de compra solo en el cruce, con rearme.');
  }

  // ============ FALLO 2: rotación pausada se completa al recuperarse ============
  {
    const pool = createMockPool();
    cron._setPool(pool);
    // Usuario a ~2 años de jubilarse (dentro de ventana de rotación)
    pool.state.users.push({ id: 1, email: 'b@test.com', name: 'B', status: 'approved', birth_date: '1961-06-01' });

    // Mercado en crash: sembramos una lectura de EMA200 por debajo
    pool.state.ema200_history.push({ id: 999, date: '2026-07-08', price: 50, ema200: 100, signal: 'buy' });

    // Aniversario con mercado en crash -> tramo PAUSADO + email de pausa
    await cron.checkRotationAnniversary();
    const paused = pool.state.rotation_history.filter(r => r.status === 'paused');
    assert.strictEqual(paused.length, 1, 'Debe crearse 1 tramo en pausa durante el crash');
    assert.strictEqual(countEmails(pool, 'rotation_pause'), 1, 'Debe enviarse 1 email de pausa');
    assert.strictEqual(countEmails(pool, 'rotation_active'), 0, 'No debe completarse durante el crash');
    const trancheYear = paused[0].rotation_year;

    // El mercado se recupera: nueva lectura por encima
    pool.state.ema200_history.push({ id: 1000, date: '2026-07-15', price: 200, ema200: 100, signal: null });

    // resumePausedRotations (se dispara desde el chequeo diario al recuperarse)
    await cron.resumePausedRotations();

    const completed = pool.state.rotation_history.filter(r => r.status === 'completed');
    assert.strictEqual(completed.length, 1, 'El tramo pausado debe completarse al recuperarse el mercado');
    assert.strictEqual(completed[0].rotation_year, trancheYear, 'Debe completarse EL MISMO tramo que se pausó (no se pierde)');
    assert.strictEqual(countEmails(pool, 'rotation_active'), 1, 'Debe enviarse el email de rotación activa al completar');

    // Idempotencia: volver a ejecutar no debe duplicar
    await cron.resumePausedRotations();
    assert.strictEqual(countEmails(pool, 'rotation_active'), 1, 'No debe duplicar el email de rotación');

    console.log('✅ FALLO 2 OK: tramo pausado se completa al recuperarse (no se pierde).');
  }

  console.log('\n🎉 Todas las pruebas de lógica pasaron.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Prueba fallida:', err.message);
  process.exit(1);
});
