// Inline post editor — loaded lazily when the edit FAB is clicked
(function () {
  'use strict';

  var OWNER = 'yannoo00';
  var REPO = 'yannoo00.github.io';
  var BRANCH = 'main';
  var POSTS_PATH = '_posts';

  var _slug = null;
  var _file = null; // { path, sha }
  var _mde = null;
  var _article = null;
  var _container = null;

  // ── API ──────────────────────────────────────────────────
  function getToken() { return localStorage.getItem('gh_token'); }

  async function ghFetch(path, options) {
    options = options || {};
    var res = await fetch('https://api.github.com' + path, Object.assign({}, options, {
      headers: Object.assign({
        Authorization: 'Bearer ' + getToken(),
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      }, options.headers || {}),
    }));
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.message || 'HTTP ' + res.status);
    }
    return res.json();
  }

  async function findPostBySlug(slug) {
    var files = await ghFetch('/repos/' + OWNER + '/' + REPO + '/contents/' + POSTS_PATH);
    var match = files.find(function (f) {
      var m = f.name.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
      return m && m[1] === slug;
    });
    if (!match) throw new Error('게시글을 찾을 수 없습니다: ' + slug);
    return match;
  }

  // ── FRONT MATTER ─────────────────────────────────────────
  function parseFrontMatter(content) {
    var match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { fm: {}, body: content };
    var yaml = match[1];
    var body = match[2].trim();
    var fm = {};

    var titleM = yaml.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    if (titleM) fm.title = titleM[1].replace(/^["']|["']$/g, '').trim();

    var dateM = yaml.match(/^date:\s*(\S+)/m);
    if (dateM) fm.date = dateM[1].trim();

    var excerptM = yaml.match(/^excerpt:\s*["']?(.+?)["']?\s*$/m);
    if (excerptM) fm.excerpt = excerptM[1].replace(/^["']|["']$/g, '').trim();

    var catsSection = yaml.match(/^categories:\s*\n((?:[ \t]+- .+\n?)*)/m);
    if (catsSection) {
      var catsRaw = catsSection[1].match(/- (.+)/g);
      if (catsRaw) fm.categories = catsRaw.map(function (s) { return s.replace('- ', '').trim(); }).join(', ');
    }

    var tagsSection = yaml.match(/^tags:\s*\n((?:[ \t]+- .+\n?)*)/m);
    if (tagsSection) {
      var rawTags = tagsSection[1].match(/- \[(.+)\]/);
      if (rawTags) fm.tags = rawTags[1];
    }

    return { fm: fm, body: body };
  }

  function buildFrontMatter(title, date, categories, tags, excerpt) {
    var cats = categories.split(',').map(function (c) { return c.trim(); }).filter(Boolean);
    var tagList = tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    var catsYaml = cats.map(function (c) { return '  - ' + c; }).join('\n');
    var tagsYaml = tagList.length ? '  - [' + tagList.join(', ') + ']' : '';

    return [
      '---',
      'title:  "' + title + '"',
      'layout: post',
      'excerpt: "' + (excerpt || '') + '"',
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

  // ── CSS ───────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('fab-editor-css')) return;
    var style = document.createElement('style');
    style.id = 'fab-editor-css';
    style.textContent = [
      '#fab-inline-editor { width: 100%; }',

      '.fab-editor-bar {',
      '  display: flex; flex-wrap: wrap; gap: .5rem; align-items: flex-start;',
      '  padding: .75rem 0 1rem; border-bottom: 1px solid var(--bs-border-color, #dee2e6);',
      '  margin-bottom: 1rem;',
      '}',

      '.fab-editor-fields {',
      '  display: flex; flex-wrap: wrap; gap: .4rem; flex: 1;',
      '}',

      '.fab-editor-fields input {',
      '  padding: .3rem .6rem;',
      '  border: 1px solid var(--bs-border-color, #dee2e6);',
      '  border-radius: .375rem;',
      '  background: var(--bs-body-bg, #fff);',
      '  color: var(--bs-body-color, #212529);',
      '  font-size: .85rem;',
      '}',

      '#fab-fm-title { flex: 2; min-width: 160px; }',
      '#fab-fm-date { width: 130px; }',
      '#fab-fm-categories, #fab-fm-tags { flex: 1; min-width: 120px; }',

      '.fab-editor-actions { display: flex; gap: .4rem; align-items: flex-start; }',

      '.fab-ed-btn {',
      '  display: inline-flex; align-items: center; gap: .3rem;',
      '  padding: .35rem .8rem; border-radius: .375rem;',
      '  font-size: .85rem; font-weight: 500; cursor: pointer;',
      '  border: 1px solid transparent; transition: opacity .15s;',
      '}',
      '.fab-ed-btn:disabled { opacity: .6; cursor: not-allowed; }',
      '.fab-ed-save { background: #0d6efd; color: #fff; border-color: #0d6efd; }',
      '.fab-ed-save:hover:not(:disabled) { background: #0b5ed7; }',
      '.fab-ed-cancel { background: transparent; color: var(--bs-body-color,#212529); border-color: var(--bs-border-color,#dee2e6); }',
      '.fab-ed-cancel:hover { background: var(--bs-secondary-bg, #f8f9fa); }',

      '.fab-ed-notice {',
      '  position: fixed; top: 1rem; left: 50%; transform: translateX(-50%);',
      '  padding: .5rem 1.2rem; border-radius: .5rem; font-size: .85rem;',
      '  z-index: 9999; opacity: 0; transition: opacity .25s; pointer-events: none;',
      '}',
      '.fab-ed-notice.show { opacity: 1; pointer-events: auto; }',
      '.fab-ed-notice.success { background: #198754; color: #fff; }',
      '.fab-ed-notice.error   { background: #dc3545; color: #fff; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── NOTICE ────────────────────────────────────────────────
  var _noticeEl = null;
  var _noticeTimer = null;

  function showNotice(msg, type) {
    if (!_noticeEl) {
      _noticeEl = document.createElement('div');
      _noticeEl.className = 'fab-ed-notice';
      document.body.appendChild(_noticeEl);
    }
    _noticeEl.textContent = msg;
    _noticeEl.className = 'fab-ed-notice show ' + (type || '');
    clearTimeout(_noticeTimer);
    _noticeTimer = setTimeout(function () {
      _noticeEl.className = 'fab-ed-notice';
    }, 3500);
  }

  // ── LOAD SCRIPT HELPER ───────────────────────────────────
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.EasyMDE) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ── CANCEL / RESTORE ─────────────────────────────────────
  function cancel() {
    if (_container) { _container.remove(); _container = null; }
    if (_mde) { _mde.toTextArea(); _mde = null; }
    if (_article) { _article.style.display = ''; _article = null; }
  }

  // ── SAVE ─────────────────────────────────────────────────
  async function save() {
    var title   = document.getElementById('fab-fm-title').value.trim();
    var date    = document.getElementById('fab-fm-date').value.trim();
    var cats    = document.getElementById('fab-fm-categories').value.trim();
    var tags    = document.getElementById('fab-fm-tags').value.trim();
    var excerpt = document.getElementById('fab-fm-excerpt').value.trim();
    var body    = _mde.value();

    if (!title) { showNotice('제목을 입력하세요.', 'error'); return; }

    var content = buildFrontMatter(title, date, cats, tags, excerpt) + '\n' + body;
    var encoded = btoa(unescape(encodeURIComponent(content)));

    var saveBtn = document.getElementById('fab-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    try {
      var result = await ghFetch(
        '/repos/' + OWNER + '/' + REPO + '/contents/' + _file.path,
        {
          method: 'PUT',
          body: JSON.stringify({ message: 'Update: ' + title, content: encoded, sha: _file.sha, branch: BRANCH }),
        }
      );
      _file.sha = result.content.sha;
      showNotice('저장되었습니다! GitHub Actions가 빌드를 시작합니다.', 'success');
    } catch (e) {
      showNotice('저장 실패: ' + e.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  }

  // ── OPEN ─────────────────────────────────────────────────
  async function open(slug) {
    _slug = slug;
    injectCSS();

    _article = document.querySelector('main article');
    if (!_article) { showNotice('게시글 영역을 찾을 수 없습니다.', 'error'); return; }
    _article.style.opacity = '.3';
    _article.style.pointerEvents = 'none';

    try {
      var fileInfo = await findPostBySlug(slug);
      var file = await ghFetch('/repos/' + OWNER + '/' + REPO + '/contents/' + fileInfo.path);
      var raw = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))));
      var parsed = parseFrontMatter(raw);
      _file = { path: fileInfo.path, sha: file.sha };

      // Load EasyMDE
      if (!document.getElementById('easymde-css')) {
        var link = document.createElement('link');
        link.id = 'easymde-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.css';
        document.head.appendChild(link);
      }
      await loadScript('https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.js');

      // Hide original article
      _article.style.display = 'none';
      _article.style.opacity = '';
      _article.style.pointerEvents = '';

      // Build editor UI
      _container = document.createElement('div');
      _container.id = 'fab-inline-editor';
      _container.innerHTML =
        '<div class="fab-editor-bar">' +
          '<div class="fab-editor-fields">' +
            '<input id="fab-fm-title" type="text" placeholder="제목" />' +
            '<input id="fab-fm-date" type="date" />' +
            '<input id="fab-fm-categories" type="text" placeholder="카테고리 (쉼표 구분)" />' +
            '<input id="fab-fm-tags" type="text" placeholder="태그 (쉼표 구분)" />' +
            '<input id="fab-fm-excerpt" type="text" placeholder="요약" />' +
          '</div>' +
          '<div class="fab-editor-actions">' +
            '<button id="fab-save-btn" class="fab-ed-btn fab-ed-save">저장</button>' +
            '<button id="fab-cancel-btn" class="fab-ed-btn fab-ed-cancel">취소</button>' +
          '</div>' +
        '</div>' +
        '<textarea id="fab-md-textarea"></textarea>';

      _article.parentNode.insertBefore(_container, _article);

      // Populate fields
      document.getElementById('fab-fm-title').value      = parsed.fm.title      || '';
      document.getElementById('fab-fm-date').value       = parsed.fm.date       || '';
      document.getElementById('fab-fm-categories').value = parsed.fm.categories || '';
      document.getElementById('fab-fm-tags').value       = parsed.fm.tags       || '';
      document.getElementById('fab-fm-excerpt').value    = parsed.fm.excerpt    || '';

      // Init EasyMDE
      _mde = new EasyMDE({
        element: document.getElementById('fab-md-textarea'),
        spellChecker: false,
        autosave: { enabled: false },
        toolbar: ['bold','italic','heading','|','code','quote','|','unordered-list','ordered-list','|','link','image','|','preview','side-by-side','fullscreen'],
        minHeight: '500px',
      });
      _mde.value(parsed.body);

      document.getElementById('fab-save-btn').addEventListener('click', save);
      document.getElementById('fab-cancel-btn').addEventListener('click', cancel);

    } catch (e) {
      _article.style.opacity = '';
      _article.style.pointerEvents = '';
      showNotice('오류: ' + e.message, 'error');
    }
  }

  window.FabEditor = { open: open };
})();
