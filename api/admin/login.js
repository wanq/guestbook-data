const { getAdminPassword } = require('../../lib/auth');
const { sendJson, readJsonBody } = require('../../lib/http');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    const expected = getAdminPassword();
    if (!expected) {
      return sendJson(res, 500, { error: 'ADMIN_PASSWORD is not configured' });
    }
    const body = await readJsonBody(req);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password || password !== expected) {
      return sendJson(res, 401, { error: 'Wrong password' });
    }
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('admin login error:', e.message);
    return sendJson(res, e.statusCode || 500, { error: e.message || 'Internal error' });
  }
};
