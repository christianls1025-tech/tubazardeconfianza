import {
    obtenerProductos,
    suscribirseAProductos
} from "./productos-service.js";

let graficaDistribucion = null;

let tipoGraficaActual = "pie";

let conteoEstados = {
    disponible: 0,
    apartado: 0,
    comprado: 0
};


let graficaVentas = null;

let periodoVentasActual = "30";

let productosCargados = [];


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* ==================================
           BOTONES: PASTEL / BARRAS
        ================================== */

        document
            .querySelectorAll(".btn-tipo-grafica")
            .forEach(boton => {

                boton.addEventListener("click", () => {

                    if (
                        boton.dataset.tipo ===
                        tipoGraficaActual
                    ) {
                        return;
                    }

                    document
                        .querySelectorAll(".btn-tipo-grafica")
                        .forEach(btn =>
                            btn.classList.remove("activo")
                        );

                    boton.classList.add("activo");

                    tipoGraficaActual =
                        boton.dataset.tipo;

                    mostrarGraficaDistribucion();

                });

            });


        /* ==================================
           BOTONES: PERIODO DE VENTAS
        ================================== */

        document
            .querySelectorAll(".btn-periodo-grafica")
            .forEach(boton => {

                boton.addEventListener("click", () => {

                    if (
                        boton.dataset.periodo ===
                        periodoVentasActual
                    ) {
                        return;
                    }

                    document
                        .querySelectorAll(".btn-periodo-grafica")
                        .forEach(btn =>
                            btn.classList.remove("activo")
                        );

                    boton.classList.add("activo");

                    periodoVentasActual =
                        boton.dataset.periodo;

                    mostrarGraficaVentas();

                });

            });


        try {

            const productos =
                await obtenerProductos();


            calcularEstadisticas(
                productos
            );


        } catch (error) {

            console.error(
                "Error cargando dashboard:",
                error
            );

        }


        /* ==================================
           TIEMPO REAL
           ----------------------------------
           Cuando se crea, edita o elimina una
           prenda (por ejemplo desde el panel
           de admin), el dashboard recalcula
           todas sus estadísticas y gráficas
           al instante, sin recargar la página.
        ================================== */

        suscribirseAProductos(({ tipo, producto }) => {

            if (tipo === "crear") {

                if (!productosCargados.some(p => p.id === producto.id)) {
                    productosCargados.push(producto);
                }

            } else if (tipo === "actualizar") {

                const indice =
                    productosCargados.findIndex(
                        p => p.id === producto.id
                    );

                if (indice !== -1) {
                    productosCargados[indice] = producto;
                } else {
                    productosCargados.push(producto);
                }

            } else if (tipo === "eliminar") {

                productosCargados =
                    productosCargados.filter(
                        p => p.id !== producto.id
                    );

            }

            calcularEstadisticas(productosCargados);

        });

    }
);



