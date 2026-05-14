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
