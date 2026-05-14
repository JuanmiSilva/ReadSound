const translations = {
    es: {
        // Drop zone
        dropTitle: "Arrastra tu EPUB aquí",
        dropSub: "o suéltalo para empezar",

        // Navegación
        btnPrev: "← Anterior",
        btnNext: "Siguiente →",
        progressPlaceholder: "Posición actual",

        // Panel central
        appTitle: "READ&SOUND",
        cfiStart: "Cfi inicio",
        cfiEnd: "Cfi final",
        selectSong: "Selecciona Canción",
        selectCard: "Selecciona una tarjeta",
        btnAddCard: "+ Tarjeta",
        btnSaveCard: "Guardar",

        // Panel derecho
        btnAddMusic: "Añadir Canción",

        // Modal buscar
        modalSearchTitle: "Buscar en el libro",
        searchPlaceholder: "Introduce palabra o frase",
        btnSearch: "Buscar",
        btnClose: "Cerrar",

        // Modal CFI
        modalCfiTitle: "¿Es el principio o el final?",
        labelWord: "Palabra",
        labelCfi: "CFI",
        btnSetStart: "Establecer como Inicio",
        btnSetEnd: "Establecer como Fin",

        // Modal descripción
        modalDescTitle: "Descripción de la relación",
        labelDescription: "Escribe una descripción",
        descPlaceholder: "Ej: escena triste con música suave",
        btnCancel: "Cancelar",
        btnSave: "Guardar",

        // Modal tarjeta
        modalCardTitle: "Crear nueva tarjeta",
        labelCardName: "Escribe el nombre de la tarjeta",
        cardPlaceholder: "Ej: bosque",
        btnCreate: "Crear",

        // Tooltips / titles
        tooltipSave: "botón guardar",
        tooltipSearch: "buscar en el libro",
        tooltipDelete: "eliminar avance",
        tooltipFind: "buscar",

        // Loading
        loadingTitle: "Cargando libro...",
        loadingInit: "Iniciando...",

        // Toasts
        toastSaved: "Tramo guardado correctamente",
        toastDeleted: "Avance eliminado",
        toastError: "Ha ocurrido un error",
        toastDatos: "Faltan datos: inicio, fin o canción",
        toastCfisIguales: "El inicio y el fin no pueden ser iguales",
        toastCfiPosterior: "El inicio no puede ser posterior al final",
        toastPrimeroCancion: "Debes seleccionar una canción primero",
        toastNombreTarjeta: "Debes escribir un nombre para la tarjeta",
        toastSeleccionaCancion: "Debes seleccionar una canción",
        toastTarjetaCreada: "Tarjeta creada ✔",
        toastSeleccionaCfi: "Debes seleccionar CFI inicio y final",
        toastSeleccionaTarjeta: "Debes seleccionar una tarjeta",
        toastRelacionTarjeta: "Relación guardada desde tarjeta ✔",
        toastNoRelaciones: "No hay relaciones para exportar",
        toastExportado: "Exportado",
        toastErrorExportar: "Error al exportar",
        toastCancionSeleccionada: "Canción seleccionada",
        toastConfirmarBorrar: "¿Quieres borrar los CFIs y la canción seleccionada?",
        toastNoResultados: "No se encontraron resultados",
        toastCancionEtiqueta: "Selecciona etiqueta o cancion",
        loadingReady: "Listo ✔",
        loadingPreparingUI: "Preparando UI...",
        cardNoDesc: "Sin descripción",
        btnEliminar: "Eliminar",
    },

    en: {
        dropTitle: "Drag your EPUB here",
        dropSub: "or drop it to start",

        btnPrev: "← Previous",
        btnNext: "Next →",
        progressPlaceholder: "Current position",

        appTitle: "READ&SOUND",
        cfiStart: "Start CFI",
        cfiEnd: "End CFI",
        selectSong: "Select Song",
        selectCard: "Select a card",
        btnAddCard: "+ Card",
        btnSaveCard: "Save",

        btnAddMusic: "Add Song",

        modalSearchTitle: "Search in book",
        searchPlaceholder: "Enter word or phrase",
        btnSearch: "Search",
        btnClose: "Close",

        modalCfiTitle: "Is this the start or the end?",
        labelWord: "Word",
        labelCfi: "CFI",
        btnSetStart: "Set as Start",
        btnSetEnd: "Set as End",

        modalDescTitle: "Relationship description",
        labelDescription: "Write a description",
        descPlaceholder: "E.g: sad scene with soft music",
        btnCancel: "Cancel",
        btnSave: "Save",

        modalCardTitle: "Create new card",
        labelCardName: "Write the card name",
        cardPlaceholder: "E.g: forest",
        btnCreate: "Create",

        tooltipSave: "save button",
        tooltipSearch: "search in book",
        tooltipDelete: "delete progress",
        tooltipFind: "search",

        loadingTitle: "Loading book...",
        loadingInit: "Starting...",

        // Toasts
        toastSaved: "Section saved successfully",
        toastDeleted: "Progress deleted",
        toastError: "An error occurred",
        toastDatos: "Missing data: start, end or song",
        toastCfisIguales: "Start and end cannot be the same",
        toastCfiPosterior: "Start cannot come after the end",
        toastPrimeroCancion: "You must select a song first",
        toastNombreTarjeta: "You must write a name for the card",
        toastSeleccionaCancion: "You must select a song",
        toastTarjetaCreada: "Card created ✔",
        toastSeleccionaCfi: "You must select a start and end CFI",
        toastSeleccionaTarjeta: "You must select a card",
        toastRelacionTarjeta: "Relationship saved from card ✔",
        toastNoRelaciones: "No relationships to export",
        toastExportado: "Exported",
        toastErrorExportar: "Export error",
        toastCancionSeleccionada: "Song selected",
        toastConfirmarBorrar: "Do you want to delete the CFIs and the selected song?",
        toastNoResultados: "No results found",
        toastCancionEtiqueta: "You must select a song or a tag",
        loadingReady: "Ready ✔",
        loadingPreparingUI: "Preparing UI...",
        cardNoDesc: "No description",
        btnEliminar: "Remove",
    }
};