function calcularEstadisticas(
    productos
) {

    productosCargados =
        productos;


    const total =
        productos.length;


    const disponibles =
        productos.filter(
            p => p.estado === "disponible"
        );


    const apartadas =
        productos.filter(
            p => p.estado === "apartado"
        );


    const compradas =
        productos.filter(
            p => p.estado === "comprado"
        );


    /* ==================================
       CANTIDADES
    ================================== */

    document.getElementById(
        "totalPrendas"
    ).textContent = total;


    document.getElementById(
        "disponibles"
    ).textContent =
        disponibles.length;


    document.getElementById(
        "apartadas"
    ).textContent =
        apartadas.length;


    document.getElementById(
        "compradas"
    ).textContent =
        compradas.length;



    /* ==================================
       VALORES
    ================================== */

    const valorDisponible =
        disponibles.reduce(
            (total, producto) =>
                total +
                Number(producto.precio || 0),
            0
        );


    const valorApartado =
        apartadas.reduce(
            (total, producto) =>
                total +
                Number(producto.precio || 0),
            0
        );


    const valorComprado =
        compradas.reduce(
            (total, producto) =>
                total +
                Number(producto.precio || 0),
            0
        );


    const valorTotalInventario =
        valorDisponible +
        valorApartado +
        valorComprado;


    document.getElementById(
        "valorDisponible"
    ).textContent =
        formatearPrecio(
            valorDisponible
        );


    document.getElementById(
        "valorApartado"
    ).textContent =
        formatearPrecio(
            valorApartado
        );


    document.getElementById(
        "valorComprado"
    ).textContent =
        formatearPrecio(
            valorComprado
        );


    document.getElementById(
        "valorTotalInventario"
    ).textContent =
        formatearPrecio(
            valorTotalInventario
        );



    /* ==================================
       OTROS DATOS
    ================================== */

    const precioPromedio =
        total > 0
            ? valorTotalInventario / total
            : 0;

    document.getElementById(
        "precioPromedio"
    ).textContent =
        formatearPrecio(
            precioPromedio
        );


    document.getElementById(
        "categoriaEstrella"
    ).textContent =
        obtenerCategoriaEstrella(
            productos
        );


    const porcentajeVendidas =
        total > 0
            ? Math.round(
                (compradas.length / total) * 100
            )
            : 0;

    document.getElementById(
        "porcentajeVendidas"
    ).textContent =
        `${porcentajeVendidas}%`;


    document.getElementById(
        "prendasRecientes"
    ).textContent =
        contarPrendasRecientes(
            productos
        );



    /* ==================================
       CATEGORÍAS
    ================================== */

    mostrarCategorias(
        productos
    );



    /* ==================================
       DISTRIBUCIÓN (GRÁFICA)
    ================================== */

    conteoEstados = {
        disponible: disponibles.length,
        apartado: apartadas.length,
        comprado: compradas.length
    };

    mostrarGraficaDistribucion();



    /* ==================================
       VENTAS POR PERIODO (GRÁFICA)
    ================================== */

    mostrarGraficaVentas();

}



/* =========================================
   GRÁFICA DE DISTRIBUCIÓN
   (pastel o barras, según lo elegido)
========================================= */

function mostrarGraficaDistribucion() {

    const lienzo =
        document.getElementById(
            "graficaDistribucion"
        );

    if (!lienzo || typeof Chart === "undefined") {
        return;
    }


    const etiquetas =
        ["Disponibles", "Apartadas", "Compradas"];

    const valores = [
        conteoEstados.disponible,
        conteoEstados.apartado,
        conteoEstados.comprado
    ];

    const colores =
        ["#d63384", "#f0b429", "#777777"];


    const esPastel =
        tipoGraficaActual === "pie";


    if (graficaDistribucion) {
        graficaDistribucion.destroy();
    }


    graficaDistribucion = new Chart(
        lienzo,
        {
            type: tipoGraficaActual,

            data: {
                labels: etiquetas,
                datasets: [{
                    label: "Prendas",
                    data: valores,
                    backgroundColor: colores,
                    borderColor: esPastel
                        ? "#ffffff"
                        : colores,
                    borderWidth: esPastel ? 3 : 0,
                    borderRadius: esPastel ? 0 : 8,
                    maxBarThickness: 70
                }]
            },

            options: {
                responsive: true,

                plugins: {
                    legend: {
                        display: esPastel,
                        position: "bottom",
                        labels: {
                            color: "#59404c",
                            usePointStyle: true,
                            padding: 18
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: contexto => {

                                const valor =
                                    esPastel
                                        ? contexto.parsed
                                        : contexto.parsed.y;

                                return ` ${contexto.label}: ${valor}`;

                            }
                        }
                    }
                },

                scales: esPastel
                    ? undefined
                    : {
                        x: {
                            grid: { display: false },
                            ticks: { color: "#806270" }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0,
                                color: "#806270"
                            },
                            grid: { color: "#f3e3ea" }
                        }
                    }
            }
        }
    );

}



