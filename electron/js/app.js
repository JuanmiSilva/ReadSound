document.addEventListener("DOMContentLoaded", () => {

  console.log("JS funcionando 🚀");

  // =======================
  // INIT
  // =======================
  async function init() {
    updateLoading(80, "Preparando UI...");
    await new Promise((r) => setTimeout(r, 800));

    updateLoading(100, "Listo ✔");
    setTimeout(finishLoading, 400);
  }

  init();

});

