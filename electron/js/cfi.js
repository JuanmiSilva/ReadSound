document.addEventListener("DOMContentLoaded", () => {

  const ePub = require("epubjs").default || require("epubjs");

  const cfiInicio = document.getElementById("cfiInicio");
  const cfiFinal = document.getElementById("cfiFinal");

  // =======================
  // CLICK EN EPUB → CFI
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

      const spineItem = state.book.spine.get(section.href);
      const cfi = new ePub.CFI(wordRange, spineItem.cfiBase).toString();

      // Progresión global aproximada
      const totalSpine = state.book.spine.spineItems.length;
      const spineIndex = state.book.spine.spineItems.indexOf(spineItem);
      const body = doc.body;
      const totalChars = body.textContent.length;
      const rangeToStart = doc.createRange();
      rangeToStart.setStart(body, 0);
      rangeToStart.setEnd(node, start);
      const charsToStart = rangeToStart.toString().length;
      const progressionEnCap = totalChars > 0 ? charsToStart / totalChars : 0;
      state.currentProgressionEnCapitulo = (spineIndex + progressionEnCap) / totalSpine;

      console.log("spine:", spineIndex, "| progCap:", progressionEnCap, "| global:", state.currentProgressionEnCapitulo);

      state.currentCfi = cfi;
      state.currentWord = word;
      state.currentHref = section.href;
      state.currentSpineIndex = spineIndex;

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
    input.setAttribute("data-href", state.currentHref);
    input.setAttribute("data-spine-index", state.currentSpineIndex);
    input.setAttribute("data-progression-cap", state.currentProgressionEnCapitulo);

    const old = bootstrap.Tooltip.getInstance(input);
    if (old) old.dispose();

    input.setAttribute("data-bs-toggle", "tooltip");
    input.setAttribute("title", cfi);
    new bootstrap.Tooltip(input);
  }

  function goToCfi(cfi) {
    if (!cfi || typeof cfi !== "string") return;
    try { state.rendition.display(cfi); } catch (e) { console.error(e); }
  }

  // =======================
  // MODALES CFI
  // =======================
  const modalCfi = new bootstrap.Modal(document.getElementById("modalCfi"));

  document.getElementById("btnCfiInicio").onclick = () => {
    setCfi(cfiInicio, state.currentCfi, state.currentWord);
    modalCfi.hide();
  };

  document.getElementById("btnCfiFin").onclick = () => {
    setCfi(cfiFinal, state.currentCfi, state.currentWord);
    modalCfi.hide();
  };

  document.getElementById("buscarCfiInicio").onclick = () => goToCfi(cfiInicio.dataset.cfi);
  document.getElementById("buscarCfiFin").onclick = () => goToCfi(cfiFinal.dataset.cfi);

});
