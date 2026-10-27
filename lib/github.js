const OWNER = 'wanq';
const REPO = 'guestbook-data';

function getToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const err = new Error('GITHUB_TOKEN is not configured');
    err.statusCode = 500;
    throw err;
  }
  return token;
}

async function githubFetch(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'guestbook-vercel',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
}

async function listOpenIssues(perPage = 100) {
  const res = await githubFetch(`/issues?state=open&sort=created&direction=desc&per_page=${perPage}`);
  if (!res.ok) {
    const err = new Error('GitHub API error: ' + res.status);
    err.statusCode = 502;
    throw err;
  }
  return res.json();
}

async function findConfigIssue(issues) {
  const list = issues || (await listOpenIssues());
  return list.find((i) => i.title === '[SITE_CONFIG]') || null;
}

module.exports = {
  OWNER,
  REPO,
  getToken,
  githubFetch,
  listOpenIssues,
  findConfigIssue,
};
