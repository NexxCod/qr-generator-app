document.addEventListener("DOMContentLoaded", () => {
    const tagSelector = document.getElementById("tagSelector");
    const monthSelector = document.getElementById("monthSelector");
    const yearSelector = document.getElementById("yearSelector");
    const clickDetails = document.getElementById("clickDetails");
    const ctx = document.getElementById("clickChart").getContext("2d");

    // Generar opciones de año (últimos 5 años)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 5; i--) {
        const option = document.createElement("option");
        option.value = i;
        option.text = i;
        if (i === currentYear) option.selected = true;
        yearSelector.appendChild(option);
    }

    // Generar opciones de mes
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.text = new Date(currentYear, i - 1).toLocaleString("es-ES", { month: "long" });
        if (i === new Date().getMonth() + 1) option.selected = true;
        monthSelector.appendChild(option);
    }

    let clickChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Escaneos por día",
                    data: [],
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: "Confirmaciones por día",
                    data: [],
                    borderColor: "red", // Color de la nueva línea
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Día del mes" } },
                y: { title: { display: true, text: "Cantidad" }, beginAtZero: true }
            }
        }
    });

    window.updateChart = function () {
        const selectedTag = tagSelector.value;
        const selectedYear = yearSelector.value;
        const selectedMonth = monthSelector.value;

        if (!selectedTag) {
            clickChart.data.labels = [];
            clickChart.data.datasets[0].data = [];
            clickChart.update();
            clickDetails.innerHTML = "<tr><td>Seleccione un QR para ver los clics.</td></tr>";
            return;
        }

        fetch(`/qr/clicks-data?tag=${encodeURIComponent(selectedTag)}&month=${selectedMonth}&year=${selectedYear}`)
            .then(response => response.json())
            .then(data => {
                console.log("📊 Datos recibidos del backend:", data);

                // Actualizar el gráfico
                const labels = data.clicksByDay.map(item => item._id);
                const valuesEscaneos = data.clicksByDay.map(item => item.count);
                const valuesAgendamientos = data.agendamientosByDay.map(item => item.count);

                clickChart.data.labels = labels;
                clickChart.data.datasets[0].data = valuesEscaneos;
                clickChart.data.datasets[1].data = valuesAgendamientos;
                clickChart.update();

                // Actualizar tabla de clics
                clickDetails.innerHTML = "";
                data.clicksList.forEach(click => {
                    const row = document.createElement("tr");
                    row.innerHTML = `<td>${new Date(click.timestamp).toLocaleString()}</td>`;
                    clickDetails.appendChild(row);
                });

                // Actualizar tabla de agendamientos
                agendamientoDetails.innerHTML = "";
                data.agendamientosList.forEach(agendamiento => {
                    const row = document.createElement("tr");
                    row.innerHTML = `<td>${new Date(agendamiento).toLocaleString()}</td>`;
                    agendamientoDetails.appendChild(row);
                });
            })
            .catch(error => console.error("❌ Error al cargar datos:", error));
    
    }

    tagSelector.addEventListener("change", updateChart);
    yearSelector.addEventListener("change", updateChart);
    monthSelector.addEventListener("change", updateChart);
    updateChart();
});
