const API = "/api";
let token = localStorage.getItem("codevault_token");
let currentUser = null;
let codes = [];
let authMode = "login";

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

async function api(path, options = {}) {
  const response = await fetch(API + path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }
  return data;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function setAuthMode(mode) {
  authMode = mode;
  const register = mode === "register";

  $("loginTab").classList.toggle("active", !register);
  $("registerTab").classList.toggle("active", register);
  $("nameField").classList.toggle("hidden", !register);
  $("authTitle").textContent = register ? "Create your CodeVault account" : "Welcome back";
  $("authSubtitle").textContent = register
    ? "Create an account to securely store your coding projects."
    : "Login to access your personal code library.";
  $("authSubmit").textContent = register ? "Create Account" : "Login";
  $("authName").required = register;
  $("authMessage").textContent = "";
}

function showApp() {
  $("authSection").classList.add("hidden");
  $("appSection").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("userName").textContent = currentUser ? `Hi, ${currentUser.name}` : "";
}

function showAuth() {
  $("authSection").classList.remove("hidden");
  $("appSection").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("userName").textContent = "";
}

async function loadCodes() {
  codes = await api("/codes", { headers: headers() });
  renderCodes();
}

function formatLanguage(language) {
  return {
    python:"Python", javascript:"JavaScript", java:"Java",
    cpp:"C++", c:"C", html:"HTML", css:"CSS", other:"Other"
  }[language] || "Other";
}

function renderCodes() {
  const search = $("searchInput").value.toLowerCase().trim();
  const language = $("filterLanguage").value;

  const filtered = codes.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(search) ||
      item.language.toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search) ||
      item.code.toLowerCase().includes(search);

    return matchesSearch && (language === "all" || item.language === language);
  });

  $("codeList").innerHTML = filtered.map(item => `
    <article class="code-card">
      <div class="card-top">
        <div class="card-title-row">
          <div>
            <h3 class="card-title">${escapeHTML(item.title)}</h3>
            <span class="language">${escapeHTML(formatLanguage(item.language))}</span>
          </div>
          ${item.category ? `<span class="language">${escapeHTML(item.category)}</span>` : ""}
        </div>
        ${item.description ? `<p class="card-description">${escapeHTML(item.description)}</p>` : ""}
      </div>
      <pre class="card-code"><code>${escapeHTML(item.code)}</code></pre>
      <div class="card-actions">
        <button class="action-btn" onclick="copyCode('${item._id}')">📋 Copy</button>
        <button class="action-btn" onclick="editCode('${item._id}')">✏️ Edit</button>
        <button class="action-btn" onclick="deleteCode('${item._id}')">🗑️ Delete</button>
      </div>
    </article>
  `).join("");

  $("emptyState").classList.toggle("show", filtered.length === 0);
  $("codeList").style.display = filtered.length ? "grid" : "none";

  $("totalCodes").textContent = codes.length;
  $("totalLanguages").textContent = new Set(codes.map(x => x.language)).size;

  if (codes.length) {
    $("lastAdded").textContent = new Date(codes[0].createdAt).toLocaleDateString();
  } else {
    $("lastAdded").textContent = "—";
  }
}

function openModal(code = null) {
  $("modal").classList.remove("hidden");
  if (code) {
    $("modalTitle").textContent = "Edit Code";
    $("codeId").value = code._id;
    $("title").value = code.title;
    $("language").value = code.language;
    $("category").value = code.category || "";
    $("description").value = code.description || "";
    $("code").value = code.code;
  } else {
    $("modalTitle").textContent = "Add New Code";
    $("codeForm").reset();
    $("codeId").value = "";
    $("language").value = "python";
  }
  $("title").focus();
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("codeForm").reset();
  $("codeId").value = "";
}

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("authMessage").textContent = "";

  try {
    const payload = authMode === "register"
      ? {
          name: $("authName").value.trim(),
          email: $("authEmail").value.trim(),
          password: $("authPassword").value
        }
      : {
          email: $("authEmail").value.trim(),
          password: $("authPassword").value
        };

    const data = await api(authMode === "register" ? "/auth/register" : "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    token = data.token;
    currentUser = data.user;
    localStorage.setItem("codevault_token", token);

    $("authForm").reset();
    showApp();
    await loadCodes();
    showToast(authMode === "register" ? "Account created!" : "Logged in!");
  } catch (error) {
    $("authMessage").textContent = error.message;
  }
});

$("loginTab").addEventListener("click", () => setAuthMode("login"));
$("registerTab").addEventListener("click", () => setAuthMode("register"));

$("logoutBtn").addEventListener("click", () => {
  token = null;
  currentUser = null;
  codes = [];
  localStorage.removeItem("codevault_token");
  showAuth();
  setAuthMode("login");
  showToast("Logged out.");
});

$("codeForm").addEventListener("submit", async e => {
  e.preventDefault();

  const id = $("codeId").value;
  const payload = {
    title: $("title").value.trim(),
    language: $("language").value,
    category: $("category").value.trim(),
    description: $("description").value.trim(),
    code: $("code").value
  };

  try {
    if (id) {
      await api(`/codes/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(payload)
      });
      showToast("Code updated!");
    } else {
      await api("/codes", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload)
      });
      showToast("Code saved!");
    }

    closeModal();
    await loadCodes();
  } catch (error) {
    showToast(error.message);
  }
});

window.editCode = id => {
  const code = codes.find(x => x._id === id);
  if (code) openModal(code);
};

window.deleteCode = async id => {
  const code = codes.find(x => x._id === id);
  if (!code || !confirm(`Delete "${code.title}"?`)) return;

  try {
    await api(`/codes/${id}`, {
      method: "DELETE",
      headers: headers()
    });
    await loadCodes();
    showToast("Code deleted.");
  } catch (error) {
    showToast(error.message);
  }
};

window.copyCode = async id => {
  const code = codes.find(x => x._id === id);
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code.code);
    showToast("Code copied!");
  } catch {
    showToast("Could not copy the code.");
  }
};

$("newCodeBtn").addEventListener("click", () => openModal());
$("emptyAddBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("searchInput").addEventListener("input", renderCodes);
$("filterLanguage").addEventListener("change", renderCodes);

$("modal").addEventListener("click", e => {
  if (e.target === $("modal")) closeModal();
});

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  localStorage.setItem("codevault_theme", dark ? "dark" : "light");
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
});

async function startApp() {
  if (localStorage.getItem("codevault_theme") === "dark") {
    document.body.classList.add("dark");
    $("themeBtn").textContent = "☀️";
  }

  if (!token) {
    showAuth();
    return;
  }

  try {
    currentUser = await api("/auth/me", { headers: headers() });
    showApp();
    await loadCodes();
  } catch {
    localStorage.removeItem("codevault_token");
    token = null;
    showAuth();
  }
}

startApp();
