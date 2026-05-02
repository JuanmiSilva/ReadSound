const ePub = require("epubjs").default || require("epubjs");
const mm = require("music-metadata");
const fs = require("fs");
const path = require("path");
const { webUtils } = require("electron");
const relaciones = []
let cancionEscogida;

console.log("JS funcionando 🚀");

// =======================
// TOOLTIP
// =======================
window.addEventListener("DOMContentLoaded", () => {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );

  tooltipTriggerList.forEach((el) => new bootstrap.Tooltip(el));
});

// =======================
// EPUB
// =======================
const epubPath = path.join(__dirname, "libro", "Yumi.epub");

const book = ePub(epubPath);

const rendition = book.renderTo("visor", {
  width: "100%",
  height: "100%",
});

// =======================
// NAV
// =======================
document
  .getElementById("btn_prev")
  .addEventListener("click", () => rendition.prev());

document
  .getElementById("btn_next")
  .addEventListener("click", () => rendition.next());

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") rendition.prev();
  if (e.key === "ArrowRight") rendition.next();
});

// =======================
// FONT SIZE
// =======================
let fontSize = 100;

// =======================
// EPUB INIT
// =======================
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

let isReady = false;

async function generateLocations() {
  await book.locations.generate(1000);
}

async function updateProgress(location) {

  if (!location || !location.start) return;

  // porcentaje
  const progress = book.locations.percentageFromCfi(location.start.cfi);

  const percent = Math.floor(progress * 100);

  progressBar.value = percent;

  // PAGINAS VISUALES REALES
  const currentPage = location.start.displayed.page;
  const totalPages = location.start.displayed.total;

  progressText.value = `Página ${currentPage} / ${totalPages - 1}`;
}

async function init() {

  updateLoading(10, "Cargando EPUB...");

  await book.ready;

  updateLoading(30, "Renderizando libro...");

  await rendition.display();

  updateLoading(60, "Generando páginas...");

  await generateLocations();

  updateLoading(90, "Preparando interfaz...");

  isReady = true;

  rendition.on("relocated", async (location) => {
    await updateProgress(location);
  });

  progressBar.addEventListener("input", async (e) => {

    if (!isReady) return;

    const value = Number(e.target.value);

    const cfi =
      book.locations.cfiFromPercentage(
        value / 100
      );

    if (cfi) {
      rendition.display(cfi);
    }
  });

  updateLoading(100, "Completado ✔");

  setTimeout(() => {
    finishLoading();
  }, 500);
}

init();

// =======================
// BOTONES TAMAÑO FUENTE
// =======================
document
  .getElementById("btn_plus")
  .addEventListener("click", async () => {
    if (fontSize < 200) {
      fontSize += 10;

      rendition.themes.fontSize(fontSize + "%");

      // recalcular páginas
      await generateLocations();

      // actualizar texto
      const currentLocation = rendition.currentLocation();

      if (currentLocation) {
        await updateProgress(currentLocation);
      }
    }
  });

document
  .getElementById("btn_minus")
  .addEventListener("click", async () => {
    if (fontSize > 60) {
      fontSize -= 10;

      rendition.themes.fontSize(fontSize + "%");

      // recalcular páginas
      await generateLocations();

      // actualizar texto
      const currentLocation = rendition.currentLocation();

      if (currentLocation) {
        await updateProgress(currentLocation);
      }
    }
  });

// =======================
// MÚSICA
// =======================
const audioPlayer = new Audio();

const btn = document.getElementById("btnAddMusic");
const input = document.getElementById("inputAudio");
const container = document.getElementById("musicContainer");

btn.addEventListener("click", () => input.click());

