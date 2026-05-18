const ePub = require("epubjs").default || require("epubjs");
const mm = require("music-metadata");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { ipcRenderer } = require("electron");
const { webUtils } = require("electron");

console.log("JS funcionando 🚀");

// =======================
// VARIABLES GLOBALES
// =======================
let book;
let rendition;

let relaciones = [];
let cancionEscogida = null;
let isReady = false;
let fontSize = 100;
let currentCfi = null;
let currentWord = null;
let currentHref = null;
let currentSpineIndex = null;

let epubPath = path.join(__dirname, "libro", "Yumi.epub");
let currentProgressionEnCapitulo = 0;

// =======================
// ELEMENTOS DOM
// =======================
const dropZone = document.getElementById("dropZone");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const cfiInicio = document.getElementById("cfiInicio");
const cfiFinal = document.getElementById("cfiFinal");
const audioPlayer = new Audio();

// =======================
// LOADING
// =======================
function updateLoading(p, t) {
  document.getElementById("loadingBar").style.width = p + "%";
  document.getElementById("loadingText").textContent = t;
}

function finishLoading() {
  document.getElementById("loadingScreen").style.display = "none";
}

// =======================
// TOAST
// =======================
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const toastBody = document.getElementById("toastBody");
  if (!toast || !toastBody) return;

  toastBody.textContent = message;
  toast.className = "toast align-items-center border-0";

  if (type === "success") toast.classList.add("text-bg-success");
  else if (type === "error") toast.classList.add("text-bg-danger");
  else if (type === "warning") toast.classList.add("text-bg-warning");
  else toast.classList.add("text-bg-primary");

  new bootstrap.Toast(toast).show();
}

// =======================
// EPUB
// =======================
function initEpub(filePath) {
  if (book) book.destroy();

  dropZone.style.display = "none";
  document.getElementById("wrap-visor").style.display = "flex";

  requestAnimationFrame(() => {
    book = ePub(filePath);
    rendition = book.renderTo("visor", { width: "100%", height: "100%" });

    rendition.display();

    book.locations.generate(1000).then(() => {
      isReady = true;
      console.log("Locations listas ✔");
    });

    rendition.on("relocated", updateProgress);
    rendition.on("rendered", attachClickCfi);
  });
}

// =======================
// PROGRESO
// =======================
function updateProgress(location) {
  if (!location?.start) return;

  const spineItems = book.spine.spineItems;
  const totalItems = spineItems.length;
  const currentIndex = location.start.index ?? 0;
  const p = location.start.displayed;

  let progress = currentIndex / totalItems;

  if (p && p.total > 1) {
    // p.page - 1 para que empiece en 0
    progress += ((p.page - 1) / p.total) / totalItems;
  }

  const percent = Math.floor(progress * 100);
  progressText.value = `${percent}%`;
  progressBar.value = percent;
}

progressBar.addEventListener("input", (e) => {
  if (!book) return;
  const percent = Number(e.target.value) / 100;
  const spineItems = book.spine.spineItems;
  const targetIndex = Math.floor(percent * spineItems.length);
  const item = spineItems[Math.min(targetIndex, spineItems.length - 1)];
  if (item) rendition.display(item.href);
});

