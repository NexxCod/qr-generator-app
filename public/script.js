document.addEventListener("DOMContentLoaded", () => {
    const qrForm = document.getElementById("qrForm");

    qrForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evita la navegación predeterminada del formulario

        const urlInput = document.getElementById("urlInput").value;

        if (!urlInput) {
            alert("Por favor, ingresa una URL válida.");
            return;
        }

        try {
            const response = await fetch("/qr/create", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ url: urlInput })
            });

            if (response.ok) {
                document.getElementById("urlInput").value = ""; // Limpia el input
                window.location.href = "/"; // Redirige a la página principal manualmente
            } else {
                alert("Error al generar QR. Intenta nuevamente.");
            }
        } catch (error) {
            console.error("❌ Error:", error);
            alert("Error al enviar la solicitud.");
        }
    });
});

//borrar
document.querySelectorAll(".delete-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!confirm("¿Seguro que deseas eliminar este QR?")) return;

        const response = await fetch(form.action, { method: "DELETE" });

        if (response.ok) {
            alert("QR eliminado");
            window.location.reload();
        } else {
            alert("Error al eliminar el QR");
        }
    });
});

function descargarQR(qrId) {
    // Obtener el contenido del QR desde el div
    const qrDiv = document.getElementById(`qr-${qrId}`);
    if (!qrDiv) {
        alert("Error: No se encontró el QR.");
        return;
    }

    // Extraer el código SVG del div
    const svgData = qrDiv.innerHTML;
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    
    // Crear un enlace de descarga
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qr_${qrId}.svg`;

    // Simular clic para descargar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function editarQR(qrId) {
    const nuevaUrl = document.getElementById(`edit-url-${qrId}`).value.trim();

    if (!nuevaUrl) {
        alert("Por favor, ingresa una URL válida.");
        return;
    }

    try {
        const response = await fetch(`/qr/edit?id=${qrId}&url=${encodeURIComponent(nuevaUrl)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });

        if (response.ok) {
            alert("QR actualizado correctamente");
            window.location.reload(); // Recargar la página para ver el cambio
        } else {
            alert("Error al actualizar el QR");
        }
    } catch (error) {
        console.error("❌ Error:", error);
        alert("Error al actualizar el QR.");
    }
}