// =======================
// AÑADIR MP3
// =======================
// =======================
// AÑADIR MP3
// =======================
input.addEventListener("change", async (e) => {

  const file = e.target.files[0];

  if (!file) return;

  console.log("file:", file);

  // Ruta ORIGINAL del archivo del usuario
  const filePath = webUtils.getPathForFile(file);

  console.log("filePath:", filePath);

  if (!filePath) {
    console.error("No se pudo obtener la ruta");
    return;
  }

  try {

    // =======================
    // CARPETA AUDIO INTERNA
    // =======================
    const audioFolder = path.join(__dirname, "audio");

    // crear carpeta si no existe
    if (!fs.existsSync(audioFolder)) {
      fs.mkdirSync(audioFolder, { recursive: true });
    }

    // nombre archivo
    const fileName = path.basename(filePath);

    // ruta destino dentro de la app
    const destino = path.join(audioFolder, fileName);

    // copiar MP3 a /audio
    fs.copyFileSync(filePath, destino);

    console.log("MP3 copiado a:", destino);

    // ruta RELATIVA que guardaremos
    const relativePath = "audio/" + fileName;

    // =======================
    // LEER METADATOS
    // =======================
    const metadata = await mm.parseFile(destino);

    const title = metadata.common.title || fileName;

    // =======================
    // IMAGEN POR DEFECTO
    // =======================
    let imageSrc = "img/nota_musica_defecto.png";

    // =======================
    // PORTADA MP3
    // =======================
    const picture = metadata.common.picture;

    if (picture && picture.length > 0) {

      const img = picture[0];

      const base64 =
        Buffer.from(img.data).toString("base64");

      const mime =
        img.format || "image/jpeg";

      imageSrc = `data:${mime};base64,${base64}`;
    }

    // =======================
    // CREAR TARJETA
    // =======================
    const card = document.createElement("div");

    card.classList.add("media-box");

    card.setAttribute(
      "data-bs-toggle",
      "tooltip"
    );

    card.setAttribute("title", title);

    // 🔥 GUARDAMOS RUTA RELATIVA
    card.dataset.filepath = relativePath;

    card.innerHTML = `
      <img src="${imageSrc}" alt="${title}">

      <div class="media-text">
        ${title}
      </div>
    `;

    // =======================
    // TOOLTIP
    // =======================
    new bootstrap.Tooltip(card);

    // =======================
    // DobleClick → reproducir
    // =======================
    card.addEventListener("dblclick", () => {

      const fullPath = path.join(
        __dirname,
        relativePath
      );

      const fileUrl =
        "file:///" +
        fullPath.replace(/\\/g, "/");

      audioPlayer.pause();

      audioPlayer.src = fileUrl;

      audioPlayer.load();

      audioPlayer
        .play()
        .then(() =>
          console.log("Reproduciendo ✅")
        )
        .catch((err) =>
          console.error(err)
        );
    });

    // =======================
    // CLICK → seleccionar
    // =======================
    card.addEventListener("click", () => {

      cancionEscogida =
        document.getElementById(
          "cancionEscogida"
        );

      cancionEscogida
        .querySelector("img")
        .src = imageSrc;

      cancionEscogida
        .querySelector(".media-text")
        .textContent = title;

      // 🔥 GUARDAMOS RUTA RELATIVA
      cancionEscogida.setAttribute(
        "data-filepath",
        relativePath
      );

      const tooltip =
        bootstrap.Tooltip.getInstance(
          cancionEscogida
        );

      if (tooltip) tooltip.dispose();

      cancionEscogida.setAttribute(
        "title",
        title
      );

      new bootstrap.Tooltip(
        cancionEscogida
      );

      console.log(
        "Canción seleccionada ✔"
      );
    });

    // añadir arriba
    container.prepend(card);

    console.log(
      "Canción añadida correctamente ✔"
    );

  } catch (err) {

    console.error(
      "Error leyendo MP3:",
      err
    );
  }

  // reset input
  input.value = "";
});

// =======================
// TEST CARD
// =======================
function testCard() {
  const card = document.createElement("div");

  card.classList.add("media-box");

  card.innerHTML = `
    <img src="img/nota_musica_defecto.png">
    <div class="media-text">TEST</div>
  `;

  container.prepend(card);
}

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

      const matches = item.find(text);

      matches.forEach((match) => {
        results.push(match);
      });

      item.unload();
    } catch (err) {
      console.error(err);
    }
  }

  renderResults(results);
});

// =======================
// RENDER RESULTADOS
// =======================
function renderResults(results) {
  searchResults.innerHTML = "";

  if (results.length === 0) {
    searchResults.innerHTML = `
      <div class="search-item">
        No se encontraron resultados
      </div>
    `;

    return;
  }

  results.forEach((result) => {
    const div = document.createElement("div");

    div.classList.add("search-item");

    div.innerHTML = `
      ${result.excerpt}
    `;

    div.addEventListener("click", () => {
      rendition.display(result.cfi);

      // cerrar modal
      const modalEl =
        document.getElementById("modalBuscar");

      const modal =
        bootstrap.Modal.getInstance(modalEl);

      modal.hide();
    });

    searchResults.appendChild(div);
  });
}

// TOCAR EN EL EPUB PARA GUARDAR EL CFI
const cfiInicio = document.getElementById("cfiInicio");
const cfiFinal = document.getElementById("cfiFinal");

// Parte del modal
const modalCfi = new bootstrap.Modal(
  document.getElementById("modalCfi")
);

let currentCfi = null;
let currentWord = null;

const inputPalabra = document.getElementById("modalCfiPalabra");
const inputCfi = document.getElementById("modalCfiCfi");
// BOTONES DEL MODAL CFI
const btnCfiInicio = document.getElementById("btnCfiInicio")
const btnCfiFin = document.getElementById("btnCfiFin")