// =======================
// CFI — CLICK EN EPUB
// =======================
function attachClickCfi(section, contents) {
  const doc = contents.document;

  doc.addEventListener("click", (e) => {
    const selection = doc.getSelection();
    selection.removeAllRanges();

    const range = doc.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;

    let node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.textContent;
    let start = range.startOffset;
    let end = range.startOffset;

    while (start > 0 && /[\p{L}\p{N}]/u.test(text[start - 1])) start--;
    while (end < text.length && /[\p{L}\p{N}]/u.test(text[end])) end++;

    const wordRange = doc.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);

    const word = wordRange.toString();
    wordRange.collapse(true);

    const spineItem = book.spine.get(section.href);
    const cfi = new ePub.CFI(wordRange, spineItem.cfiBase).toString();

    // Progresión global aproximada sin depender de book.locations
    const totalSpine = book.spine.spineItems.length;
    const spineIndex = book.spine.spineItems.indexOf(spineItem);
    const body = doc.body;
    const totalChars = body.textContent.length;
    const rangeToStart = doc.createRange();
    rangeToStart.setStart(body, 0);
    rangeToStart.setEnd(node, start);
    const charsToStart = rangeToStart.toString().length;
    const progressionEnCap = totalChars > 0 ? charsToStart / totalChars : 0;
    currentProgressionEnCapitulo = (spineIndex + progressionEnCap) / totalSpine;

    console.log("spine:", spineIndex, "| progCap:", progressionEnCap, "| global:", currentProgressionEnCapitulo);

    currentCfi = cfi;
    currentWord = word;
    currentHref = section.href;
    currentSpineIndex = book.spine.spineItems.indexOf(spineItem);

    if (!cfiInicio.value) {
      setCfi(cfiInicio, cfi, word);
    } else if (!cfiFinal.value) {
      setCfi(cfiFinal, cfi, word);
    } else {
      document.getElementById("modalCfiPalabra").value = word;
      document.getElementById("modalCfiCfi").value = cfi;
      modalCfi.show();
    }
  });
}

// =======================
// SET / GO CFI
// =======================
function setCfi(input, cfi, word) {
  input.value = word;
  input.setAttribute("data-cfi", cfi);
  input.setAttribute("data-href", currentHref);
  input.setAttribute("data-spine-index", currentSpineIndex);
  input.setAttribute("data-progression-cap", currentProgressionEnCapitulo); // NUEVO

  const old = bootstrap.Tooltip.getInstance(input);
  if (old) old.dispose();

  input.setAttribute("data-bs-toggle", "tooltip");
  input.setAttribute("title", cfi);
  new bootstrap.Tooltip(input);
}

function goToCfi(cfi) {
  if (!cfi || typeof cfi !== "string") return;
  try { rendition.display(cfi); } catch (e) { console.error(e); }
}

// =======================
// MODALES CFI
// =======================
const modalCfi = new bootstrap.Modal(document.getElementById("modalCfi"));
const modalDescripcion = new bootstrap.Modal(document.getElementById("modalDescripcion"));

document.getElementById("btnCfiInicio").onclick = () => {
  setCfi(cfiInicio, currentCfi, currentWord);
  modalCfi.hide();
};

document.getElementById("btnCfiFin").onclick = () => {
  setCfi(cfiFinal, currentCfi, currentWord);
  modalCfi.hide();
};

document.getElementById("buscarCfiInicio").onclick = () => goToCfi(cfiInicio.dataset.cfi);
document.getElementById("buscarCfiFin").onclick = () => goToCfi(cfiFinal.dataset.cfi);

// =======================
// INIT APP
// =======================
async function init() {
  updateLoading(80, "Preparando UI...");
  await new Promise((r) => setTimeout(r, 800));

  updateLoading(100, "Listo ✔");
  setTimeout(finishLoading, 400);
}

init();

// =======================
// NAV
// =======================
document.getElementById("btn_prev").onclick = () => rendition?.prev();
document.getElementById("btn_next").onclick = () => rendition?.next();

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") rendition?.prev();
  if (e.key === "ArrowRight") rendition?.next();
});

// =======================
// FONT SIZE
// =======================
document.getElementById("btn_plus").onclick = () => {
  fontSize = Math.min(200, fontSize + 10);
  rendition.themes.fontSize(fontSize + "%");
};

document.getElementById("btn_minus").onclick = () => {
  fontSize = Math.max(60, fontSize - 10);
  rendition.themes.fontSize(fontSize + "%");
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

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (!file) return;

  const filePath = webUtils.getPathForFile(file);
  epubPath = filePath;
  console.log("EPUB:", filePath);
  initEpub(filePath);
});

