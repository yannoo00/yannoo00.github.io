// ── STATE ──────────────────────────────────────────────────
let easyMDE = null;
let currentPost = null; // { path, sha, filename }

// ── UI UTILS ───────────────────────────────────────────────
let toastTimer;
function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "";
  }, 3500);
}

function showScreen(id) {
  ["auth-screen", "list-screen", "editor-screen"].forEach((s) => {
    const el = document.getElementById(s);
    el.style.display =
      s === id ? (s === "auth-screen" ? "flex" : "block") : "none";
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(str) {
  return str
    .trim()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── AUTH ───────────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", async function () {
  const token = document.getElementById("token-input").value.trim();
  if (!token) {
    showToast("토큰을 입력하세요.", "error");
    return;
  }

  const btn = this;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    setToken(token);
    const user = await getUser();
    document.getElementById("user-name").textContent = user.login;
    showScreen("list-screen");
    const pendingEdit = sessionStorage.getItem("pending_edit");
    const pendingNew = sessionStorage.getItem("pending_new");
    if (pendingEdit) {
      sessionStorage.removeItem("pending_edit");
      openEditor({ path: pendingEdit, name: pendingEdit.split("/").pop() });
    } else if (pendingNew) {
      sessionStorage.removeItem("pending_new");
      openNewEditor();
    } else {
      loadPosts();
    }
  } catch (e) {
    clearToken();
    showToast("인증 실패: " + e.message, "error");
    btn.disabled = false;
    btn.textContent = "로그인";
  }
});

document.getElementById("token-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("login-btn").click();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  showScreen("auth-screen");
});

// ── POST LIST ──────────────────────────────────────────────
async function loadPosts() {
  const container = document.getElementById("post-list-container");
  container.innerHTML =
    '<div class="post-list"><div class="empty-state">불러오는 중...</div></div>';

  try {
    const files = await listPosts();
    const posts = files
      .filter((f) => f.name.endsWith(".md") && f.name !== ".placeholder")
      .sort((a, b) => b.name.localeCompare(a.name));

    if (!posts.length) {
      container.innerHTML =
        '<div class="post-list"><div class="empty-state">글이 없습니다. 새 글을 작성해보세요!</div></div>';
      return;
    }

    const ul = document.createElement("div");
    ul.className = "post-list";

    posts.forEach((post) => {
      const item = document.createElement("div");
      item.className = "post-item";

      const m = post.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      const date = m ? m[1] : "";
      const title = m ? m[2].replace(/-/g, " ") : post.name;

      item.innerHTML =
        '<div class="post-item-info">' +
        '<div class="post-item-title">' + escHtml(title) + "</div>" +
        '<div class="post-item-date">' + escHtml(date) + "</div>" +
        "</div>" +
        '<span class="post-item-arrow">›</span>';

      item.addEventListener("click", () => openEditor(post));
      ul.appendChild(item);
    });

    container.innerHTML = "";
    container.appendChild(ul);
  } catch (e) {
    container.innerHTML =
      '<div class="post-list"><div class="empty-state" style="color:#ef4444">오류: ' +
      escHtml(e.message) +
      "</div></div>";
  }
}

document.getElementById("new-post-btn").addEventListener("click", () => {
  currentPost = null;
  openNewEditor();
});

// ── EDITOR ─────────────────────────────────────────────────
function initEditor() {
  if (easyMDE) return;
  easyMDE = new EasyMDE({
    element: document.getElementById("md-editor"),
    spellChecker: false,
    autosave: { enabled: false },
    toolbar: [
      "bold", "italic", "heading", "|",
      "code", "quote", "|",
      "unordered-list", "ordered-list", "|",
      "link", "image", "|",
      "preview", "side-by-side", "fullscreen",
    ],
    minHeight: "450px",
  });
}

function openNewEditor() {
  initEditor();
  document.getElementById("fm-title").value = "";
  document.getElementById("fm-date").value = todayStr();
  document.getElementById("fm-categories").value = "";
  document.getElementById("fm-tags").value = "";
  document.getElementById("fm-excerpt").value = "";
  easyMDE.value("");

  document.getElementById("delete-btn").style.display = "none";
  document.getElementById("publish-btn").textContent = "발행하기";
  currentPost = null;
  showScreen("editor-screen");
}

