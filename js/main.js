(function () {
  const CONFIG = window.ROOFTOP_CONFIG;
  const $ = (id) => document.getElementById(id);

  const state = { confirmacion: null };

  $('metaDate').textContent = CONFIG.dateLabel;
  $('metaLocation').textContent = CONFIG.locationLabel;

  // ---------- Toggle Sí/No ----------
  const toggleButtons = document.querySelectorAll('#confirmacionToggle .toggle-btn');
  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value === 'true';
      state.confirmacion = value;
      toggleButtons.forEach((b) => b.classList.toggle('active', b === btn));
      setFieldError('confirmacion', '');
    });
  });

  // ---------- Validation helpers ----------
  function setFieldError(field, message) {
    const el = $(`err_${field}`);
    if (el) el.textContent = message;
    const input = $(field);
    if (input) input.classList.toggle('invalid', !!message);
  }

  function clearErrors() {
    ['nombre_completo', 'email', 'confirmacion'].forEach((f) => setFieldError(f, ''));
    $('errorBanner').classList.add('hidden');
  }

  function showBanner(message) {
    const banner = $('errorBanner');
    banner.textContent = message;
    banner.classList.remove('hidden');
  }

  // ---------- Submit ----------
  const form = $('rsvpForm');
  const submitBtn = $('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const nombreCompleto = $('nombre_completo').value.trim();
    const email = $('email').value.trim();
    const telefono = $('telefono').value.trim();

    let hasError = false;
    if (!nombreCompleto) { setFieldError('nombre_completo', 'Este campo es obligatorio'); hasError = true; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'Ingresa un email válido'); hasError = true; }
    if (state.confirmacion === null) { setFieldError('confirmacion', 'Indica si asistirás'); hasError = true; }

    if (hasError) return;

    const payload = {
      nombre_completo: nombreCompleto,
      email,
      telefono: telefono || null,
      confirmacion: state.confirmacion,
    };

    setLoading(true);

    try {
      const res = await fetch('/api/submit-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) { showConfirmation(payload); return; }

      if (res.status === 409) {
        showBanner(data.error || 'Este email ya está registrado.');
      } else if (res.status === 400 && data.fields) {
        Object.entries(data.fields).forEach(([field, message]) => setFieldError(field, message));
        showBanner(data.error || 'Revisa los campos marcados.');
      } else {
        showBanner(data.error || 'No pudimos guardar tu registro. Intenta de nuevo.');
      }
    } catch {
      showBanner('No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo — tus datos no se han perdido.');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading ? '<span class="spinner"></span>Enviando…' : 'Confirmar asistencia';
  }

  // ---------- Confirmation ----------
  function showConfirmation(payload) {
    $('heroBlock').classList.add('hidden');
    form.classList.add('hidden');
    const card = $('confirmationCard');
    card.classList.remove('hidden');

    const firstName = (payload.nombre_completo || '').trim().split(' ')[0] || 'invitado';

    if (payload.confirmacion) {
      $('confirmationTitle').textContent = `¡Gracias, ${firstName}!`;
      $('confirmationMessage').textContent = `Tu asistencia al ${CONFIG.eventName} quedó confirmada. Te esperamos el ${CONFIG.dateLabel}.`;
      $('googleCalBtn').href = buildGoogleCalendarUrl();
      $('icsBtn').addEventListener('click', downloadICS);
    } else {
      $('confirmationTitle').textContent = `Gracias, ${firstName}`;
      $('confirmationMessage').textContent = 'Gracias por avisarnos que no podrás acompañarnos esta vez.';
      $('calendarActions').classList.add('hidden');
    }
  }

  $('editBtn').addEventListener('click', () => {
    $('confirmationCard').classList.add('hidden');
    $('heroBlock').classList.remove('hidden');
    form.classList.remove('hidden');
  });

  function toICSDate(isoString) {
    return new Date(isoString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function buildGoogleCalendarUrl() {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: CONFIG.eventName,
      dates: `${toICSDate(CONFIG.eventStartISO)}/${toICSDate(CONFIG.eventEndISO)}`,
      details: CONFIG.tagline,
      location: CONFIG.calendarLocation,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function downloadICS() {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rooftop Cerámica Italia//RSVP//ES',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@rooftop-ceramica`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      `DTSTART:${toICSDate(CONFIG.eventStartISO)}`,
      `DTEND:${toICSDate(CONFIG.eventEndISO)}`,
      `SUMMARY:${CONFIG.eventName}`,
      `DESCRIPTION:${CONFIG.tagline}`,
      `LOCATION:${CONFIG.calendarLocation}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rooftop-ceramica-italia.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
})();
