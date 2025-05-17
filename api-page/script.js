document.addEventListener("DOMContentLoaded", async () => {
  const loadingScreen = document.getElementById("loadingScreen");
  const body = document.body;
  body.classList.add("no-scroll");

  try {
    const settings = await fetch("/src/settings.json").then((res) => res.json());

    const setContent = (id, property, value) => {
      const el = document.getElementById(id);
      if (el) el[property] = value;
    };

    setContent("page", "textContent", settings.name || "REST API UI");
    setContent("wm", "textContent", `© 2025 ${settings.apiSettings.creator || "Creator"}`);
    setContent("header", "textContent", settings.name || "");
    setContent("name", "textContent", settings.name || "");
    setContent("version", "textContent", settings.version || "");
    setContent("versionHeader", "textContent", settings.header?.status || "");
    setContent("description", "textContent", settings.description || "");

    const apiLinksContainer = document.getElementById("apiLinks");
    settings.links?.forEach(({ name, url }) => {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.textContent = name;
      a.className = "footer-link";
      apiLinksContainer?.appendChild(a);
    });

    const apiContent = document.getElementById("apiContent");
    settings.categories.forEach((category) => {
      const header = document.createElement("h3");
      header.className = "category-header";
      header.textContent = category.name;

      const grid = document.createElement("div");
      grid.className = "row g-3";

      const sortedItems = category.items.sort((a, b) => a.name.localeCompare(b.name));
      sortedItems.forEach((item) => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 api-item";
        col.dataset.name = item.name.toLowerCase();
        col.dataset.desc = item.desc.toLowerCase();

        col.innerHTML = `
          <div class="api-card">
            <div>
              <h5>${item.name}</h5>
              <p class="text-muted">${item.desc}</p>
            </div>
            <button class="btn btn-primary btn-sm get-api-btn" data-api-path="${item.path}" data-api-name="${item.name}" data-api-desc="${item.desc}">
              <i class="fas fa-bolt"></i> GET
            </button>
          </div>
        `;

        grid.appendChild(col);
      });

      apiContent.appendChild(header);
      apiContent.appendChild(grid);
    });

    // Search functionality
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearch");

    function filterApis() {
      const search = searchInput.value.toLowerCase();
      document.querySelectorAll(".api-item").forEach((el) => {
        const visible = el.dataset.name.includes(search) || el.dataset.desc.includes(search);
        el.style.display = visible ? "block" : "none";
      });
    }

    searchInput.addEventListener("input", filterApis);
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterApis();
    });

    // Modal and API request
    document.addEventListener("click", (e) => {
      const target = e.target.closest(".get-api-btn");
      if (!target) return;

      const modal = new bootstrap.Modal(document.getElementById("apiResponseModal"));
      const { apiPath, apiName, apiDesc } = target.dataset;

      const refs = {
        label: document.getElementById("apiResponseModalLabel"),
        desc: document.getElementById("apiResponseModalDesc"),
        content: document.getElementById("apiResponseContent"),
        endpoint: document.getElementById("apiEndpoint"),
        spinner: document.getElementById("apiResponseLoading"),
        inputContainer: document.getElementById("apiQueryInputContainer"),
        submitBtn: document.getElementById("submitQueryBtn"),
        responseWrapper: document.getElementById("responseContainer"),
      };

      refs.label.textContent = apiName;
      refs.desc.textContent = apiDesc;
      refs.content.textContent = "";
      refs.endpoint.textContent = "";
      refs.inputContainer.innerHTML = "";
      refs.spinner.classList.add("d-none");
      refs.responseWrapper.classList.add("d-none");
      refs.content.classList.add("d-none");
      refs.submitBtn.classList.add("d-none");
      refs.submitBtn.disabled = false;

      const baseUrl = `${window.location.origin}${apiPath}`;
      const query = apiPath.includes("?") ? apiPath.split("?")[1] : "";
      const params = new URLSearchParams(query);

      if ([...params].length > 0) {
        refs.submitBtn.classList.remove("d-none");

        const form = document.createElement("div");
        form.className = "param-container";

        for (const [key] of params.entries()) {
          const div = document.createElement("div");
          div.className = "mb-2";

          const input = document.createElement("input");
          input.className = "form-control";
          input.placeholder = `Enter ${key}`;
          input.dataset.param = key;
          div.appendChild(input);
          form.appendChild(div);

          input.addEventListener("input", () => {
            const allFilled = [...form.querySelectorAll("input")].every((i) => i.value.trim() !== "");
            refs.submitBtn.disabled = !allFilled;
          });
        }

        refs.inputContainer.appendChild(form);
        refs.submitBtn.disabled = true;

        refs.submitBtn.onclick = async () => {
          const inputs = refs.inputContainer.querySelectorAll("input");
          const newParams = new URLSearchParams();
          let valid = true;

          inputs.forEach((input) => {
            if (!input.value.trim()) {
              input.classList.add("is-invalid");
              valid = false;
            } else {
              input.classList.remove("is-invalid");
              newParams.append(input.dataset.param, input.value.trim());
            }
          });

          if (!valid) return;

          const fullUrl = `${baseUrl.split("?")[0]}?${newParams.toString()}`;
          sendApiRequest(fullUrl, refs);
        };
      } else {
        sendApiRequest(baseUrl, refs);
      }

      modal.show();
    });

    async function sendApiRequest(url, refs) {
      refs.spinner.classList.remove("d-none");
      refs.responseWrapper.classList.add("d-none");
      refs.content.classList.add("d-none");
      refs.content.textContent = "";

      try {
        const res = await fetch(url);
        refs.endpoint.textContent = url;

        if (!res.ok) throw new Error(`Status ${res.status}`);

        const type = res.headers.get("content-type");
        if (type && type.includes("application/json")) {
          const data = await res.json();
          refs.content.textContent = JSON.stringify(data, null, 2);
        } else {
          const text = await res.text();
          refs.content.textContent = text;
        }

        refs.responseWrapper.classList.remove("d-none");
        refs.content.classList.remove("d-none");
      } catch (err) {
        refs.content.textContent = `Error: ${err.message}`;
        refs.content.classList.remove("d-none");
      } finally {
        refs.spinner.classList.add("d-none");
      }
    }

    // Copy buttons
    document.getElementById("copyEndpoint")?.addEventListener("click", () => {
      const txt = document.getElementById("apiEndpoint")?.textContent;
      if (txt) navigator.clipboard.writeText(txt);
    });

    document.getElementById("copyResponse")?.addEventListener("click", () => {
      const txt = document.getElementById("apiResponseContent")?.textContent;
      if (txt) navigator.clipboard.writeText(txt);
    });

  } catch (err) {
    console.error("Error loading settings.json", err);
  } finally {
    setTimeout(() => {
      loadingScreen.style.display = "none";
      body.classList.remove("no-scroll");
    }, 1000);
  }
});

// Dark Mode Toggle
const themeToggleBtn = document.getElementById("themeToggleBtn");
const body = document.body;

function setDarkMode(isDark) {
  if (isDark) {
    body.classList.add("dark-mode");
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem("darkMode", "enabled");
  } else {
    body.classList.remove("dark-mode");
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem("darkMode", "disabled");
  }
}

// Check user preference on load
const darkModePref = localStorage.getItem("darkMode");
if (darkModePref === "enabled") {
  setDarkMode(true);
} else {
  setDarkMode(false);
}

// Toggle on button click
themeToggleBtn.addEventListener("click", () => {
  const isDark = body.classList.contains("dark-mode");
  setDarkMode(!isDark);
});