rendition.on("rendered", (section, contents) => {

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

    while (start > 0 && /[\p{L}\p{N}]/u.test(text[start - 1])) {
      start--;
    }

    while (end < text.length && /[\p{L}\p{N}]/u.test(text[end])) {
      end++;
    }

    const wordRange = doc.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);

    const word = wordRange.toString();

    wordRange.collapse(true);

    // Obtener cfiBase desde el spine
    const spineItem = book.spine.get(section.href);
    console.log("spineItem.cfiBase:", spineItem?.cfiBase);

    const cfi = new ePub.CFI(wordRange, spineItem.cfiBase).toString();

    console.log("Palabra:", word);
    console.log("CFI:", cfi);

    currentCfi = cfi;
    currentWord = word;

    if (!cfiInicio.value) {
      setCfi(cfiInicio, cfi, word);

    } else if (!cfiFinal.value) {
      setCfi(cfiFinal, cfi, word);

    } else {
      inputPalabra.value = word;
      inputCfi.value = cfi;
      modalCfi.show();
    }

    localStorage.setItem("lastWordCfi", cfi);
  });

});

// FUNCIONES BOTONES MODAL CFI
btnCfiInicio.addEventListener("click", () => {
  setCfi(cfiInicio, currentCfi, currentWord);
  modalCfi.hide();
});

btnCfiFin.addEventListener("click", () => {
  setCfi(cfiFinal, currentCfi, currentWord);
  modalCfi.hide();
});

// FUNCIÓN PPARA ESCRIBIR EL CFI
function setCfi(input, cfi, word) {

  input.value = word;

  // guardamos palabra en atributo
  input.setAttribute("data-cfi", cfi);

  // destruye tooltip anterior si existe
  const oldTooltip = bootstrap.Tooltip.getInstance(input);

  if (oldTooltip) {
    oldTooltip.dispose();
  }

  // crear nuevo tooltip
  input.setAttribute("data-bs-toggle", "tooltip");
  input.setAttribute("title", cfi);

  new bootstrap.Tooltip(input);
}

//FUNCION BUSCAR CFI
function goToCfi(cfi) {
  console.log("Inicio CFI:", cfiInicio.dataset.cfi);
  console.log("Fin CFI:", cfiFinal.dataset.cfi);
  if (!cfi || typeof cfi !== "string") {
    console.warn("CFI inválido:", cfi);
    return;
  }

  try {
    rendition.display(cfi);
  } catch (err) {
    console.error("Error al ir al CFI:", err);
  }
}

// FUNCIONES BOTONES INPUTS DE CFI
const buscarCfiInicio = document.getElementById("buscarCfiInicio");
const buscarCfiFin = document.getElementById("buscarCfiFin");

buscarCfiInicio.addEventListener("click", () => {
  goToCfi(cfiInicio.dataset.cfi)
})

buscarCfiFin.addEventListener("click", () => {
  goToCfi(cfiFinal.dataset.cfi)
})

// =======================
// BOTÓN ELIMINAR
// =======================
document.getElementById("btn_eliminar_avance").addEventListener("click", () => {

  // Preguntamos para confirmar
  if (!confirm("¿Quieres olvidar los cfis y la cancion?")) {
    return;
  }

  // Limpiar inputs CFI
  cfiInicio.value = "";
  cfiInicio.removeAttribute("data-cfi");

  cfiFinal.value = "";
  cfiFinal.removeAttribute("data-cfi");

  // Destruir tooltips de los inputs
  const tooltipInicio = bootstrap.Tooltip.getInstance(cfiInicio);
  if (tooltipInicio) tooltipInicio.dispose();

  const tooltipFinal = bootstrap.Tooltip.getInstance(cfiFinal);
  if (tooltipFinal) tooltipFinal.dispose();

  // Resetear tarjeta cancionEscogida
  const cancionEscogida = document.getElementById("cancionEscogida");

  cancionEscogida.querySelector("img").src = "img/nota_musica_defecto.png";
  cancionEscogida.querySelector(".media-text").textContent = "Selecciona Canción";

  const tooltipCancion = bootstrap.Tooltip.getInstance(cancionEscogida);
  if (tooltipCancion) tooltipCancion.dispose();

  cancionEscogida.removeAttribute("title");
  cancionEscogida.removeAttribute("data-filepath");
  audioPlayer.pause();
});

// =======================
// TARJETA CANCION ESCOGIDA
// =======================
document.getElementById("cancionEscogida").addEventListener("click", () => {
  const cancionEscogida = document.getElementById("cancionEscogida");
  const fileUrl = cancionEscogida.dataset.filepath;

  if (!fileUrl) return; // sin canción, no hace nada

  audioPlayer.pause();
  audioPlayer.src = fileUrl;
  audioPlayer.load();
  audioPlayer
    .play()
    .then(() => console.log("Reproduciendo desde tarjeta central ✅"))
    .catch((err) => console.error(err));
});


