// Buscamos el botón y el espacio donde aparecerá el mensaje.
const boton = document.getElementById("empezar");
const mensaje = document.getElementById("mensaje");

// Al hacer clic, escribimos el mensaje de bienvenida en la página.
boton.addEventListener("click", () => {
  mensaje.textContent = "¡Bienvenido a mi primera página web!";
});
