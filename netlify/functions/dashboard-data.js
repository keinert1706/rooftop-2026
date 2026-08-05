const { getSupabaseAdmin } = require('./_shared/supabaseAdmin');
const { verifyToken, tokenFromEvent } = require('./_shared/auth');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  if (!verifyToken(tokenFromEvent(event))) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  const { action = 'stats', page = '1', pageSize = String(DEFAULT_PAGE_SIZE) } = event.queryStringParameters || {};
  const supabase = getSupabaseAdmin();

  if (action === 'stats') {
    const { data, error } = await supabase.rpc('asistentes_stats');
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  if (action === 'list') {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));
    const from = (p - 1) * ps;

    const { data, error, count } = await supabase
      .from('asistentes')
      .select('id, nombre_completo, email, whatsapp, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + ps - 1);

    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return {
      statusCode: 200,
      body: JSON.stringify({ rows: data, total: count, page: p, totalPages: Math.ceil(count / ps) }),
    };
  }

  if (action === 'export') {
    const { data, error } = await supabase
      .from('asistentes')
      .select('nombre_completo, email, whatsapp, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ rows: data }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Acción no válida' }) };
};
