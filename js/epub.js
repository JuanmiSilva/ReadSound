document.addEventListener("DOMContentLoaded", () => {

  const ePub = require("epubjs").default || require("epubjs");
  const path = require("path");
  const { webUtils } = require("electron");

  const dropZone = document.getElementById("dropZone");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");

  const inputEpub = document.createElement("input");
  inputEpub.type = "file";
  inputEpub.accept = ".epub";
  inputEpub.style.display = "none";
  document.body.appendChild(inputEpub);

  // Click en dropZone → abrir selector
  dropZone.addEventListener("click", () => inputEpub.click());

  // Archivo seleccionado
  inputEpub.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = webUtils.getPathForFile(file);
    epubPath.value = filePath;
    console.log("EPUB:", filePath);
    initEpub(filePath);
    e.target.value = "";
  });


  // =======================
  // INIT EPUB
  // =======================
  function initEpub(filePath) {
    if (state.book) state.book.destroy();

    dropZone.style.display = "none";
    document.getElementById("wrap-visor").style.display = "flex";

    requestAnimationFrame(() => {
      state.book = ePub(filePath);
      state.rendition = state.book.renderTo("visor", { width: "100%", height: "100%" });

      state.rendition.display();

      state.book.locations.generate(1000).then(() => {
        state.isReady = true;
        console.log("Locations listas ✔");
      });

      state.rendition.on("relocated", updateProgress);
      state.rendition.on("rendered", attachClickCfi);
    });
  }

  // =======================
  // PROGRESO
  // =======================
  function updateProgress(location) {
    if (!location?.start) return;

    const spineItems = state.book.spine.spineItems;
    const totalItems = spineItems.length;
    const currentIndex = location.start.index ?? 0;
    const p = location.start.displayed;

    let progress = currentIndex / totalItems;

    if (p && p.total > 1) {
      progress += ((p.page - 1) / p.total) / totalItems;
    }

    const percent = Math.floor(progress * 100);
    progressText.value = `${percent}%`;
    progressBar.value = percent;
  }

  progressBar.addEventListener("input", (e) => {
    if (!state.book) return;
    const percent = Number(e.target.value) / 100;
    const spineItems = state.book.spine.spineItems;
    const targetIndex = Math.floor(percent * spineItems.length);
    const item = spineItems[Math.min(targetIndex, spineItems.length - 1)];
    if (item) state.rendition.display(item.href);
  });

  // =======================
  // NAVEGACIÓN
  // =======================
  document.getElementById("btn_prev").onclick = () => state.rendition?.prev();
  document.getElementById("btn_next").onclick = () => state.rendition?.next();

  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") state.rendition?.prev();
    if (e.key === "ArrowRight") state.rendition?.next();
  });

  // =======================
  // TAMAÑO FUENTE
  // =======================
  document.getElementById("btn_plus").onclick = () => {
    state.fontSize = Math.min(200, state.fontSize + 10);
    state.rendition.themes.fontSize(state.fontSize + "%");
  };

  document.getElementById("btn_minus").onclick = () => {
    state.fontSize = Math.max(60, state.fontSize - 10);
    state.rendition.themes.fontSize(state.fontSize + "%");
  };

  // =======================
  // DROP EPUB
  // =======================
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("click", (e) => {
    if (e.target === inputEpub) return;
    inputEpub.click();
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    if (!file) return;

    // ← AÑADIR ESTO:
    if (!file.name.toLowerCase().endsWith(".epub")) {
      showToast("Solo se admiten archivos .epub", "error");
      return;
    }

    const filePath = webUtils.getPathForFile(file);
    epubPath.value = filePath;
    console.log("EPUB:", filePath);
    initEpub(filePath);
  });

  // =======================
  // CLICK EN DROPZONE ABRE EL SELECTOR
  // =======================
  dropZone.addEventListener("click", () => inputEpub.click());

  inputEpub.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = webUtils.getPathForFile(file);
    epubPath.value = filePath;
    console.log("EPUB:", filePath);
    initEpub(filePath);
    e.target.value = "";
  });

  // =======================
  // BÚSQUEDA EN LIBRO
  // =======================
  const btnSearch = document.getElementById("btnSearch");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");

  btnSearch.addEventListener("click", async () => {
    const text = searchInput.value.trim();
    if (!text) return;

    searchResults.innerHTML = "Buscando...";
    const results = [];

    for (const item of state.book.spine.spineItems) {
      try {
        await item.load(state.book.load.bind(state.book));

        const doc = item.document;
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

        let node;
        while ((node = walker.nextNode())) {
          const idx = node.textContent.toLowerCase().indexOf(text.toLowerCase());
          if (idx === -1) continue;

          const range = doc.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + text.length);

          const cfi = new ePub.CFI(range, item.cfiBase).toString();

          const excerpt = node.textContent.substring(
            Math.max(0, idx - 40),
            Math.min(node.textContent.length, idx + text.length + 40)
          );

          results.push({ cfi, excerpt });
        }

        item.unload();
      } catch (err) {
        console.error(err);
      }
    }

    renderResults(results);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnSearch.click();
  });

  function renderResults(results) {
    searchResults.innerHTML = "";

    if (!results.length) {
      searchResults.innerHTML = `<div class='search-item'>${t("toastNoResultados")}</div>`;
      return;
    }

    results.forEach((result) => {
      const div = document.createElement("div");
      div.className = "search-item";
      div.innerHTML = result.excerpt;
      div.addEventListener("click", () => {
        state.rendition.display(result.cfi);
        bootstrap.Modal.getInstance(document.getElementById("modalBuscar")).hide();
      });
      searchResults.appendChild(div);
    });
  }
});