function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const toastBody = document.getElementById("toastBody");

  if (!toast || !toastBody) {
    console.warn("Toast no encontrado en el DOM");
    return;
  }

  toastBody.textContent = message;

  // reset clases
  toast.className = "toast align-items-center text-bg-primary border-0";

  if (type === "success") toast.classList.add("text-bg-success");
  if (type === "error") toast.classList.add("text-bg-danger");
  if (type === "warning") toast.classList.add("text-bg-warning");

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

function crearTarjeta(relacion) {

  const image = cancionEscogida.querySelector("img").src;
  const container =
    document.querySelector(".media-rsound");

  const card = document.createElement("div");

  card.classList.add("tarjeta-cancion");

  // 🔥 DATASETS
  card.dataset.cfiInicio = relacion.inicio.cfi;
  card.dataset.cfiFin = relacion.fin.cfi;

  card.innerHTML = `
    <img 
      src="${image || "img/nota_musica_defecto.png"}" 
      class="cover" 
    />

    <div class="info">
      <h3>${relacion.descripcion || "Sin descripción"}</h3>

      <p class="rango">
        ${relacion.inicio.palabra}
        →
        ${relacion.fin.palabra}
      </p>
    </div>

    <button class="btn-eliminar">
      Eliminar
    </button>
  `;

  // =======================
  // CLICK TARJETA → ir al EPUB
  // =======================
  card.addEventListener("click", () => {

    rendition.display(relacion.inicio.cfi);

  });

  // =======================
  // BOTÓN ELIMINAR
  // =======================
  const btnEliminar =
    card.querySelector(".btn-eliminar");

  btnEliminar.addEventListener("click", (e) => {

    // evita que se active el click de la tarjeta
    e.stopPropagation();

    // eliminar del array
    const index = relaciones.indexOf(relacion);

    if (index !== -1) {
      relaciones.splice(index, 1);
    }

    // eliminar del DOM
    card.remove();

    showToast("Relación eliminada", "warning");
  });

  // 🔥 AÑADIR ARRIBA DEL TODO
  container.prepend(card);
}

// -----------------------------------
// GUARDAR
// -----------------------------------
const modalDescripcion = new bootstrap.Modal(document.getElementById("modalDescripcion"));

document.getElementById("btn_guardar").addEventListener("click", () => {

  const inicioCfi = cfiInicio.dataset.cfi;
  const finCfi = cfiFinal.dataset.cfi;
  const cancion = document.getElementById("cancionEscogida").dataset.filepath;

  // VALIDACIONES
  if (!inicioCfi || !finCfi || !cancion) {
    showToast("Faltan datos: inicio, fin o canción", "error");
    return;
  }

  if (inicioCfi === finCfi) {
    showToast("El inicio y el fin no pueden ser iguales", "warning");
    return;
  }

  const inicio = book.locations.locationFromCfi(inicioCfi);
  const fin = book.locations.locationFromCfi(finCfi);

  if (inicio === null || fin === null) {
    showToast("CFI inválido", "error");
    return;
  }

  if (fin < inicio) {
    showToast("El final no puede ser anterior al inicio", "warning");
    return;
  }

  // Todo ok → abrir modal
  modalDescripcion.show();
});

btnConfirmarRelacion.addEventListener("click", () => {

  const descripcion = document.getElementById("descripcionRelacion").value.trim();

  const relacion = {
    inicio: { palabra: cfiInicio.value, cfi: cfiInicio.dataset.cfi },
    fin: { palabra: cfiFinal.value, cfi: cfiFinal.dataset.cfi },
    cancion: document.getElementById("cancionEscogida").dataset.filepath,
    descripcion
  };

  relaciones.push(relacion);
  crearTarjeta(relacion);
  modalDescripcion.hide();
  showToast("Relación guardada ✔", "success");
});

// -------------------------------
// BOTON ENTER EN MODALES
// -------------------------------
document.getElementById("descripcionRelacion").addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnConfirmarRelacion.click();
});

// FUERA del click de btnSearch
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnSearch.click();
});

// -------------------------------
// BASE DE DATOS
// -------------------------------

const Database = require("better-sqlite3");

// Crear o abrir la BD
const db = new Database("database.db");

// Crear tablas
db.prepare(`
CREATE TABLE IF NOT EXISTS canciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archivo TEXT NOT NULL
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS relaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cfi_inicio TEXT,
    cfi_fin TEXT,
    cancion_id INTEGER
)
`).run();

console.log("Base de datos creada ✅");

module.exports = db;


// CARGA
function updateLoading(percent, text) {

  document.getElementById(
    "loadingBar"
  ).style.width = percent + "%";

  document.getElementById(
    "loadingText"
  ).textContent = text;
}

function finishLoading() {

  document.getElementById(
    "loadingScreen"
  ).style.display = "none";
}

