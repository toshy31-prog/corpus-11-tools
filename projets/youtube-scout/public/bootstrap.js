if (location.protocol === "file:") {
  location.replace("http://localhost:4181/");
} else {
  document.addEventListener("DOMContentLoaded", () => {
    const origin = document.getElementById("google-javascript-origin");
    if (origin) origin.textContent = location.origin;
  }, { once: true });
}
