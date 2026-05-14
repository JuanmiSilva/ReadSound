// =======================
// ESTADO GLOBAL
// =======================
const state = {
  book: null,
  rendition: null,
  relaciones: [],
  cancionEscogida: null,
  isReady: false,
  fontSize: 100,
  currentCfi: null,
  currentWord: null,
  currentHref: null,
  currentSpineIndex: null,
  currentProgressionEnCapitulo: 0,
  tarjetasGuardadas: [],
};

const epubPath = { value: require("path").join(__dirname, "libro", "Yumi.epub") };