async function openEditor(post) {
  initEditor();
  showScreen("editor-screen");

  const btn = document.getElementById("publish-btn");
  btn.disabled = true;
  btn.textContent = "불러오는 중...";

  try {
    const file = await getFile(post.path);
    const rawContent = decodeURIComponent(
      escape(atob(file.content.replace(/\n/g, ""))),
    );
    const { fm, body } = parseFrontMatter(rawContent);

    document.getElementById("fm-title").value = fm.title || "";
    document.getElementById("fm-date").value = fm.date || todayStr();
    document.getElementById("fm-categories").value = fm.categories || "";
    document.getElementById("fm-tags").value = fm.tags || "";
    document.getElementById("fm-excerpt").value = fm.excerpt || "";
    easyMDE.value(body);

    document.getElementById("delete-btn").style.display = "inline-flex";
    btn.textContent = "업데이트";
    currentPost = { path: post.path, sha: file.sha, filename: post.name };
  } catch (e) {
    showToast("글 불러오기 실패: " + e.message, "error");
    showScreen("list-screen");
  } finally {
    btn.disabled = false;
    if (!btn.textContent.includes("데이트") && !btn.textContent.includes("발행")) {
      btn.textContent = "발행하기";
    }
  }
}

document.getElementById("back-btn").addEventListener("click", () => {
  showScreen("list-screen");
});

document.getElementById("publish-btn").addEventListener("click", async function () {
  const title = document.getElementById("fm-title").value.trim();
  const date = document.getElementById("fm-date").value.trim();
  const cats = document.getElementById("fm-categories").value.trim();
  const tags = document.getElementById("fm-tags").value.trim();
  const excerpt = document.getElementById("fm-excerpt").value.trim();
  const body = easyMDE.value();

  if (!title) { showToast("제목을 입력하세요.", "error"); return; }
  if (!date) { showToast("날짜를 입력하세요.", "error"); return; }

  const fm = buildFrontMatter(title, date, cats, tags, excerpt);
  const content = fm + "\n" + body;
  const filename = currentPost
    ? currentPost.filename
    : date + "-" + slugify(title) + ".md";
  const path = POSTS_PATH + "/" + filename;
  const sha = currentPost ? currentPost.sha : undefined;
  const message = currentPost ? "Update: " + title : "Create: " + title;

  const btn = this;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> 발행 중...';

  try {
    const result = await saveFile(path, content, message, sha);
    if (result.content) {
      currentPost = {
        path: result.content.path,
        sha: result.content.sha,
        filename,
      };
    }
    showToast("발행되었습니다! GitHub Actions가 빌드를 시작합니다.", "success");
    btn.textContent = "업데이트";
  } catch (e) {
    showToast("발행 실패: " + e.message, "error");
    btn.textContent = currentPost ? "업데이트" : "발행하기";
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("delete-btn").addEventListener("click", async function () {
  if (!currentPost) return;
  if (!confirm('"' + currentPost.filename + '" 을 삭제하시겠습니까?')) return;

  const btn = this;
  btn.disabled = true;

  try {
    await deleteFile(currentPost.path, currentPost.sha, "Delete: " + currentPost.filename);
    showToast("삭제되었습니다.", "success");
    showScreen("list-screen");
    loadPosts();
  } catch (e) {
    showToast("삭제 실패: " + e.message, "error");
    btn.disabled = false;
  }
});

// ── INIT ───────────────────────────────────────────────────
(function init() {
  const token = getToken();
  const params = new URLSearchParams(location.search);
  const editPath = params.get("edit"); // e.g. "_posts/2026-03-07-title.md"
  const isNew = params.has("new");

  if (token) {
    showScreen("list-screen");
    getUser()
      .then((user) => {
        document.getElementById("user-name").textContent = user.login;
        if (editPath) {
          openEditor({ path: editPath, name: editPath.split("/").pop() });
        } else if (isNew) {
          openNewEditor();
        } else {
          loadPosts();
        }
      })
      .catch(() => {
        clearToken();
        showScreen("auth-screen");
      });
  } else {
    // 인증 후 처리할 액션을 기억해둠
    if (editPath) sessionStorage.setItem("pending_edit", editPath);
    if (isNew) sessionStorage.setItem("pending_new", "1");
    showScreen("auth-screen");
  }
})();