// =======================
// MÚSICA — AÑADIR MP3
// =======================
document.getElementById("btnAddMusic").onclick = () => {
  document.getElementById("inputAudio").click();
};

document.getElementById("inputAudio").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const filePath = webUtils.getPathForFile(file);

  const { ipcRenderer } = require("electron");
  const userDataPath = await ipcRenderer.invoke("get-user-data-path");
  const audioDir = path.join(userDataPath, "audio");
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

  const dest = path.join(audioDir, path.basename(filePath));
  fs.copyFileSync(filePath, dest);

  const metadata = await mm.parseFile(dest);
  const title = metadata.common.name || path.basename(filePath);

  let img = "img/nota_musica_defecto.png";

  const pic = metadata.common.picture;

  if (pic?.length) {
    const p = pic[0];

    img = `data:${p.format};base64,${Buffer.from(p.data).toString("base64")}`;
  }

  const card = document.createElement("div");

  card.className = "media-box";

  card.innerHTML = `
    <img src="${img}" alt="${title}">
    <div class="media-text">${title}</div>
  `;

  // =======================
  // CLICK → SELECCIONAR
  // =======================
  card.addEventListener("click", () => {
    cancionEscogida = {
      path: dest,
      title,
      img,
    };

    const tarjetaPrincipal =
      document.getElementById("cancionEscogida");

    const tarjetaModal =
      document.getElementById("cancionEscogidaModal");

    // PRINCIPAL
    tarjetaPrincipal.querySelector("img").src = img;

    tarjetaPrincipal.querySelector(".media-text").textContent =
      title;

    tarjetaPrincipal.dataset.filepath = dest;

    // MODAL
    tarjetaModal.querySelector("img").src = img;

    tarjetaModal.querySelector(".media-text").textContent =
      title;

    tarjetaModal.dataset.filepath = dest;

    showToast(t("toastCancionSeleccionada"), "success");
  });

  // =======================
  // DOBLE CLICK → REPRODUCIR
  // =======================
  card.addEventListener("dblclick", (e) => {
    e.stopPropagation();

    audioPlayer.pause();

    audioPlayer.src = dest;

    audioPlayer.play().catch(console.error);
  });

  document.getElementById("musicContainer").prepend(card);

  e.target.value = "";
});

// Click en tarjeta central → reproducir
document.getElementById("cancionEscogida").addEventListener("click", () => {
  const fp = document.getElementById("cancionEscogida").dataset.filepath;
  if (!fp) return;
  audioPlayer.pause();
  audioPlayer.src = fp;
  audioPlayer.play().catch(console.error);
});

// =======================
// BUSCAR EN LIBRO
// =======================
const btnSearch = document.getElementById("btnSearch");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

btnSearch.addEventListener("click", async () => {
  const text = searchInput.value.trim();
  if (!text) return;

  searchResults.innerHTML = "Buscando...";

  const results = [];

  for (const item of book.spine.spineItems) {
    try {
      await item.load(book.load.bind(book));

      const doc = item.document;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

      let node;
      while ((node = walker.nextNode())) {
        const idx = node.textContent.toLowerCase().indexOf(text.toLowerCase());
        if (idx === -1) continue;

        // Crear rango para obtener el CFI
        const range = doc.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + text.length);

        const cfi = new ePub.CFI(range, item.cfiBase).toString();

        // Excerpt con contexto
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
      rendition.display(result.cfi);
      bootstrap.Modal.getInstance(document.getElementById("modalBuscar")).hide();
    });
    searchResults.appendChild(div);
  });
}

// =======================
// GUARDAR RELACIÓN
// =======================
// document.getElementById("btn_guardar").addEventListener("click", () => {
//   const inicioCfi = cfiInicio.dataset.cfi;
//   const finCfi = cfiFinal.dataset.cfi;
//   const cancion = document.getElementById("cancionEscogida").dataset.filepath;
//   const etiqueta = selectTarjetas.value;

//   if (!inicioCfi || !finCfi) {
//     showToast(t("toastDatos"), "error");
//     return;
//   }