/* =========================================
   VENTAS POR PERIODO
   (agrupa las prendas compradas según su
   fecha de registro, dentro del periodo
   seleccionado)
========================================= */

function mostrarGraficaVentas() {

    const lienzo =
        document.getElementById(
            "graficaVentas"
        );

    if (!lienzo || typeof Chart === "undefined") {
        return;
    }


    const dias =
        Number(periodoVentasActual);

    const agrupacion =
        dias <= 30
            ? "dia"
            : dias <= 90
                ? "semana"
                : "mes";

    const { etiquetas, valores } =
        agruparVentasPorPeriodo(
            productosCargados,
            dias,
            agrupacion
        );


    if (graficaVentas) {
        graficaVentas.destroy();
    }


    graficaVentas = new Chart(
        lienzo,
        {
            type: "line",

            data: {
                labels: etiquetas,
                datasets: [{
                    label: "Ventas",
                    data: valores,
                    borderColor: "#d63384",
                    backgroundColor: "rgba(214, 51, 132, 0.12)",
                    pointBackgroundColor: "#d63384",
                    pointBorderColor: "#fff",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: true,
                    borderWidth: 2.5
                }]
            },

            options: {
                responsive: true,

                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: contexto =>
                                ` ${formatearPrecio(contexto.parsed.y)}`
                        }
                    }
                },

                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: "#806270" }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: "#806270",
                            callback: valor =>
                                formatearPrecio(valor)
                        },
                        grid: { color: "#f3e3ea" }
                    }
                }
            }
        }
    );

}



function agruparVentasPorPeriodo(
    productos,
    dias,
    agrupacion
) {

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const inicio =
        new Date(hoy);

    inicio.setDate(
        inicio.getDate() - (dias - 1)
    );


    const compradas =
        productos.filter(producto => {

            if (producto.estado !== "comprado") {
                return false;
            }

            const fecha =
                parsearFecha(producto.fecha);

            return (
                fecha &&
                fecha >= inicio &&
                fecha <= hoy
            );

        });


    const cubos = {};

    compradas.forEach(producto => {

        const fecha =
            parsearFecha(producto.fecha);

        const clave =
            claveDeAgrupacion(
                fecha,
                agrupacion
            );

        cubos[clave] =
            (cubos[clave] || 0) +
            (Number(producto.precio) || 0);

    });


    const etiquetas = [];

    const valores = [];

    if (agrupacion === "dia") {

        for (
            let fecha = new Date(inicio);
            fecha <= hoy;
            fecha.setDate(fecha.getDate() + 1)
        ) {

            const clave =
                claveDeAgrupacion(fecha, "dia");

            etiquetas.push(
                fecha.toLocaleDateString(
                    "es-MX",
                    { day: "numeric", month: "short" }
                )
            );

            valores.push(cubos[clave] || 0);

        }

    } else if (agrupacion === "semana") {

        for (
            let fecha = new Date(inicio);
            fecha <= hoy;
            fecha.setDate(fecha.getDate() + 7)
        ) {

            const finSemana =
                new Date(fecha);

            finSemana.setDate(
                finSemana.getDate() + 6
            );

            let sumaSemana = 0;

            for (
                let dia = new Date(fecha);
                dia <= finSemana && dia <= hoy;
                dia.setDate(dia.getDate() + 1)
            ) {

                sumaSemana +=
                    cubos[claveDeAgrupacion(dia, "dia")] || 0;

            }

            etiquetas.push(
                fecha.toLocaleDateString(
                    "es-MX",
                    { day: "numeric", month: "short" }
                )
            );

            valores.push(sumaSemana);

        }

    } else {

        for (let i = 11; i >= 0; i--) {

            const fecha =
                new Date(
                    hoy.getFullYear(),
                    hoy.getMonth() - i,
                    1
                );

            const clave =
                `${fecha.getFullYear()}-${fecha.getMonth()}`;

            etiquetas.push(
                fecha.toLocaleDateString(
                    "es-MX",
                    { month: "short", year: "2-digit" }
                )
            );

            valores.push(cubos[clave] || 0);

        }

    }

    return { etiquetas, valores };

}



