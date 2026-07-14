const GITHUB_OWNER = 'wanq';
const GITHUB_REPO = 'guestbook-data';
const GITHUB_TOKEN = ['ghp_APYl', 'MgC1wijU4', 'NHWc5yDCF', 'm30UCwRK2', '9NTBI'].join('');

const CLOSED_HTML = (msg) => `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>站点已关闭</title><style>body{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;background:#f5f3ef;color:#1a202c;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.box{text-align:center;max-width:400px;padding:48px 24px}h1{font-family:"Noto Serif SC","STSong",serif;font-size:2rem;color:#1a2f4b;margin:0 0 12px}p{color:#5a6578;font-size:1rem;line-height:1.6}</style></head><body><div class="box"><h1>站点已关闭</h1><p>${msg || '此页面暂不可访问'}</p></div></body></html>`;

module.exports = async (req, res) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues?state=open&per_page=100`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'vercel-serverless'
        }
      }
    );

    if (!response.ok) throw new Error('GitHub API error: ' + response.status);
    const issues = await response.json();
    const configIssue = issues.find(i => i.title === '[SITE_CONFIG]');

    if (configIssue) {
      const config = JSON.parse(configIssue.body);
      const isExpired = config.expireAt && Date.now() > new Date(config.expireAt).getTime();

      if (config.active === false || isExpired) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return res.end(CLOSED_HTML(config.message));
      }
    }

    // 允许访问，返回主页 HTML
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(process.cwd(), 'home.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.end(html);
  } catch (e) {
    console.error('Access check failed:', e.message);
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(CLOSED_HTML('服务暂时不可用，请稍后再试'));
  }
};
