(function () {
  const CONFIG = window.ROOFTOP_CONFIG;
  const $ = (id) => document.getElementById(id);

  // ---------- Validation helpers ----------
  function setFieldError(field, message) {
    const el = $(`err_${field}`);
    if (el) el.textContent = message;
    const input = $(field);
    if (input) input.classList.toggle('invalid', !!message);
  }

  function clearErrors() {
    ['nombre_completo', 'email', 'whatsapp'].forEach((f) => setFieldError(f, ''));
    $('errorBanner').classList.add('hidden');
  }

  function showBanner(message) {
    const banner = $('errorBanner');
    banner.textContent = message;
    banner.classList.remove('hidden');
  }

  // ---------- WhatsApp format: 000 000 0000 ----------
  $('whatsapp').addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    let formatted = digits;
    if (digits.length > 6) formatted = digits.slice(0, 3) + ' ' + digits.slice(3, 6) + ' ' + digits.slice(6);
    else if (digits.length > 3) formatted = digits.slice(0, 3) + ' ' + digits.slice(3);
    e.target.value = formatted;
  });

  // ---------- Submit ----------
  const form = $('rsvpForm');
  const submitBtn = $('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const nombreCompleto = $('nombre_completo').value.trim();
    const email = $('email').value.trim();
    const whatsapp = $('whatsapp').value.trim();

    let hasError = false;
    if (!nombreCompleto) { setFieldError('nombre_completo', 'Este campo es obligatorio'); hasError = true; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'Ingresa un email válido'); hasError = true; }
    if (!whatsapp) { setFieldError('whatsapp', 'Ingresa tu número de WhatsApp'); hasError = true; }

    if (hasError) return;

    setLoading(true);

    try {
      const res = await fetch('/api/submit-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: nombreCompleto, email, whatsapp }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) { showConfirmation({ nombre_completo: nombreCompleto, whatsapp }); return; }

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
    submitBtn.innerHTML = isLoading
      ? '<span class="spinner"></span>Enviando…'
      : 'Confirmar asistencia';
  }

  // ---------- Confirmation ----------
  function showConfirmation(payload) {
    $('formSection').classList.add('hidden');
    const card = $('confirmationCard');
    card.classList.remove('hidden');

    const firstName = (payload.nombre_completo || '').trim().split(' ')[0] || 'invitado';
    $('confirmationTitle').textContent = `¡Nos vemos ahí, ${firstName}!`;
    $('confirmationWhatsapp').textContent = payload.whatsapp;
    $('icsBtn').addEventListener('click', downloadICS);
  }

  $('editBtn').addEventListener('click', () => {
    $('confirmationCard').classList.add('hidden');
    $('formSection').classList.remove('hidden');
  });

  // ---------- ICS ----------
  function toICSDate(isoString) {
    return new Date(isoString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
      `DESCRIPTION:Sitio por confirmar — te avisamos por WhatsApp.`,
      `LOCATION:Medellín (sitio por confirmar)`,
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
