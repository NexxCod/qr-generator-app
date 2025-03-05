document.addEventListener("DOMContentLoaded", () => {
    const qrForm = document.getElementById("qrForm");

    qrForm.addEventListener("submit", async (event) => {
        event.preventDefault(); // Evita la navegación predeterminada del formulario

        const tagInput = document.getElementById("tagInput").value.trim();
        const urlInput = document.getElementById("urlInput").value.trim();

        if (!tagInput || !urlInput) {
            mostrarToast("⚠️ Ingresa un nombre y una URL válida", "warning");
            return;
        }

        try {
            const response = await fetch("/qr/create", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ tag: tagInput, url: urlInput })
            });

            if (response.ok) {
                document.getElementById("tagInput").value = "";
                document.getElementById("urlInput").value = ""; // Limpia el input
                mostrarToast("✅ QR generado exitosamente", "success");
                setTimeout(() => window.location.reload(), 1000);
            } else {
                mostrarToast("❌ Error al generar QR", "error");
            }
        } catch (error) {
            console.error("❌ Error:", error);
            mostrarToast("⚠️ Error al enviar la solicitud", "error");
        }
    });
});

// Función para mostrar Toasts (notificaciones rápidas)
function mostrarToast(mensaje, tipo = "info") {
    const colores = {
        success: "#28a745",
        error: "#dc3545",
        warning: "#ffc107",
        info: "#007bff"
    };

    Toastify({
        text: mensaje,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: colores[tipo] || "#000",
        stopOnFocus: true,
    }).showToast();
}

// Manejo de eliminación de QR con SweetAlert2
document.querySelectorAll(".delete-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const confirmar = await mostrarConfirmacion("¿Seguro que deseas eliminar este QR?");
        if (!confirmar) return;

        const response = await fetch(form.action, { method: "DELETE" });

        if (response.ok) {
            mostrarToast("✅ QR eliminado", "success");
            setTimeout(() => window.location.reload(), 1000);
        } else {
            mostrarToast("❌ Error al eliminar el QR", "error");
        }
    });
});

// Función para mostrar confirmación con SweetAlert2
async function mostrarConfirmacion(mensaje) {
    const resultado = await Swal.fire({
        title: mensaje,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    return resultado.isConfirmed;
}

function descargarQR(qrId) {
    const qrDiv = document.getElementById(`qr-${qrId}`);
    if (!qrDiv) {
        mostrarToast("⚠️ Error: No se encontró el QR", "warning");
        return;
    }

    const svgData = qrDiv.innerHTML;
    const blob = new Blob([svgData], { type: "image/svg+xml" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qr_${qrId}.svg`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarToast("📥 QR descargado", "info");
}

async function editarQR(qrId) {
    const nuevaUrl = document.getElementById(`edit-url-${qrId}`).value.trim();

    if (!nuevaUrl) {
        mostrarToast("⚠️ Ingresa una URL válida", "warning");
        return;
    }

    try {
        const response = await fetch(`/qr/edit?id=${qrId}&url=${encodeURIComponent(nuevaUrl)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });

        if (response.ok) {
            mostrarToast("✅ QR actualizado correctamente", "success");
            setTimeout(() => window.location.reload(), 1000);
        } else {
            mostrarToast("❌ Error al actualizar el QR", "error");
        }
    } catch (error) {
        console.error("❌ Error:", error);
        mostrarToast("⚠️ Error al actualizar el QR", "error");
    }
}