//   if (!cancion || !etiqueta){
//     showToast(t("toastCancionEtiqueta"), "error");
//     return;
//   }

//   if (inicioCfi === finCfi) {
//     showToast(t("toastCfisIguales"), "warning");
//     return;
//   }

//   // Comparar con CFI directamente, más fiable que locationFromCfi
//   const cfiLib = new ePub.CFI();
//   const comparacion = cfiLib.compare(inicioCfi, finCfi);

//   // compare devuelve -1 si inicio < fin, 0 si iguales, 1 si inicio > fin
//   if (comparacion === 1) {
//     showToast(t("toastCfiPosterior"), "warning");
//     return;
//   }

//   document.getElementById("descripcionRelacion").value = "";
//   modalDescripcion.show();
// });

document.getElementById("btn_guardar").addEventListener("click", () => {
  const inicioCfi = cfiInicio.dataset.cfi;
  const finCfi = cfiFinal.dataset.cfi;

  // Validaciones comunes
  if (!inicioCfi || !finCfi) {
    showToast(t("toastDatos"), "error");
    return;
  }

  if (inicioCfi === finCfi) {
    showToast(t("toastCfisIguales"), "warning");
    return;
  }

  const cfiLib = new ePub.CFI();
  if (cfiLib.compare(inicioCfi, finCfi) === 1) {
    showToast(t("toastCfiPosterior"), "warning");
    return;
  }

  const indexTarjeta = selectTarjetas.value;

  // — CON ETIQUETA → guardar directo

  if (indexTarjeta !== "") {
    const tarjeta = tarjetasGuardadas[indexTarjeta];

    const relacion = {
      inicio: {
        palabra: cfiInicio.value,
        cfi: inicioCfi,
        href: cfiInicio.dataset.href,
        spineIndex: parseInt(cfiInicio.dataset.spineIndex),
        progressionEnCapitulo: parseFloat(cfiInicio.dataset.progressionCap) || 0,
      },
      fin: {
        palabra: cfiFinal.value,
        cfi: finCfi,
        href: cfiFinal.dataset.href,
        spineIndex: parseInt(cfiFinal.dataset.spineIndex),
        progressionEnCapitulo: parseFloat(cfiFinal.dataset.progressionCap) || 0, // NUEVO
      },
      cancion: tarjeta.cancion,
      img: tarjeta.img,     // ← añadir
      descripcion: tarjeta.nombre,
    };

    relaciones.push(relacion);
    crearTarjeta(relacion);
    limpiarAvance();
    showToast(t("toastRelacionTarjeta"), "success");

    // — SIN ETIQUETA → abrir modal descripción
  } else {
    const cancion = document.getElementById("cancionEscogida").dataset.filepath;
    if (!cancion) {
      showToast(t("toastDatos"), "error");
      return;
    }
    document.getElementById("descripcionRelacion").value = "";
    modalDescripcion.show();
  }
});

document.getElementById("descripcionRelacion").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btnConfirmarRelacion").click();
});

document.getElementById("btnConfirmarRelacion").addEventListener("click", () => {
  const descripcion = document.getElementById("descripcionRelacion").value.trim();

  const relacion = {
    inicio: {
      palabra: cfiInicio.value,
      cfi: cfiInicio.dataset.cfi,
      href: cfiInicio.dataset.href,
      spineIndex: parseInt(cfiInicio.dataset.spineIndex),
      progressionEnCapitulo: parseFloat(cfiInicio.dataset.progressionCap) || 0, // NUEVO
    },
    fin: {
      palabra: cfiFinal.value,
      cfi: cfiFinal.dataset.cfi,
      href: cfiFinal.dataset.href,
      spineIndex: parseInt(cfiFinal.dataset.spineIndex),
      progressionEnCapitulo: parseFloat(cfiFinal.dataset.progressionCap) || 0, // NUEVO
    },
    cancion: document.getElementById("cancionEscogida").dataset.filepath,
    img: document.getElementById("cancionEscogida").querySelector("img").src,
    descripcion,
  };

  relaciones.push(relacion);
  crearTarjeta(relacion);
  limpiarAvance();

  const modalEl = document.getElementById("modalDescripcion");
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.hide();

  showToast(t("toastSaved"), "success");
});

