document.addEventListener("DOMContentLoaded", () => {

  const mm = require("music-metadata");
  const fs = require("fs");
  const path = require("path");
  const { ipcRenderer } = require("electron");
  const { webUtils } = require("electron");

  const audioPlayer = new Audio();
  const selectTarjetas = document.getElementById("selectTarjetas");

  // =======================
  // AÑADIR MP3
  // =======================
  document.getElementById("btnAddMusic").onclick = () => {
    console.log("boton pulsado");
    document.getElementById("inputAudio").click();
  };

  document.getElementById("inputAudio").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const userDataPath = await ipcRenderer.invoke("get-user-data-path");
    const audioDir = path.join(userDataPath, "audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);

    for (const file of files) {
      const filePath = webUtils.getPathForFile(file);
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

      card.addEventListener("click", () => {
        state.cancionEscogida = { path: dest, title, img };
        _actualizarTarjetaCancion(img, title, dest);
        showToast(t("toastCancionSeleccionada"), "success");
      });

      card.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        audioPlayer.pause();
        audioPlayer.src = dest;
        audioPlayer.play().catch(console.error);
      });

      document.getElementById("musicContainer").prepend(card);
    }

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
  // HELPER ACTUALIZAR UI
  // =======================
  function _actualizarTarjetaCancion(img, title, filepath) {
    ["cancionEscogida", "cancionEscogidaModal"].forEach((id) => {
      const el = document.getElementById(id);
      el.querySelector("img").src = img;
      el.querySelector(".media-text").textContent = title;
      el.dataset.filepath = filepath;
    });
  }

  // =======================
  // TARJETAS DEFINIDAS
  // =======================
  const btnAddTarjeta = document.getElementById("addTarjeta");
  const modalTarjeta = new bootstrap.Modal(document.getElementById("modalTarjeta"));

  btnAddTarjeta.addEventListener("click", () => {
    if (!state.cancionEscogida) {
      showToast(t("toastPrimeroCancion"), "warning");
      return;
    }
    modalTarjeta.show();
  });

  document.getElementById("btnConfirmarTarjeta").addEventListener("click", () => {
    const inputNombre = document.getElementById("nombreTarjeta");
    const nombre = inputNombre.value.trim();

    if (!nombre) {
      showToast(t("toastNombre"), "warning");
      inputNombre.focus();
      return;
    }

    if (!state.cancionEscogida) {
      showToast(t("toastSeleccionaCancion"), "warning");
      return;
    }

    const tarjeta = {
      nombre,
      cancion: state.cancionEscogida.path,
      title: state.cancionEscogida.title,
      img: state.cancionEscogida.img,
    };

    state.tarjetasGuardadas.push(tarjeta);

    const option = document.createElement("option");
    option.value = state.tarjetasGuardadas.length - 1;
    option.textContent = `${nombre} — ${state.cancionEscogida.title}`;
    selectTarjetas.appendChild(option);

    inputNombre.value = "";
    modalTarjeta.hide();
    showToast(t("toastTarjetaCreada"), "success");
  });
});
