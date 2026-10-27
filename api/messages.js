const { listOpenIssues, githubFetch } = require('../lib/github');
const { assertAdmin } = require('../lib/auth');
const { sendJson, readJsonBody, clientIp } = require('../lib/http');

const TITLE_PREFIX = '[留言]';
const rateBuckets = new Map();

function allowPost(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 5;
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function toMessage(issue) {
  return {
    number: issue.number,
    id: issue.number,
    title: (issue.title || '').replace(/^\[留言\]\s*/, ''),
    name: (issue.title || '').replace(/^\[留言\]\s*/, ''),
    body: issue.body || '',
    message: issue.body || '',
    created_at: issue.created_at,
    time: new Date(issue.created_at).getTime(),
    user: issue.user && issue.user.login ? issue.user.login : null,
  };
}

async function handleGet(req, res) {
  const issues = await listOpenIssues();
  const messages = issues
    .filter((i) => typeof i.title === 'string' && i.title.startsWith(TITLE_PREFIX))
    .map(toMessage);
  return sendJson(res, 200, { messages });
}

async function handlePost(req, res) {
  if (!allowPost(clientIp(req))) {
    return sendJson(res, 429, { error: 'Too many requests, please wait a minute' });
  }
  const body = await readJsonBody(req);
  const name = String(body.name || '').trim().slice(0, 64);
  const message = String(body.message || '').trim().slice(0, 2000);
  if (!name || !message) {
    return sendJson(res, 400, { error: 'name and message are required' });
  }
  const ghRes = await githubFetch('/issues', {
    method: 'POST',
    body: JSON.stringify({ title: `${TITLE_PREFIX} ${name}`, body: message }),
  });
  if (!ghRes.ok) {
    const err = await ghRes.json().catch(() => ({}));
    return sendJson(res, 502, { error: err.message || 'Failed to create issue' });
  }
  const issue = await ghRes.json();
  return sendJson(res, 201, { message: toMessage(issue) });
}

async function handleDelete(req, res) {
  assertAdmin(req);
  const url = new URL(req.url, 'http://localhost');
  let number = url.searchParams.get('number');
  if (!number) {
    const body = await readJsonBody(req);
    number = body.number;
  }
  const issueNumber = Number(number);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    return sendJson(res, 400, { error: 'Valid issue number required' });
  }
  const ghRes = await githubFetch(`/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  });
  if (!ghRes.ok) {
    return sendJson(res, 502, { error: 'Failed to close issue' });
  }
  return sendJson(res, 200, { ok: true, number: issueNumber });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    if (req.method === 'DELETE') return await handleDelete(req, res);
    res.setHeader('Allow', 'GET, POST, DELETE');
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error('messages API error:', e.message);
    return sendJson(res, e.statusCode || 500, { error: e.message || 'Internal error' });
  }
};
