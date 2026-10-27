function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || '';
}

function extractAdminPassword(req) {
  const header = req.headers['x-admin-password'];
  if (typeof header === 'string' && header.length) return header;
  const auth = req.headers.authorization || req.headers.Authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return '';
}

function checkAdmin(req) {
  const expected = getAdminPassword();
  if (!expected) return false;
  const provided = extractAdminPassword(req);
  return provided.length > 0 && provided === expected;
}

function assertAdmin(req) {
  if (!checkAdmin(req)) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}

module.exports = {
  getAdminPassword,
  extractAdminPassword,
  checkAdmin,
  assertAdmin,
};
