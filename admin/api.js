// ── CONFIG ─────────────────────────────────────────────────
const OWNER = 'yannoo00';
const REPO = 'yannoo00.github.io';
const BRANCH = 'main';
const POSTS_PATH = '_posts';

// ── TOKEN ──────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('gh_token');
}
function setToken(t) {
  localStorage.setItem('gh_token', t);
}
function clearToken() {
  localStorage.removeItem('gh_token');
}

// ── GITHUB API ─────────────────────────────────────────────
async function ghFetch(path, options) {
  options = options || {};
  const res = await fetch(
    'https://api.github.com' + path,
    Object.assign({}, options, {
      headers: Object.assign(
        {
          Authorization: 'Bearer ' + getToken(),
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        options.headers || {},
      ),
    }),
  );
  if (!res.ok) {
    const err = await res.json().catch(function () {
      return {};
    });
    throw new Error(err.message || 'HTTP ' + res.status);
  }
  return res.json();
}

function getUser() {
  return ghFetch('/user');
}

function listPosts() {
  return ghFetch('/repos/' + OWNER + '/' + REPO + '/contents/' + POSTS_PATH);
}

function getFile(path) {
  return ghFetch('/repos/' + OWNER + '/' + REPO + '/contents/' + path);
}

function saveFile(path, content, message, sha) {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const body = { message, content: encoded, branch: BRANCH };
  if (sha) body.sha = sha;
  return ghFetch('/repos/' + OWNER + '/' + REPO + '/contents/' + path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function deleteFile(path, sha, message) {
  return ghFetch('/repos/' + OWNER + '/' + REPO + '/contents/' + path, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
}

// ── FRONT MATTER ───────────────────────────────────────────
function buildFrontMatter(title, date, categories, tags, excerpt) {
  const cats = categories
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const catsYaml = cats.map((c) => '  - ' + c).join('\n');
  const tagsYaml = tagList.length ? '  - [' + tagList.join(', ') + ']' : '';

  return [
    '---',
    `title:  "${title}"`,
    'layout: post',
    `excerpt: "${excerpt}"`,
    '',
    'categories:',
    catsYaml,
    'tags:',
    tagsYaml,
    '',
    'toc: true',
    'toc_sticky: true',
    ' ',
    'date: ' + date,
    'last_modified_at: ' + date,
    '---',
    '',
  ].join('\n');
}

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: content };

  const yaml = match[1];
  const body = match[2].trim();
  const fm = {};

  const titleM = yaml.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleM) fm.title = titleM[1].replace(/^["']|["']$/g, '').trim();

  const dateM = yaml.match(/^date:\s*(\S+)/m);
  if (dateM) fm.date = dateM[1].trim();

  const excerptM = yaml.match(/^excerpt:\s*["']?(.+?)["']?\s*$/m);
  if (excerptM) fm.excerpt = excerptM[1].replace(/^["']|["']$/g, '').trim();

  const catsInline = yaml.match(/^categories:\s*(.+)$/m);
  const catsBlock = yaml.match(/^categories:\s*\n((?:[ \t]+- .+\n?)*)/m);
  if (catsBlock) {
    const catsRaw = catsBlock[1].match(/- (.+)/g);
    if (catsRaw)
      fm.categories = catsRaw.map((s) => s.replace('- ', '').trim()).join(', ');
  } else if (catsInline && catsInline[1].trim()) {
    fm.categories = catsInline[1].trim();
  }

  const tagsInline = yaml.match(/^tags:\s*(.+)$/m);
  const tagsBlock = yaml.match(/^tags:\s*\n((?:[ \t]+- .+\n?)*)/m);
  if (tagsBlock) {
    const rawTags = tagsBlock[1].match(/- \[(.+)\]/);
    if (rawTags) fm.tags = rawTags[1];
  } else if (tagsInline && tagsInline[1].trim()) {
    fm.tags = tagsInline[1].trim();
  }

  return { fm, body };
}
