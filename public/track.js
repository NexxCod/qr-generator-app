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
            datasets: [{
                label: "Clics por día",
                data: [],
                borderColor: "blue",
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Día del mes" } },
                y: { title: { display: true, text: "Cantidad de clics" }, beginAtZero: true }
            }
        }
    });

    function updateChart() {
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
                const values = data.clicksByDay.map(item => item.count);

                clickChart.data.labels = labels;
                clickChart.data.datasets[0].data = values;
                clickChart.update();

                // Actualizar la tabla de detalles
                clickDetails.innerHTML = "";
                if (data.clicksList.length === 0) {
                    clickDetails.innerHTML = "<tr><td>No hay clics registrados para este QR en este mes.</td></tr>";
                } else {
                    data.clicksList.forEach(click => {
                        const row = document.createElement("tr");
                        const date = new Date(click.timestamp).toLocaleString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        });
                        row.innerHTML = `<td>${date}</td>`;
                        clickDetails.appendChild(row);
                    });
                }
            })
            .catch(error => console.error("❌ Error al cargar datos:", error));
    }

    tagSelector.addEventListener("change", updateChart);
    yearSelector.addEventListener("change", updateChart);
    monthSelector.addEventListener("change", updateChart);
    updateChart();
});