let currentLang = "es";

function t(key) {
    return translations[currentLang][key] ?? key;
}

function setLang(lang) {
    currentLang = lang;
    applyTranslations();
}

function applyTranslations() {
    document.querySelector("#dropZone h4").textContent = t("dropTitle");
    document.querySelector("#dropZone p").textContent = t("dropSub");

    document.getElementById("btn_prev").textContent = t("btnPrev");
    document.getElementById("btn_next").textContent = t("btnNext");
    document.getElementById("progressText").placeholder = t("progressPlaceholder");

    document.querySelector(".center-panel h2").textContent = t("appTitle");
    document.getElementById("cfiInicio").placeholder = t("cfiStart");
    document.getElementById("cfiFinal").placeholder = t("cfiEnd");
    document.querySelector("#cancionEscogida .media-text").textContent = t("selectSong");

    document.querySelector("#selectTarjetas option[value='']").textContent = t("selectCard");
    document.getElementById("addTarjeta").textContent = t("btnAddCard");
    document.getElementById("guardarPorTarjeta").textContent = t("btnSaveCard");

    document.getElementById("btnAddMusic").textContent = t("btnAddMusic");

    document.getElementById("modalBuscarLabel").textContent = t("modalSearchTitle");
    document.getElementById("searchInput").placeholder = t("searchPlaceholder");
    document.getElementById("btnSearch").textContent = t("btnSearch");
    document.querySelectorAll("[data-bs-dismiss='modal']").forEach(btn => {
        if (btn.textContent.trim() === translations.es.btnClose ||
            btn.textContent.trim() === translations.en.btnClose) {
            btn.textContent = t("btnClose");
        }
    });

    document.getElementById("modalCfiLabel").textContent = t("modalCfiTitle");
    document.querySelector("label[for='modalCfiPalabra']").textContent = t("labelWord");
    document.querySelector("label[for='modalCfiCfi']").textContent = t("labelCfi");
    document.getElementById("btnCfiInicio").textContent = t("btnSetStart");
    document.getElementById("btnCfiFin").textContent = t("btnSetEnd");

    document.getElementById("modalDescripcionLabel").textContent = t("modalDescTitle");
    document.querySelector("label[for='descripcionRelacion']").textContent = t("labelDescription");
    document.getElementById("descripcionRelacion").placeholder = t("descPlaceholder");
    document.getElementById("btnConfirmarRelacion").textContent = t("btnSave");

    document.getElementById("modalTarjetaLabel").textContent = t("modalCardTitle");
    document.querySelector("label[for='nombreTarjeta']").textContent = t("labelCardName");
    document.getElementById("nombreTarjeta").placeholder = t("cardPlaceholder");
    document.getElementById("btnConfirmarTarjeta").textContent = t("btnCreate");
    document.querySelector("#cancionEscogidaModal .media-text").textContent = t("selectSong");

    document.querySelector("#loadingScreen h2").textContent = t("loadingTitle");
    document.getElementById("loadingText").textContent = t("loadingInit");

    // Actualizar botones "Eliminar" de tarjetas ya creadas
    document.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.textContent = t("btnEliminar");
    });

    document.getElementById("langToggle").textContent = currentLang === "es" ? "EN" : "ES";
}