// =======================
// LIMPIAR CFIS
// =======================
function limpiarCfis() {
  cfiInicio.value = "";
  cfiInicio.removeAttribute("data-cfi");

  cfiFinal.value = "";
  cfiFinal.removeAttribute("data-cfi");

  [cfiInicio, cfiFinal].forEach((el) => {
    const t = bootstrap.Tooltip.getInstance(el);
    if (t) t.dispose();
  });
}
// =======================
// CREAR TARJETA RELACIÓN
// =======================
function crearTarjeta(relacion) {
  const imgSrc = relacion.img || "img/nota_musica_defecto.png"; // ← antes leía del DOM
  const container = document.querySelector(".media-rsound");

  const card = document.createElement("div");
  card.className = "tarjeta-cancion";
  card.dataset.cfiInicio = relacion.inicio.cfi;
  card.dataset.cfiFin = relacion.fin.cfi;

  card.innerHTML = `
    <img src="${imgSrc}" class="cover" />
    <div class="info">
      <h3>${relacion.descripcion || t("cardNoDesc")}</h3>
      <p class="rango">${relacion.inicio.palabra} → ${relacion.fin.palabra}</p>
    </div>
    <button class="btn-eliminar">${t("btnEliminar")}</button>
  `;

  card.addEventListener("click", () => rendition.display(relacion.inicio.cfi));

  card.querySelector(".btn-eliminar").addEventListener("click", (e) => {
    e.stopPropagation();
    const i = relaciones.indexOf(relacion);
    if (i !== -1) relaciones.splice(i, 1);
    card.remove();
    showToast(t("toastDeleted"), "warning");
  });

  container.prepend(card);
}

// =======================
// ELIMINAR AVANCE
// =======================
function limpiarAvance() {
  cfiInicio.value = "";
  cfiInicio.removeAttribute("data-cfi");

  cfiFinal.value = "";
  cfiFinal.removeAttribute("data-cfi");

  [cfiInicio, cfiFinal].forEach((el) => {
    const t = bootstrap.Tooltip.getInstance(el);
    if (t) t.dispose();
  });

  const tarjetaPrincipal = document.getElementById("cancionEscogida");
  const tarjetaModal = document.getElementById("cancionEscogidaModal");

  // PRINCIPAL
  tarjetaPrincipal.querySelector("img").src =
    "img/nota_musica_defecto.png";

  tarjetaPrincipal.querySelector(".media-text").textContent =
    "Selecciona Canción";

  tarjetaPrincipal.removeAttribute("data-filepath");

  // MODAL
  tarjetaModal.querySelector("img").src =
    "img/nota_musica_defecto.png";

  tarjetaModal.querySelector(".media-text").textContent =
    "Selecciona Canción";

  tarjetaModal.removeAttribute("data-filepath");

  // Estado lógico
  cancionEscogida = null;
}

document.getElementById("btn_eliminar_avance").onclick = () => {
  if (!confirm(t("toastConfirmarBorrar"))) return;

  limpiarAvance();

  audioPlayer.pause();
};

const btnAddTarjeta = document.getElementById("addTarjeta");
const modalTarjeta = new bootstrap.Modal(
  document.getElementById("modalTarjeta")
);

btnAddTarjeta.addEventListener("click", () => {
  // Comprobar si hay canción escogida
  if (!cancionEscogida) {
    showToast(t("toastPrimeroCancion"), "warning");
    return;
  }

  // Abrir modal
  modalTarjeta.show();
});

// =======================
// TARJETAS DEFINIDAS
// =======================
const selectTarjetas = document.getElementById("selectTarjetas");

const tarjetasGuardadas = [];