function claveDeAgrupacion(
    fecha,
    agrupacion
) {

    if (agrupacion === "mes") {
        return `${fecha.getFullYear()}-${fecha.getMonth()}`;
    }

    return fecha.toISOString().slice(0, 10);

}



function parsearFecha(valor) {

    if (!valor) return null;

    const partes =
        String(valor)
            .slice(0, 10)
            .split("-");

    if (partes.length !== 3) return null;

    const [anio, mes, dia] =
        partes.map(Number);

    const fecha =
        new Date(anio, mes - 1, dia);

    fecha.setHours(0, 0, 0, 0);

    return fecha;

}



/* =========================================
   CATEGORÍAS
========================================= */

function mostrarCategorias(
    productos
) {

    const contenedor =
        document.getElementById(
            "categorias"
        );


    const categorias = {};


    productos.forEach(producto => {

        const categoria =
            producto.categoria ||
            "Sin categoría";


        if (!categorias[categoria]) {

            categorias[categoria] = {
                cantidad: 0,
                sumaPrecios: 0
            };

        }


        categorias[categoria].cantidad++;

        categorias[categoria].sumaPrecios +=
            Number(producto.precio) || 0;

    });


    contenedor.innerHTML = "";


    const nombres =
        Object.keys(categorias);


    if (nombres.length === 0) {

        contenedor.innerHTML = `
            <p>
                No hay prendas registradas.
            </p>
        `;

        return;

    }


    nombres
        .sort()
        .forEach(categoria => {

            const elemento =
                document.createElement(
                    "div"
                );


            elemento.className =
                "categoria-item";


            const datos =
                categorias[categoria];

            const precioPromedioCategoria =
                datos.cantidad
                    ? datos.sumaPrecios / datos.cantidad
                    : 0;


            elemento.innerHTML = `

                <span>
                    ${escapeHTML(categoria)}
                </span>

                <strong>
                    ${datos.cantidad}
                </strong>

                <small class="categoria-precio-promedio">
                    Precio promedio: ${formatearPrecio(precioPromedioCategoria)}
                </small>

            `;


            contenedor.appendChild(
                elemento
            );

        });

}



/* =========================================
   CATEGORÍA ESTRELLA (más popular)
========================================= */

function obtenerCategoriaEstrella(
    productos
) {

    if (!productos.length) return "—";


    const conteo = {};

    productos.forEach(producto => {

        const categoria =
            producto.categoria ||
            "Sin categoría";

        conteo[categoria] =
            (conteo[categoria] || 0) + 1;

    });


    const [nombreTop] =
        Object.entries(conteo)
            .sort((a, b) => b[1] - a[1])[0];

    return nombreTop;

}



/* =========================================
   PRENDAS AGREGADAS EN LOS ÚLTIMOS 7 DÍAS
========================================= */

function contarPrendasRecientes(
    productos
) {

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const hace7Dias =
        new Date(hoy);

    hace7Dias.setDate(
        hace7Dias.getDate() - 6
    );


    return productos.filter(producto => {

        if (!producto.fecha) return false;

        const partes =
            String(producto.fecha)
                .slice(0, 10)
                .split("-");

        if (partes.length !== 3) return false;

        const [anio, mes, dia] =
            partes.map(Number);

        const fechaProducto =
            new Date(anio, mes - 1, dia);

        return (
            fechaProducto >= hace7Dias &&
            fechaProducto <= hoy
        );

    }).length;

}



/* =========================================
   PRECIO
========================================= */

function formatearPrecio(
    precio
) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    ).format(precio);

}



/* =========================================
   ESCAPAR HTML
========================================= */

function escapeHTML(
    texto
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent = texto;

    return div.innerHTML;

}