document.addEventListener("DOMContentLoaded", () => {

  const fs = require("fs");
  const path = require("path");
  const archiver = require("archiver");
  const { ipcRenderer } = require("electron");

  // =======================
  // EXPORTAR SOUNDBOOK
  // =======================
  async function exportarSoundbook() {
    if (state.relaciones.length === 0) {
      showToast(t("toastNoRelaciones"), "warning");
      return;
    }

    const titulo = state.book.packaging.metadata.title || path.basename(epubPath.value, ".epub");
    const filePath = await ipcRenderer.invoke("dialog-save", titulo + ".rsound");
    if (!filePath) return;

    const cancionesUsadas = [...new Set(state.relaciones.map((r) => r.cancion))];
    const totalSpine = state.book.spine.spineItems.length;

    const relacionesJson = state.relaciones.map((r) => {
      const globalInicio = state.book.locations.percentageFromCfi(r.inicio.cfi);
      const capIStart = r.inicio.spineIndex / totalSpine;
      const capIEnd = (r.inicio.spineIndex + 1) / totalSpine;
      const progCapInicio = (globalInicio - capIStart) / (capIEnd - capIStart);

      const globalFin = state.book.locations.percentageFromCfi(r.fin.cfi);
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
      epub: "libro/" + path.basename(epubPath.value),
      autor: state.book.packaging.metadata.creator || "",
      createdAt: new Date().toISOString(),
    };

    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      showToast(
        `${t("toastExportado")}: ${path.basename(filePath)} (${(archive.pointer() / 1024 / 1024).toFixed(1)} MB)`,
        "success"
      );
    });

    archive.on("error", () => showToast(t("toastErrorExportar"), "error"));

    archive.pipe(output);
    archive.file(epubPath.value, { name: "libro/" + path.basename(epubPath.value) });

    for (const cancionPath of cancionesUsadas) {
      archive.file(cancionPath, { name: "audio/" + path.basename(cancionPath) });
    }

    archive.append(JSON.stringify(relacionesJson, null, 2), { name: "relaciones.json" });
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    await archive.finalize();
  }

  document.getElementById("btn_exportar").onclick = exportarSoundbook;

});
