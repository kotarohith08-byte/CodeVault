const STORAGE_KEY = "codevault_codes";
const THEME_KEY = "codevault_theme";

let codes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const $ = (id) => document.getElementById(id);

const modal = $("modal");
const form = $("codeForm");
const codeList = $("codeList");
const emptyState = $("emptyState");
const searchInput = $("searchInput");
const filterLanguage = $("filterLanguage");

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function formatLanguage(language) {
  const names = {
    python: "Python",
    javascript: "JavaScript",
    java: "Java",
    cpp: "C++",
    c: "C",
    html: "HTML",
    css: "CSS",
    other: "Other"
  };
  return names[language] || "Other";
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function renderCodes() {
  const search = searchInput.value.toLowerCase().trim();
  const language = filterLanguage.value;

  const filtered = codes.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(search) ||
      item.language.toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search) ||
      item.code.toLowerCase().includes(search);

    const matchesLanguage =
      language === "all" || item.language === language;

    return matchesSearch && matchesLanguage;
  });

  codeList.innerHTML = "";

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "code-card";

    card.innerHTML = `
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
        <button class="action-btn" onclick="copyCode('${item.id}')">📋 Copy</button>
        <button class="action-btn" onclick="editCode('${item.id}')">✏️ Edit</button>
        <button class="action-btn" onclick="deleteCode('${item.id}')">🗑️ Delete</button>
      </div>
    `;

    codeList.appendChild(card);
  });

  if (filtered.length === 0) {
    emptyState.classList.add("show");
    codeList.style.display = "none";
  } else {
    emptyState.classList.remove("show");
    codeList.style.display = "grid";
  }

  updateStats();
}

function updateStats() {
  $("totalCodes").textContent = codes.length;

  const languages = new Set(codes.map(item => item.language));
  $("totalLanguages").textContent = languages.size;

  if (codes.length) {
    const newest = [...codes].sort((a, b) => b.createdAt - a.createdAt)[0];
    $("lastAdded").textContent = new Date(newest.createdAt).toLocaleDateString();
  } else {
    $("lastAdded").textContent = "—";
  }
}

function openModal(code = null) {
  modal.classList.remove("hidden");

  if (code) {
    $("modalTitle").textContent = "Edit Code";
    $("codeId").value = code.id;
    $("title").value = code.title;
    $("language").value = code.language;
    $("category").value = code.category || "";
    $("description").value = code.description || "";
    $("code").value = code.code;
  } else {
    $("modalTitle").textContent = "Add New Code";
    form.reset();
    $("codeId").value = "";
    $("language").value = "python";
  }

  $("title").focus();
}

function closeModal() {
  modal.classList.add("hidden");
  form.reset();
  $("codeId").value = "";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const id = $("codeId").value;

  const data = {
    title: $("title").value.trim(),
    language: $("language").value,
    category: $("category").value.trim(),
    description: $("description").value.trim(),
    code: $("code").value,
  };

  if (id) {
    const index = codes.findIndex(item => item.id === id);
    if (index !== -1) {
      codes[index] = {
        ...codes[index],
        ...data
      };
      showToast("Code updated successfully!");
    }
  } else {
    codes.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      ...data,
      createdAt: Date.now()
    });
    showToast("Code saved successfully!");
  }

  saveToStorage();
  renderCodes();
  closeModal();
});

window.editCode = function(id) {
  const code = codes.find(item => item.id === id);
  if (code) openModal(code);
};

window.deleteCode = function(id) {
  const code = codes.find(item => item.id === id);

  if (!code) return;

  if (confirm(`Delete "${code.title}"?`)) {
    codes = codes.filter(item => item.id !== id);
    saveToStorage();
    renderCodes();
    showToast("Code deleted.");
  }
};

window.copyCode = async function(id) {
  const code = codes.find(item => item.id === id);
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code.code);
    showToast("Code copied to clipboard!");
  } catch {
    showToast("Could not copy the code.");
  }
};

$("newCodeBtn").addEventListener("click", () => openModal());
$("emptyAddBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

searchInput.addEventListener("input", renderCodes);
filterLanguage.addEventListener("change", renderCodes);

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
});

if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
  $("themeBtn").textContent = "☀️";
}

renderCodes();
