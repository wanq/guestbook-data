const { listOpenIssues, findConfigIssue, githubFetch } = require('../lib/github');
const { assertAdmin } = require('../lib/auth');
const { sendJson, readJsonBody } = require('../lib/http');

function parseConfig(body) {
  try {
    const cfg = JSON.parse(body || '{}');
    return {
      active: cfg.active !== false,
      expireAt: cfg.expireAt || '',
      message: cfg.message || '',
    };
  } catch (_) {
    return { active: true, expireAt: '', message: '' };
  }
}

async function handleGet(req, res) {
  const issues = await listOpenIssues();
  const configIssue = await findConfigIssue(issues);
  if (!configIssue) {
    return sendJson(res, 200, {
      active: true,
      expireAt: '',
      message: '',
      issueNumber: null,
    });
  }
  const cfg = parseConfig(configIssue.body);
  return sendJson(res, 200, { ...cfg, issueNumber: configIssue.number });
}

async function handlePost(req, res) {
  assertAdmin(req);
  const body = await readJsonBody(req);
  const next = {
    active: body.active !== false,
    expireAt: body.expireAt || '',
    message: typeof body.message === 'string' ? body.message.slice(0, 500) : '',
  };

  const issues = await listOpenIssues();
  let configIssue = await findConfigIssue(issues);

  if (!configIssue) {
    const createRes = await githubFetch('/issues', {
      method: 'POST',
      body: JSON.stringify({
        title: '[SITE_CONFIG]',
        body: JSON.stringify(next),
      }),
    });
    if (!createRes.ok) {
      return sendJson(res, 502, { error: 'Failed to create site config' });
    }
    const created = await createRes.json();
    return sendJson(res, 200, { ...next, issueNumber: created.number });
  }

  const patchRes = await githubFetch(`/issues/${configIssue.number}`, {
    method: 'PATCH',
    body: JSON.stringify({ body: JSON.stringify(next) }),
  });
  if (!patchRes.ok) {
    return sendJson(res, 502, { error: 'Failed to update site config' });
  }
  return sendJson(res, 200, { ...next, issueNumber: configIssue.number });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error('site-config API error:', e.message);
    return sendJson(res, e.statusCode || 500, { error: e.message || 'Internal error' });
  }
};
