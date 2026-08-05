const { signToken, TTL_MS } = require('./_shared/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { password } = body;
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || password !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Contraseña incorrecta' }) };
  }

  const token = signToken(Date.now() + TTL_MS);
  return { statusCode: 200, body: JSON.stringify({ token }) };
};
