(function () {
  const $ = (id) => document.getElementById(id);
  const PAGE_SIZE = 25;
  let currentPage = 1;
  let totalPages = 1;

  function getToken() { return sessionStorage.getItem('rooftop_dashboard_token'); }
  function setToken(t) { sessionStorage.setItem('rooftop_dashboard_token', t); }
  function clearToken() { sessionStorage.removeItem('rooftop_dashboard_token'); }

  function showLogin(message) {
    clearToken();
    $('dashboardScreen').classList.add('hidden');
    $('loginScreen').classList.remove('hidden');
    if (message) {
      $('loginError').textContent = message;
      $('loginError').classList.remove('hidden');
    }
  }

  function showDashboard() {
    $('loginScreen').classList.add('hidden');
    $('dashboardScreen').classList.remove('hidden');
    loadStats();
    loadList(1);
  }

  async function apiGet(action, params) {
    const token = getToken();
    if (!token) { showLogin(); return null; }
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`/api/dashboard-data?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { showLogin('Tu sesión expiró. Ingresa la contraseña de nuevo.'); return null; }
    if (!res.ok) throw new Error('request_failed');
    return res.json();
  }

  // ---------- Login ----------
  $('loginBtn').addEventListener('click', async () => {
    const password = $('passwordInput').value;
    $('loginError').classList.add('hidden');
    try {
      const res = await fetch('/api/dashboard-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        $('loginError').textContent = data.error || 'No pudimos iniciar sesión.';
        $('loginError').classList.remove('hidden');
        return;
      }
      setToken(data.token);
      showDashboard();
    } catch {
      $('loginError').textContent = 'No pudimos conectar con el servidor. Intenta de nuevo.';
      $('loginError').classList.remove('hidden');
    }
  });

  $('passwordInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('loginBtn').click(); });
  $('logoutBtn').addEventListener('click', () => showLogin());

  // ---------- Stats ----------
  async function loadStats() {
    try {
      const stats = await apiGet('stats', {});
      if (!stats) return;
      $('statTotal').textContent = stats.total_registros ?? 0;
      $('statConfirmados').textContent = stats.total_confirmados ?? 0;
      $('statNoAsisten').textContent = stats.total_no_asisten ?? 0;
      const pct = stats.total_registros ? Math.round((stats.total_confirmados / stats.total_registros) * 100) : 0;
      $('statPct').textContent = `${pct}%`;
    } catch { /* tiles quedan en "–" */ }
  }

  // ---------- Attendee list ----------
  async function loadList(page) {
    $('listError').classList.add('hidden');
    try {
      const data = await apiGet('list', { page, pageSize: PAGE_SIZE });
      if (!data) return;
      currentPage = data.page;
      totalPages = data.totalPages;

      const list = $('attendeeList');
      list.innerHTML = '';
      $('emptyState').classList.toggle('hidden', data.rows.length > 0);
      data.rows.forEach((row) => list.appendChild(renderRow(row)));

      $('pageInfo').textContent = `Página ${currentPage} de ${totalPages} · ${data.total} registros`;
      $('prevBtn').disabled = currentPage <= 1;
      $('nextBtn').disabled = currentPage >= totalPages;
    } catch {
      $('listError').textContent = 'No pudimos cargar el listado. Intenta recargar la página.';
      $('listError').classList.remove('hidden');
    }
  }

  function renderRow(row) {
    const el = document.createElement('div');
    el.className = 'attendee-row';
    const badge = row.confirmacion
      ? '<span class="badge badge-yes">Asiste</span>'
      : '<span class="badge badge-no">No asiste</span>';
    const meta = [
      row.telefono ? `Tel: ${row.telefono}` : null,
      new Date(row.created_at).toLocaleString('es'),
    ].filter(Boolean).map(escapeHtml).join(' · ');

    el.innerHTML = `
      <div class="row-top">
        <span class="name">${escapeHtml(row.nombre_completo)}</span>
        ${badge}
      </div>
      <div class="email">${escapeHtml(row.email)}</div>
      <div class="attendee-meta">${meta}</div>
    `;
    return el;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  $('prevBtn').addEventListener('click', () => { if (currentPage > 1) loadList(currentPage - 1); });
  $('nextBtn').addEventListener('click', () => { if (currentPage < totalPages) loadList(currentPage + 1); });

  // ---------- Export CSV ----------
  $('exportBtn').addEventListener('click', async () => {
    const btn = $('exportBtn');
    const orig = btn.textContent;
    btn.textContent = 'Generando CSV…';
    btn.disabled = true;
    try {
      const data = await apiGet('export', {});
      if (!data) return;
      const headers = ['nombre_completo', 'email', 'telefono', 'confirmacion', 'created_at'];
      const csvRows = [headers.join(',')];
      data.rows.forEach((row) => {
        csvRows.push(headers.map((h) => {
          let v = row[h];
          if (v === null || v === undefined) v = '';
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(','));
      });
      const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rooftop-ceramica-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert('No pudimos generar el CSV. Intenta de nuevo.'); }
    finally { btn.textContent = orig; btn.disabled = false; }
  });

  if (getToken()) showDashboard();
})();