// =======================
// CREAR TARJETA
// =======================
document
  .getElementById("btnConfirmarTarjeta")
  .addEventListener("click", () => {

    const inputNombre = document.getElementById("nombreTarjeta");

    const nombre = inputNombre.value.trim();

    // VALIDACIÓN
    if (!nombre) {
      showToast(
        t("toastNombre"),
        "warning"
      );

      inputNombre.focus();

      return;
    }

    if (!cancionEscogida) {
      showToast(
        t("toastSeleccionaCancion"),
        "warning"
      );

      return;
    }

    // CREAR OBJETO TARJETA
    const tarjeta = {
      nombre,
      cancion: cancionEscogida.path,
      title: cancionEscogida.name,
      img: cancionEscogida.img,
    };

    tarjetasGuardadas.push(tarjeta);

    // OPTION DEL SELECT
    const option = document.createElement("option");

    option.value = tarjetasGuardadas.length - 1;

    option.textContent =
      `${nombre} — ${cancionEscogida.title}`;

    selectTarjetas.appendChild(option);

    // LIMPIAR
    inputNombre.value = "";

    modalTarjeta.hide();

    showToast(t("toastTarjetaCreada"), "success");
  });


// =======================
// EXPORTAR
// =======================

async function exportarSoundbook() {
  if (relaciones.length === 0) {
    showToast(t("toastNoRelaciones"), "warning");
    return;
  }

  const titulo = book.packaging.metadata.title || path.basename(epubPath, ".epub");
  const filePath = await ipcRenderer.invoke(
    "dialog-save",
    titulo + ".rsound"
  );

  if (!filePath) return;

  const cancionesUsadas = [...new Set(relaciones.map(r => r.cancion))];

  const totalSpine = book.spine.spineItems.length;

  const relacionesJson = relaciones.map(r => {
    // Progresión dentro del capítulo de inicio
    const globalInicio = book.locations.percentageFromCfi(r.inicio.cfi);
    const capIStart = r.inicio.spineIndex / totalSpine;
    const capIEnd = (r.inicio.spineIndex + 1) / totalSpine;
    const progCapInicio = (globalInicio - capIStart) / (capIEnd - capIStart);

    // Progresión dentro del capítulo de fin
    const globalFin = book.locations.percentageFromCfi(r.fin.cfi);
    const capFStart = r.fin.spineIndex / totalSpine;
    const capFEnd = (r.fin.spineIndex + 1) / totalSpine;
    const progCapFin = (globalFin - capFStart) / (capFEnd - capFStart);

    return {
      descripcion: r.descripcion,
      href_inicio: r.inicio.href,
      href_fin: r.fin.href,
      spine_inicio: r.inicio.spineIndex,
      spine_fin: r.fin.spineIndex,
      palabra_inicio: r.inicio.palabra,
      palabra_fin: r.fin.palabra,
      audio: "audio/" + path.basename(r.cancion),
      progression_cap_inicio: r.inicio.progressionEnCapitulo ?? 0,
      progression_cap_fin: r.fin.progressionEnCapitulo ?? 1,
    };
  });


  const manifest = {
    version: 1,
    epub: "libro/" + path.basename(epubPath),
    autor: book.packaging.metadata.creator || "",
    createdAt: new Date().toISOString()
  };

  const output = fs.createWriteStream(filePath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    showToast(`${t("toastExportado")}: ${path.basename(filePath)} (${(archive.pointer() / 1024 / 1024).toFixed(1)} MB)`, "success");
  });

  archive.on("error", (err) => {
    showToast(t("toastErrorExportar"), "error");
  });

  archive.pipe(output);
  archive.file(epubPath, { name: "libro/" + path.basename(epubPath) });

  for (const cancionPath of cancionesUsadas) {
    archive.file(cancionPath, { name: "audio/" + path.basename(cancionPath) });
  }

  archive.append(JSON.stringify(relacionesJson, null, 2), { name: "relaciones.json" });
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  await archive.finalize();
}

document.getElementById("btn_exportar").onclick = exportarSoundbook;
