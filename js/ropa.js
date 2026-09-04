import {
    obtenerProductos,
    urlFoto,
    urlDescargaFoto,
    suscribirseAProductos
} from "./productos-service.js";

document.addEventListener("DOMContentLoaded", () => {

    const contenedor = document.getElementById("contenedorRopa");
    const loader = document.getElementById("loaderRopa");
    const sinRopa = document.getElementById("sinRopa");
    const filtros = document.getElementById("filtrosCategorias");
    const filtrosEstados = document.getElementById("filtrosEstados");

    let productos = [];

    let filtroEstadoActual = "todos";
    let filtroCategoriaActual = "todas";

    const LIMITE_TARJETAS = 14;

    const ORDEN_ESTADO = {
        disponible: 0,
        apartado: 1,
        comprado: 2
    };

    const GRUPO_WHATSAPP = "https://chat.whatsapp.com/L27TM6CVe0R6IFYzoIs9O5";

    /* ==========================================
       CARGAR SWEETALERT2 (dinámicamente)
       con z-index alto para estar encima de modales
    ========================================== */

    let sweetAlertLoaded = false;

    function cargarSweetAlert() {
        return new Promise((resolve, reject) => {
            if (window.Swal) {
                sweetAlertLoaded = true;
                asegurarZIndexSweetAlert();
                resolve(window.Swal);
                return;
            }

            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
            script.onload = () => {
                sweetAlertLoaded = true;
                asegurarZIndexSweetAlert();
                resolve(window.Swal);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function asegurarZIndexSweetAlert() {
        if (!document.getElementById("estilosSweetAlertRopa")) {
            const estilos = document.createElement("style");
            estilos.id = "estilosSweetAlertRopa";
            estilos.textContent = `
                .swal2-container-ropa {
                    z-index: 100000 !important;
                }
                .swal2-container-ropa .swal2-popup {
                    z-index: 100001 !important;
                }
            `;
            document.head.appendChild(estilos);
        }
    }


    /* ==========================================
       CARGAR PRODUCTOS
    ========================================== */

    async function cargarProductos() {
        try {
            const datos = await obtenerProductos();
            productos = ordenarProductos(datos);
            loader.classList.add("d-none");
            reconstruirFiltrosCategorias();
            mostrarProductos(productos);
        } catch (error) {
            console.error("Error al cargar productos:", error);
            loader.classList.add("d-none");
            mostrarMensajeSinRopa();
        }
    }

    function ordenarProductos(lista) {
        return [...lista].sort((a, b) => {
            const ordenA = ORDEN_ESTADO[a.estado] ?? 3;
            const ordenB = ORDEN_ESTADO[b.estado] ?? 3;
            return ordenA - ordenB;
        });
    }

    /* ==========================================
       RECONSTRUIR FILTROS DE CATEGORÍAS
    ========================================== */

    function reconstruirFiltrosCategorias() {
        const botonTodas = filtros.querySelector('[data-categoria="todas"]');
        if (!botonTodas) return;

        const hijos = [...filtros.children];
        hijos.forEach(hijo => {
            if (hijo !== botonTodas) {
                filtros.removeChild(hijo);
            }
        });

        const categorias = [...new Set(
            productos
                .map(p => p.categoria)
                .filter(Boolean)
        )];

        categorias.forEach(categoria => {
            const boton = document.createElement("button");
            boton.className = "btn-filtro";
            boton.dataset.categoria = categoria;
            boton.textContent = categoria;

            boton.addEventListener("click", () => {
                seleccionarFiltro(filtros, boton);
                filtroCategoriaActual = categoria;
                aplicarFiltros();
            });

            filtros.appendChild(boton);
        });

        if (filtroCategoriaActual !== "todas") {
            const existe = categorias.some(c => c === filtroCategoriaActual);
            if (!existe) {
                filtroCategoriaActual = "todas";
                seleccionarFiltro(filtros, botonTodas);
            } else {
                const botonActivo = filtros.querySelector(`[data-categoria="${filtroCategoriaActual}"]`);
                if (botonActivo) {
                    seleccionarFiltro(filtros, botonActivo);
                } else {
                    seleccionarFiltro(filtros, botonTodas);
                    filtroCategoriaActual = "todas";
                }
            }
        } else {
            seleccionarFiltro(filtros, botonTodas);
        }
    }

    function inicializarFiltrosEstado() {
        filtrosEstados
            .querySelectorAll(".btn-filtro")
            .forEach(boton => {
                boton.addEventListener("click", () => {
                    seleccionarFiltro(filtrosEstados, boton);
                    filtroEstadoActual = boton.dataset.estado;
                    aplicarFiltros();
                });
            });
    }

    function seleccionarFiltro(grupo, botonActivo) {
        grupo
            .querySelectorAll(".btn-filtro")
            .forEach(btn => btn.classList.remove("activo"));
        botonActivo.classList.add("activo");
    }

    function aplicarFiltros() {
        let filtrados = productos;
        if (filtroEstadoActual !== "todos") {
            filtrados = filtrados.filter(producto => producto.estado === filtroEstadoActual);
        }
        if (filtroCategoriaActual !== "todas") {
            filtrados = filtrados.filter(producto => producto.categoria === filtroCategoriaActual);
        }
        mostrarProductos(filtrados);
    }

    function mostrarProductos(lista) {
        if (lista.length === 0) {
            contenedor.innerHTML = "";
            mostrarMensajeSinRopa();
            return;
        }
        sinRopa.classList.add("d-none");
        renderizarTarjetas(lista, false);
    }

    function renderizarTarjetas(lista, mostrarTodas) {
        contenedor.innerHTML = "";
        const visibles = mostrarTodas ? lista : lista.slice(0, LIMITE_TARJETAS);
        visibles.forEach(producto => {
            const tarjeta = crearTarjeta(producto);
            contenedor.appendChild(tarjeta);
        });

        if (!mostrarTodas && lista.length > LIMITE_TARJETAS) {
            contenedor.appendChild(crearBotonVerMasCatalogo(lista));
        }
        actualizarBotonesVerMas();
    }

    function crearBotonVerMasCatalogo(lista) {
        const columna = document.createElement("div");
        columna.className = "col";

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "btn-ver-mas-catalogo";
        boton.setAttribute("aria-label", "Ver más prendas");
        boton.innerHTML = `<i class="bi bi-plus-lg"></i><span>Ver más</span>`;
        boton.addEventListener("click", () => {
            renderizarTarjetas(lista, true);
        });

        columna.appendChild(boton);
        return columna;
    }

    function mostrarMensajeSinRopa() {
        contenedor.innerHTML = "";
        sinRopa.querySelector("h3").textContent = "No hay ropa por el momento";
        sinRopa.querySelector("p").textContent = "Vuelve pronto para descubrir nuevas prendas.";
        sinRopa.classList.remove("d-none");
    }

    function crearTarjeta(producto) {
        const columna = document.createElement("div");
        columna.className = "col";

        const tarjeta = document.createElement("article");
        tarjeta.className = "tarjeta-ropa";

        const imagenContenedor = document.createElement("div");
        imagenContenedor.className = "ropa-imagen-contenedor";

        const imagen = document.createElement("img");
        imagen.className = "ropa-imagen";
        imagen.alt = "Prenda de Tu Bazar de Confianza";
        imagen.src = producto.foto ? urlFoto(producto.foto) : "https://placehold.co/600x800/f9edf3/8e2855?text=Sin+imagen";

        const estado = document.createElement("span");
        estado.className = "estado-prenda";
        if (producto.estado === "disponible") {
            estado.classList.add("estado-disponible");
            estado.textContent = "Disponible";
        } else if (producto.estado === "apartado") {
            estado.classList.add("estado-apartado");
            estado.textContent = "Apartado";
        } else {
            estado.classList.add("estado-comprado");
            estado.textContent = "Comprado";
        }

        imagenContenedor.appendChild(imagen);
        imagenContenedor.appendChild(estado);

        const superiorDerecha = document.createElement("div");
        superiorDerecha.className = "ropa-superior-derecha";
        const precioOverlay = document.createElement("span");
        precioOverlay.className = "precio-overlay";
        precioOverlay.textContent = formatearPrecio(producto.precio);
        superiorDerecha.appendChild(precioOverlay);
        imagenContenedor.appendChild(superiorDerecha);

        if (producto.estado === "disponible") {
            const inferiorIzquierda = document.createElement("div");
            inferiorIzquierda.className = "ropa-inferior-izquierda";
            inferiorIzquierda.appendChild(crearBotonWhatsapp(producto, true));
            imagenContenedor.appendChild(inferiorIzquierda);
        }

        const informacion = document.createElement("div");
        informacion.className = "ropa-info";

        const categoria = document.createElement("div");
        categoria.className = "ropa-categoria";
        categoria.textContent = formatearCategoriaFecha(producto);

        const descripcion = document.createElement("div");
        descripcion.className = "ropa-descripcion";
        descripcion.textContent = producto.descripcion || "";

        const botonVerMas = document.createElement("button");
        botonVerMas.type = "button";
        botonVerMas.className = "btn-ver-mas d-none";
        botonVerMas.textContent = "Ver más";
        botonVerMas.addEventListener("click", () => abrirModalDescripcion(producto));

        informacion.appendChild(categoria);
        informacion.appendChild(descripcion);
        informacion.appendChild(botonVerMas);

        tarjeta.appendChild(imagenContenedor);
        tarjeta.appendChild(informacion);
        columna.appendChild(tarjeta);

        return columna;
    }

    /* ==========================================
       BOTÓN "YO" Y MODAL DE OPCIONES
    ========================================== */

    function insertarEstilosModalPrenda() {
        if (document.getElementById("estilosModalOpcionesPrenda")) return;
        const estilo = document.createElement("style");
        estilo.id = "estilosModalOpcionesPrenda";
        estilo.textContent = `
            #modalOpcionesPrenda .modal-opciones-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0,0,0,.6);
            }
            #modalOpcionesPrenda .modal-opciones-contenido {
                position: relative;
                width: min(500px, 100%);
                max-height: 90vh;
                overflow-y: auto;
                padding: 28px;
                border-radius: 18px;
                background: #fff;
                box-shadow: 0 20px 60px rgba(0,0,0,.3);
                text-align: center;
            }
            #modalOpcionesPrenda h3 { margin: 0 0 12px; font-size: 25px; }
            #modalOpcionesPrenda p { margin: 8px 0; line-height: 1.5; }
            #modalOpcionesPrenda .modal-opciones-aviso {
                margin: 18px 0;
                padding: 12px;
                border-radius: 10px;
                background: #f3f3f3;
            }
            #modalOpcionesPrenda .modal-opciones-botones {
                display: grid;
                gap: 10px;
                margin-top: 20px;
            }
            #modalOpcionesPrenda .modal-opciones-botones button {
                width: 100%;
                padding: 13px 16px;
                border: 0;
                border-radius: 10px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
            }
            #modalOpcionesPrenda .opcion-grupo,
            #modalOpcionesPrenda .opcion-compartir {
                background: #25d366;
                color: #fff;
            }
            #modalOpcionesPrenda .opcion-copiar,
            #modalOpcionesPrenda .opcion-foto {
                background: #eee;
                color: #222;
            }
            #modalOpcionesPrenda .opcion-cerrar {
                background: transparent;
                color: #555;
            }
            #modalOpcionesPrenda .modal-opciones-cerrar {
                position: absolute;
                top: 8px;
                right: 12px;
                width: 38px !important;
                height: 38px;
                padding: 0 !important;
                border: 0;
                background: transparent;
                color: #555;
                font-size: 28px !important;
                cursor: pointer;
            }
        `;
        document.head.appendChild(estilo);
    }

    function mostrarOpcionesPrenda(imagenURL, fotoId) {
        insertarEstilosModalPrenda();

        const modalAnterior = document.getElementById("modalOpcionesPrenda");
        if (modalAnterior) modalAnterior.remove();

        const modal = document.createElement("div");
        modal.id = "modalOpcionesPrenda";

        modal.innerHTML = `
            <div class="modal-opciones-overlay">
                <div class="modal-opciones-contenido" role="dialog" aria-modal="true">
                    <button type="button" class="modal-opciones-cerrar" id="cerrarOpcionesPrenda" aria-label="Cerrar">×</button>
                    <h3>¡Prenda seleccionada!</h3>
                    <p>Ahora comparte la foto de esta prenda con el mensaje <strong>“Yo”</strong>.</p>
                    <p class="modal-opciones-aviso">
                        Si eres nueva: primero ingresa al grupo de WhatsApp, regresa a esta página
                        y después selecciona <strong>Compartir foto + “Yo”</strong>.
                    </p>
                    <div class="modal-opciones-botones">
                        <button type="button" id="btnIngresarGrupo" class="opcion-grupo">
                            🟢 Soy nueva, ingresar al grupo y regresar
                        </button>
                        <button type="button" id="btnCompartirPrenda" class="opcion-compartir">
                            📤 Compartir foto + “Yo”
                        </button>
                        <button type="button" id="btnCopiarYo" class="opcion-copiar">
                            📋 Copiar “Yo”
                        </button>
                        <button type="button" id="btnAbrirFoto" class="opcion-foto">
                            🖼️ Abrir foto de la prenda
                        </button>
                        <button type="button" id="btnCerrarOpciones" class="opcion-cerrar">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const cerrar = () => modal.remove();
        modal.querySelector("#cerrarOpcionesPrenda").addEventListener("click", cerrar);
        modal.querySelector("#btnCerrarOpciones").addEventListener("click", cerrar);

        modal.querySelector("#btnIngresarGrupo").addEventListener("click", () => {
            window.open(GRUPO_WHATSAPP, "_blank", "noopener");
        });

        modal.querySelector("#btnCompartirPrenda").addEventListener("click", async () => {
            await manejarCompartirFotoYo(imagenURL, fotoId);
            cerrar();
        });

        modal.querySelector("#btnCopiarYo").addEventListener("click", async () => {
            const copiado = await copiarTexto("Yo");
            if (copiado) {
                mostrarAvisoCopiado();
            } else {
                alert("No se pudo copiar automáticamente. Escribe “Yo” en WhatsApp.");
            }
        });

        modal.querySelector("#btnAbrirFoto").addEventListener("click", () => {
            if (imagenURL) window.open(imagenURL, "_blank", "noopener");
        });

        modal.querySelector(".modal-opciones-overlay").addEventListener("click", (evento) => {
            if (evento.target.classList.contains("modal-opciones-overlay")) cerrar();
        });
    }

    /* ==========================================
       MANEJAR COMPARTIR FOTO + "YO"
       (con descarga directa y apertura de grupo sin pop-ups)
    ========================================== */

    async function manejarCompartirFotoYo(imagenURL, fotoId) {
        // URL con Content-Disposition: attachment -> fuerza descarga real
        // (no depende de fetch/CORS como urlFoto).
        const imagenDescargaURL = fotoId ? urlDescargaFoto(fotoId) : imagenURL;

        let Swal;
        try {
            Swal = await cargarSweetAlert();
        } catch (e) {
            console.error("No se pudo cargar SweetAlert2", e);
            alert("No se pudo abrir el panel de compartir. Copia manualmente el texto 'Yo' y comparte la foto.");
            location.href = GRUPO_WHATSAPP;
            return;
        }

        // 1. Intentar usar navigator.share
        if (navigator.share && navigator.canShare) {
            try {
                const respuesta = await fetch(imagenURL);
                const blobImagen = await respuesta.blob();
                const extension = (blobImagen.type.split("/")[1] || "jpg").split("+")[0];
                const archivoImagen = new File(
                    [blobImagen],
                    `prenda.${extension}`,
                    { type: blobImagen.type }
                );
                if (navigator.canShare({ files: [archivoImagen], text: "Yo" })) {
                    await navigator.share({
                        files: [archivoImagen],
                        text: "Yo"
                    });
                    await Swal.fire({
                        icon: "success",
                        title: "¡Compartido!",
                        text: "La imagen y el mensaje se compartieron correctamente.",
                        confirmButtonText: "Abrir grupo",
                        confirmButtonColor: "#25d366",
                        customClass: { container: "swal2-container-ropa" },
                        preConfirm: () => {
                            location.href = GRUPO_WHATSAPP;
                        }
                    });
                    return;
                }
            } catch (error) {
                if (error && error.name === "AbortError") {
                    return;
                }
                console.warn("Falló navigator.share:", error);
            }
        }

        // 2. Intentar copiar imagen + texto al portapapeles (ClipboardItem)
        try {
            const respuesta = await fetch(imagenURL);
            const blobImagen = await respuesta.blob();
            const item = new ClipboardItem({
                [blobImagen.type]: blobImagen,
                "text/plain": new Blob(["Yo"], { type: "text/plain" })
            });
            await navigator.clipboard.write([item]);

            await Swal.fire({
                icon: "success",
                title: "¡Imagen y texto copiados!",
                text: "La foto y el mensaje 'Yo' están en tu portapapeles. Ve al grupo de WhatsApp y pégalos.",
                confirmButtonText: "Abrir grupo",
                confirmButtonColor: "#25d366",
                customClass: { container: "swal2-container-ropa" },
                preConfirm: () => {
                    location.href = GRUPO_WHATSAPP;
                }
            });
            return;
        } catch (error) {
            console.warn("Falló copiar imagen al portapapeles (ClipboardItem):", error);
            // Fallback: copiar solo texto
            try {
                await navigator.clipboard.writeText("Yo");
            } catch (e) {
                console.error("No se pudo copiar ni el texto:", e);
            }

            // Mostrar SweetAlert con opciones (descarga directa, abrir foto, abrir grupo)
            const resultado = await Swal.fire({
                icon: "warning",
                title: "No se pudo copiar la imagen",
                text: "El texto 'Yo' se copió, pero la imagen no se pudo adjuntar. Puedes descargar la foto o abrirla para guardarla manualmente.",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: "📥 Descargar imagen",
                denyButtonText: "🖼️ Abrir foto",
                cancelButtonText: "Abrir grupo",
                reverseButtons: true,
                confirmButtonColor: "#3085d6",
                denyButtonColor: "#6c757d",
                cancelButtonColor: "#25d366",
                customClass: { container: "swal2-container-ropa" },
                preConfirm: () => {
                    // Descarga directa: al usar la URL de getFileDownload
                    // (Content-Disposition: attachment) el navegador la
                    // descarga sola, sin necesidad de fetch/blob ni CORS.
                    descargarImagen(imagenDescargaURL);
                    return false; // no cerrar el diálogo
                },
                preDeny: () => {
                    window.open(imagenURL, "_blank", "noopener");
                    return false; // no cerrar el diálogo
                }
            });

            // SweetAlert2 no tiene "preCancel": el botón "Abrir grupo" es el
            // botón de Cancelar, así que se detecta aquí con el resultado.
            if (resultado.dismiss === Swal.DismissReason.cancel) {
                location.href = GRUPO_WHATSAPP;
            }
        }
    }

    /* ==========================================
       DESCARGAR IMAGEN (usando URL con
       Content-Disposition: attachment)
    ========================================== */

    function descargarImagen(url) {
        if (!url) return;
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = "prenda.jpg";
        enlace.rel = "noopener";
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
    }

    function crearBotonWhatsapp(producto, esOverlay = false) {
        const whatsapp = document.createElement("a");
        whatsapp.className = esOverlay ? "btn-whatsapp btn-whatsapp-overlay" : "btn-whatsapp";
        whatsapp.href = "#";
        const imagenURL = urlFoto(producto.foto);
        whatsapp.addEventListener("click", (evento) => {
            evento.preventDefault();
            mostrarOpcionesPrenda(imagenURL, producto.foto);
        });
        whatsapp.innerHTML = `<i class="bi bi-whatsapp"></i> YO`;
        return whatsapp;
    }

    async function copiarTexto(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            return true;
        } catch {
            return false;
        }
    }

    /* ==========================================
       VER MÁS: MOSTRAR / OCULTAR BOTÓN
    ========================================== */

    function actualizarBotonesVerMas() {
        requestAnimationFrame(() => {
            document.querySelectorAll(".ropa-descripcion").forEach(descripcion => {
                const boton = descripcion.nextElementSibling;
                if (!boton || !boton.classList.contains("btn-ver-mas")) return;
                const estaRecortada = descripcion.scrollHeight > descripcion.clientHeight + 1;
                boton.classList.toggle("d-none", !estaRecortada);
            });
        });
    }

    /* ==========================================
       MODAL: VER DESCRIPCIÓN COMPLETA
    ========================================== */

    function abrirModalDescripcion(producto) {
        const modalElemento = document.getElementById("modalDescripcion");
        if (!modalElemento) return;

        const imagen = document.getElementById("modalDescripcionImagen");
        const categoriaTitulo = document.getElementById("modalDescripcionCategoria");
        const texto = document.getElementById("modalDescripcionTexto");
        const precio = document.getElementById("modalDescripcionPrecio");
        const zonaWhatsapp = document.getElementById("modalDescripcionWhatsapp");

        imagen.src = producto.foto ? urlFoto(producto.foto) : "https://placehold.co/600x800/f9edf3/8e2855?text=Sin+imagen";
        imagen.alt = producto.categoria || "Prenda de Tu Bazar de Confianza";
        categoriaTitulo.textContent = formatearCategoriaFecha(producto);
        texto.textContent = producto.descripcion || "";
        precio.textContent = formatearPrecio(producto.precio);

        zonaWhatsapp.innerHTML = "";
        if (producto.estado === "disponible") {
            zonaWhatsapp.appendChild(crearBotonWhatsapp(producto));
        } else {
            const infoEstado = document.createElement("p");
            infoEstado.className = "modal-descripcion-estado-info";
            infoEstado.textContent = producto.estado === "apartado"
                ? "Esta prenda ya está apartada. 💛"
                : "Esta prenda ya fue vendida. 🤍";
            zonaWhatsapp.appendChild(infoEstado);
        }

        new bootstrap.Modal(modalElemento).show();
    }

    /* ==========================================
       AVISO DE MENSAJE COPIADO
    ========================================== */

    let temporizadorAviso = null;

    function mostrarAvisoCopiado() {
        const aviso = document.getElementById("avisoCopiado");
        if (!aviso) return;

        aviso.classList.remove("d-none");
        requestAnimationFrame(() => aviso.classList.add("visible"));

        clearTimeout(temporizadorAviso);
        temporizadorAviso = setTimeout(() => {
            aviso.classList.remove("visible");
            setTimeout(() => aviso.classList.add("d-none"), 300);
        }, 3500);
    }

    /* ==========================================
       FORMATEADORES
    ========================================== */

    function formatearFecha(fecha) {
        if (!fecha) return "";
        const partes = String(fecha).slice(0, 10).split("-");
        if (partes.length !== 3) return "";
        const [anio, mes, dia] = partes;
        return `${dia}/${mes}/${anio}`;
    }

    function formatearCategoriaFecha(producto) {
        const categoria = producto.categoria || "Ropa";
        const fecha = formatearFecha(producto.fecha);
        return fecha ? `${categoria} - ${fecha}` : categoria;
    }

    function formatearPrecio(precio) {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(precio);
    }

    /* ==========================================
       TIEMPO REAL
    ========================================== */

    function iniciarTiempoReal() {
        suscribirseAProductos(({ tipo, producto }) => {
            if (tipo === "crear") {
                if (!productos.some(p => p.id === producto.id)) {
                    productos.push(producto);
                }
            } else if (tipo === "actualizar") {
                const indice = productos.findIndex(p => p.id === producto.id);
                if (indice !== -1) {
                    productos[indice] = producto;
                } else {
                    productos.push(producto);
                }
            } else if (tipo === "eliminar") {
                productos = productos.filter(p => p.id !== producto.id);
            }
            productos = ordenarProductos(productos);
            reconstruirFiltrosCategorias();
            loader.classList.add("d-none");
            aplicarFiltros();
        });
    }

    /* ==========================================
       INICIAR
    ========================================== */

    inicializarFiltrosEstado();
    cargarProductos();
    iniciarTiempoReal();

});