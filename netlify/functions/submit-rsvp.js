const { getSupabaseAdmin } = require('./_shared/supabaseAdmin');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { nombre_completo, email, whatsapp } = body;

  const fields = {};
  if (!nombre_completo?.trim()) fields.nombre_completo = 'Este campo es obligatorio';
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = 'Ingresa un email válido';
  if (!whatsapp?.trim()) fields.whatsapp = 'Ingresa tu número de WhatsApp';

  if (Object.keys(fields).length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Revisa los campos marcados.', fields }),
    };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('asistentes').insert({
    nombre_completo: nombre_completo.trim(),
    email: email.trim().toLowerCase(),
    whatsapp: whatsapp.trim(),
  });

  if (error) {
    if (error.code === '23505') {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'Este email ya tiene un registro. Si quieres editar tu respuesta, contáctanos.' }),
      };
    }
    console.error('Supabase error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al guardar el registro. Intenta de nuevo.' }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
