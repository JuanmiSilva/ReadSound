document.addEventListener("DOMContentLoaded", () => {

  const ePub = require("epubjs").default || require("epubjs");

  const cfiInicio = document.getElementById("cfiInicio");
  const cfiFinal = document.getElementById("cfiFinal");
  const selectTarjetas = document.getElementById("selectTarjetas");
  const modalDescripcion = new bootstrap.Modal(document.getElementById("modalDescripcion"));

  // =======================
  // GUARDAR RELACIÓN
  // =======================
  document.getElementById("btn_guardar").addEventListener("click", () => {
    const inicioCfi = cfiInicio.dataset.cfi;
    const finCfi = cfiFinal.dataset.cfi;

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

    if (indexTarjeta !== "") {
      // Con tarjeta definida → guardar directo
      const tarjeta = state.tarjetasGuardadas[indexTarjeta];
      const relacion = _construirRelacion({
        cancion: tarjeta.cancion,
        img: tarjeta.img,
        descripcion: tarjeta.nombre,
      });

      state.relaciones.push(relacion);
      crearTarjeta(relacion);
      limpiarAvance();
      showToast(t("toastRelacionTarjeta"), "success");
    } else {
      // Sin tarjeta → pedir descripción
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
    const cancion = document.getElementById("cancionEscogida").dataset.filepath;
    const img = document.getElementById("cancionEscogida").querySelector("img").src;

    const relacion = _construirRelacion({ cancion, img, descripcion });

    state.relaciones.push(relacion);
    crearTarjeta(relacion);
    limpiarAvance();

    const modalEl = document.getElementById("modalDescripcion");
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();

    showToast(t("toastSaved"), "success");
  });

  // =======================
  // HELPER CONSTRUIR RELACIÓN
  // =======================
  function _construirRelacion({ cancion, img, descripcion }) {
    return {
      inicio: {
        palabra: cfiInicio.value,
        cfi: cfiInicio.dataset.cfi,
        href: cfiInicio.dataset.href,
        spineIndex: parseInt(cfiInicio.dataset.spineIndex),
        progressionEnCapitulo: parseFloat(cfiInicio.dataset.progressionCap) || 0,
      },
      fin: {
        palabra: cfiFinal.value,
        cfi: cfiFinal.dataset.cfi,
        href: cfiFinal.dataset.href,
        spineIndex: parseInt(cfiFinal.dataset.spineIndex),
        progressionEnCapitulo: parseFloat(cfiFinal.dataset.progressionCap) || 0,
      },
      cancion,
      img,
      descripcion,
    };
  }

  // =======================
  // CREAR TARJETA RELACIÓN
  // =======================
  function crearTarjeta(relacion) {
    const imgSrc = relacion.img || "img/nota_musica_defecto.png";
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

    card.addEventListener("click", () => state.rendition.display(relacion.inicio.cfi));

    card.querySelector(".btn-eliminar").addEventListener("click", (e) => {
      e.stopPropagation();
      const i = state.relaciones.indexOf(relacion);
      if (i !== -1) state.relaciones.splice(i, 1);
      card.remove();
      showToast(t("toastDeleted"), "warning");
    });

    container.prepend(card);
  }

  // =======================
  // LIMPIAR AVANCE
  // =======================
  function limpiarAvance() {
    [cfiInicio, cfiFinal].forEach((el) => {
      el.value = "";
      el.removeAttribute("data-cfi");
      const tooltip = bootstrap.Tooltip.getInstance(el);
      if (tooltip) tooltip.dispose();
    });

    ["cancionEscogida", "cancionEscogidaModal"].forEach((id) => {
      const el = document.getElementById(id);
      el.querySelector("img").src = "img/nota_musica_defecto.png";
      el.querySelector(".media-text").textContent = "Selecciona Canción";
      el.removeAttribute("data-filepath");
    });

    state.cancionEscogida = null;
  }

  document.getElementById("btn_eliminar_avance").onclick = () => {
    if (!confirm(t("toastConfirmarBorrar"))) return;
    limpiarAvance();
    audioPlayer.pause();
  };

});
