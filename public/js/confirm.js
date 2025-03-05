document.addEventListener("DOMContentLoaded", () => {
    fetch("/qr/confirm", {
        method: "POST",
        credentials: "include" // Enviar cookies con la solicitud
    })
    .then(response => response.json())
    .then(data => console.log("✅ Respuesta del servidor:", data))
    .catch(error => console.error("❌ Error en la solicitud:", error));
});

