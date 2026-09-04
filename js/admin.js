import {
    obtenerProductos as obtenerProductosFirebase,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    urlFoto
} from "./productos-service.js";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("formProducto");

    const foto = document.getElementById("foto");

    const previewContainer =
        document.getElementById("previewContainer");

    const previewImagen =
        document.getElementById("previewImagen");

    const zonaImagen =
        document.getElementById("zonaImagen");

    const quitarImagen =
        document.getElementById("quitarImagen");

    const descripcion =
        document.getElementById("descripcion");

    const contadorCaracteres =
        document.getElementById("contadorCaracteres");

    const tablaProductos =
        document.getElementById("tablaProductos");

    const loader =
        document.getElementById("loaderAdmin");

    const sinProductos =
        document.getElementById("sinProductos");

    const totalProductos =
        document.getElementById("totalProductos");

    const tituloFormulario =
        document.getElementById("tituloFormulario");

    const btnGuardar =
        document.getElementById("btnGuardar");

    const btnCancelar =
        document.getElementById("btnCancelar");

    const productoId =
        document.getElementById("productoId");

    const estado =
        document.getElementById("estado");

    const paginacionProductos =
        document.getElementById("paginacionProductos");

    const buscarProducto =
        document.getElementById("buscarProducto");

    const filtroEstado =
        document.getElementById("filtroEstado");

    let productos = [];

    let idEliminar = null;

    const PRODUCTOS_POR_PAGINA = 10;

    let paginaActual = 1;



    /* ==========================================
       FILTRAR PRODUCTOS DE LA TABLA
       (por texto de búsqueda y por estado)
    ========================================== */

    function obtenerProductosFiltrados() {

        const termino =
            buscarProducto.value
                .trim()
                .toLowerCase();

        const estadoSeleccionado =
            filtroEstado.value;

        return productos.filter(producto => {

            const coincideEstado =
                estadoSeleccionado === "todos" ||
                producto.estado === estadoSeleccionado;

            const coincideTexto =
                !termino ||
                (producto.descripcion || "")
                    .toLowerCase()
                    .includes(termino) ||
                (producto.categoria || "")
                    .toLowerCase()
                    .includes(termino);

            return coincideEstado && coincideTexto;

        });

    }


    [buscarProducto, filtroEstado].forEach(control => {

        control.addEventListener(
            control === buscarProducto ? "input" : "change",
            () => {

                paginaActual = 1;

                mostrarTabla();

            }
        );

    });



    /* ==========================================
       LEER RESPUESTA COMO JSON DE FORMA SEGURA
       (evita "Unexpected token '<'..." cuando el
       servidor responde con una página HTML de
       error en lugar de JSON)
    ========================================== */

    async function leerJSON(respuesta) {

        const tipoContenido =
            respuesta.headers.get("content-type") || "";

        const texto =
            await respuesta.text();

        if (!texto) {

            throw new Error(
                "El servidor no devolvió ninguna respuesta. " +
                "Si subiste una foto, intenta con una imagen " +
                "más ligera o revisa tu conexión."
            );

        }

        if (!tipoContenido.includes("application/json")) {

            throw new Error(
                "El servidor no respondió correctamente. " +
                "Intenta de nuevo en unos minutos."
            );

        }

        try {

            return JSON.parse(texto);

        } catch (error) {

            throw new Error(
                "No se pudo interpretar la respuesta del servidor."
            );

        }

    }



    /* ==========================================
       CARGAR PRODUCTOS
    ========================================== */

    async function cargarProductos() {

        loader.classList.remove("d-none");

        try {

            productos =
                await obtenerProductosFirebase();

            mostrarTabla();

        } catch (error) {

            console.error(error);

            mostrarToast(
                error.message ||
                "No fue posible cargar las prendas.",
                "error"
            );

        } finally {

            loader.classList.add("d-none");

        }

    }



    /* ==========================================
       MOSTRAR TABLA
    ========================================== */

    function mostrarTabla() {

        tablaProductos.innerHTML = "";

        totalProductos.textContent =
            `${productos.length} ${
                productos.length === 1
                    ? "prenda"
                    : "prendas"
            }`;


        const listaFiltrada =
            obtenerProductosFiltrados();


        if (productos.length === 0) {

            sinProductos.querySelector("h3").textContent =
                "Todavía no hay prendas";

            sinProductos.querySelector("p").textContent =
                "Agrega la primera prenda utilizando el formulario.";

            sinProductos.classList.remove("d-none");

            paginacionProductos.innerHTML = "";

            return;

        }

        if (listaFiltrada.length === 0) {

            sinProductos.querySelector("h3").textContent =
                "Sin resultados";

            sinProductos.querySelector("p").textContent =
                "Ninguna prenda coincide con el filtro aplicado.";

            sinProductos.classList.remove("d-none");

            paginacionProductos.innerHTML = "";

            return;

        }

        sinProductos.classList.add("d-none");


        /*
         * PAGINACIÓN
         *
         * Se muestran únicamente 10 registros por
         * página, navegables con "Anterior", números
         * de página y "Siguiente". La paginación se
         * calcula sobre la lista ya filtrada.
         */

        const totalPaginas =
            Math.max(
                1,
                Math.ceil(
                    listaFiltrada.length / PRODUCTOS_POR_PAGINA
                )
            );

        if (paginaActual > totalPaginas) {
            paginaActual = totalPaginas;
        }

        if (paginaActual < 1) {
            paginaActual = 1;
        }

        const inicio =
            (paginaActual - 1) * PRODUCTOS_POR_PAGINA;

        const productosPagina =
            listaFiltrada.slice(
                inicio,
                inicio + PRODUCTOS_POR_PAGINA
            );


        productosPagina.forEach(producto => {

            const fila =
                document.createElement("tr");


            const imagen =
                producto.foto
                    ? urlFoto(producto.foto)
                    : "https://placehold.co/100x120/f9edf3/8e2855?text=Sin+imagen";


            fila.innerHTML = `

                <td>

                    <img
                        src="${imagen}"
                        alt="Prenda"
                        class="tabla-imagen"
                    >

                </td>


                <td>

                    <div class="descripcion-tabla">

                        ${escapeHTML(
                            producto.descripcion || ""
                        )}

                    </div>

                </td>


                <td>

                    <strong>
                        ${formatearPrecio(
                            producto.precio
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeHTML(
                        producto.categoria || ""
                    )}

                </td>


                <td>

                    ${formatearFecha(
                        producto.fecha
                    )}

                </td>


                <td>

                    <span class="
                        estado
                        estado-${producto.estado}
                    ">

                        ${producto.estado}

                    </span>

                </td>


                <td>

                    <div class="acciones-tabla">

                        <button
                            class="btn-tabla btn-editar"
                            data-editar="${producto.id}"
                            title="Editar"
                        >

                            <i class="bi bi-pencil"></i>

                        </button>


                        <button
                            class="btn-tabla btn-eliminar"
                            data-eliminar="${producto.id}"
                            title="Eliminar"
                        >

                            <i class="bi bi-trash"></i>

                        </button>


                        <button
                            class="btn-tabla btn-compartir"
                            data-compartir="${producto.id}"
                            title="Compartir"
                        >

                            <i class="bi bi-share"></i>

                        </button>

                    </div>

                </td>

            `;


            tablaProductos.appendChild(fila);

        });


        agregarEventosTabla();

        renderizarPaginacion(totalPaginas);

    }



    /* ==========================================
       RENDERIZAR PAGINACIÓN
    ========================================== */

    function renderizarPaginacion(totalPaginas) {

        paginacionProductos.innerHTML = "";

        if (totalPaginas <= 1) return;


        paginacionProductos.appendChild(
            crearItemPaginacion(
                "Anterior",
                paginaActual - 1,
                paginaActual === 1
            )
        );


        for (let pagina = 1; pagina <= totalPaginas; pagina++) {

            paginacionProductos.appendChild(
                crearItemPaginacion(
                    pagina,
                    pagina,
                    false,
                    pagina === paginaActual
                )
            );

        }


        paginacionProductos.appendChild(
            crearItemPaginacion(
                "Siguiente",
                paginaActual + 1,
                paginaActual === totalPaginas
            )
        );

    }


    function crearItemPaginacion(
        etiqueta,
        paginaDestino,
        deshabilitado,
        activo = false
    ) {

        const item =
            document.createElement("li");

        item.className =
            `page-item${deshabilitado ? " disabled" : ""}${activo ? " active" : ""}`;


        const enlace =
            document.createElement("a");

        enlace.className = "page-link";

        enlace.href = "#";

        enlace.textContent = etiqueta;

        if (activo) {
            enlace.setAttribute("aria-current", "page");
        }


        enlace.addEventListener("click", evento => {

            evento.preventDefault();

            if (deshabilitado || activo) return;

            paginaActual = paginaDestino;

            mostrarTabla();

            document
                .getElementById("tablaContainer")
                .scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        });


        item.appendChild(enlace);

        return item;

    }



    /* ==========================================
       EVENTOS TABLA
    ========================================== */

    function agregarEventosTabla() {

        document
            .querySelectorAll("[data-editar]")
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const id =
                            boton.dataset.editar;

                        editarProducto(id);

                    }
                );

            });


        document
            .querySelectorAll("[data-compartir]")
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        const id =
                            boton.dataset.compartir;

                        compartirProductoAdmin(id);

                    }
                );

            });


        document
            .querySelectorAll("[data-eliminar]")
            .forEach(boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        idEliminar =
                            boton.dataset.eliminar;

                        const modal =
                            new bootstrap.Modal(
                                document.getElementById(
                                    "modalEliminar"
                                )
                            );

                        modal.show();

                    }
                );

            });

    }



    /* ==========================================
       COMPARTIR DESDE ADMINISTRACIÓN
    ========================================== */

    async function compartirImagenAdmin(imagenURL, textoCompartir) {

        if (
            !imagenURL ||
            !navigator.share ||
            !navigator.canShare
        ) {
            return false;
        }

        try {

            const respuesta = await fetch(imagenURL);
            const blobImagen = await respuesta.blob();

            const extension =
                (blobImagen.type.split("/")[1] || "jpg")
                    .split("+")[0];

            const archivoImagen =
                new File(
                    [blobImagen],
                    `prenda.${extension}`,
                    { type: blobImagen.type }
                );

            if (!navigator.canShare({ files: [archivoImagen] })) {
                return false;
            }

            await navigator.share({
                files: [archivoImagen],
                text: textoCompartir
            });

            return true;

        } catch (error) {

            if (error && error.name === "AbortError") {
                return true;
            }

            console.error(
                "No se pudo compartir la imagen:",
                error
            );

            return false;
        }
    }


    function mostrarOpcionesCompartirAdmin(imagenURL, textoCompartir) {

        const modalAnterior =
            document.getElementById(
                "modalOpcionesCompartirAdmin"
            );

        if (modalAnterior) {
            modalAnterior.remove();
        }

        const modal = document.createElement("div");
        modal.id = "modalOpcionesCompartirAdmin";

        modal.innerHTML = `
            <div class="modal-compartir-admin-overlay">
                <div
                    class="modal-compartir-admin-contenido"
                    role="dialog"
                    aria-modal="true"
                >

                    <button
                        type="button"
                        class="modal-compartir-admin-cerrar"
                        id="cerrarCompartirAdmin"
                        aria-label="Cerrar"
                    >×</button>

                    <h3>Compartir prenda</h3>

                    <p>
                        Selecciona cómo quieres compartir la foto
                        de esta prenda con su categoría, descripción y precio.
                    </p>

                    <div class="modal-compartir-admin-botones">

                        <button
                            type="button"
                            id="btnCompartirAdmin"
                            class="opcion-compartir-admin"
                        >
                            📤 Compartir foto + información
                        </button>

                        <button
                            type="button"
                            id="btnCopiarInfoAdmin"
                            class="opcion-copiar-admin"
                        >
                            📋 Copiar categoría, descripción y precio
                        </button>

                        <button
                            type="button"
                            id="btnAbrirFotoAdmin"
                            class="opcion-foto-admin"
                        >
                            🖼️ Abrir foto de la prenda
                        </button>

                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const cerrar = () => modal.remove();

        // Cargar SweetAlert2 si todavía no está disponible
        const cargarSweetAlert = () => new Promise((resolve, reject) => {
            if (window.Swal) {
                resolve(window.Swal);
                return;
            }

            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
            script.onload = () => resolve(window.Swal);
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // SweetAlert2 debe quedar por encima del modal de compartir.
        if (!document.getElementById("estilosSweetAlertAdmin")) {
            const estilosSweetAlert = document.createElement("style");
            estilosSweetAlert.id = "estilosSweetAlertAdmin";
            estilosSweetAlert.textContent = `
                .swal2-container-admin {
                    z-index: 100000 !important;
                }
            `;
            document.head.appendChild(estilosSweetAlert);
        }

        const mostrarSweetAlert = async (icon, title, text) => {
            try {
                const Swal = await cargarSweetAlert();
                Swal.fire({
                    icon,
                    title,
                    text,
                    confirmButtonText: "Aceptar",
                    confirmButtonColor: "#198754",
                    customClass: {
                        container: "swal2-container-admin"
                    }
                });
            } catch (error) {
                console.error("No se pudo cargar SweetAlert2:", error);
            }
        };

        document
            .getElementById("cerrarCompartirAdmin")
            .addEventListener("click", cerrar);

        document
            .getElementById("btnCompartirAdmin")
            .addEventListener("click", async () => {

                const compartido =
                    await compartirImagenAdmin(imagenURL, textoCompartir);

                if (!compartido) {

                    try {
                        await navigator.clipboard.writeText(textoCompartir);
                        mostrarSweetAlert(
                            "success",
                            "¡Información copiada!",
                            "La categoría, descripción y precio se copiaron al portapapeles. Ahora puedes abrir WhatsApp y adjuntar la foto."
                        );
                    } catch (error) {
                        await mostrarSweetAlert(
                            "warning",
                            "No se pudo compartir automáticamente",
                            "Usa “Copiar categoría, descripción y precio” y después adjunta la foto."
                        );
                    }
                }
            });

        document
            .getElementById("btnCopiarInfoAdmin")
            .addEventListener("click", async () => {

                try {
                    await navigator.clipboard.writeText(textoCompartir);
                    await mostrarSweetAlert(
                        "success",
                        "¡Información copiada!",
                        "La categoría, descripción y precio se copiaron al portapapeles."
                    );
                } catch (error) {
                    mostrarSweetAlert(
                        "error",
                        "No se pudo copiar",
                        "No fue posible copiar automáticamente la categoría, descripción y precio."
                    );
                }
            });

        document
            .getElementById("btnAbrirFotoAdmin")
            .addEventListener("click", () => {

                if (imagenURL) {
                    window.open(
                        imagenURL,
                        "_blank",
                        "noopener"
                    );
                }
            });
    }


    function compartirProductoAdmin(id) {

        const producto =
            productos.find(
                p => p.id === id
            );

        if (!producto) return;

        const imagenURL = producto.foto
            ? urlFoto(producto.foto)
            : "";

        const textoCompartir =
            `Categoría: ${producto.categoria || "Sin categoría"}\n` +
            `Descripción: ${producto.descripcion || "Sin descripción"}\n` +
            `Precio: $${producto.precio != null ? producto.precio : "0.00"}`;

        if (!imagenURL) {
            alert("Esta prenda no tiene una foto disponible para compartir.");
            return;
        }

        mostrarOpcionesCompartirAdmin(imagenURL, textoCompartir);
    }


    /* ==========================================
       EDITAR
    ========================================== */

    function editarProducto(id) {

        const producto =
            productos.find(
                p => p.id === id
            );

        if (!producto) return;


        productoId.value =
            producto.id;

        descripcion.value =
            producto.descripcion || "";

        document.getElementById("precio").value =
            producto.precio;

        document.getElementById("categoria").value =
            producto.categoria || "";

        estado.value =
            producto.estado;


        if (producto.foto) {

            previewImagen.src =
                urlFoto(producto.foto);

            previewContainer.classList.remove(
                "d-none"
            );

            zonaImagen.classList.add(
                "d-none"
            );

        }


        tituloFormulario.textContent =
            "Editar prenda";

        btnGuardar.innerHTML =
            `<i class="bi bi-check-circle"></i>
             Actualizar prenda`;

        btnCancelar.classList.remove(
            "d-none"
        );


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }



    /* ==========================================
       CANCELAR EDICIÓN
    ========================================== */

    btnCancelar.addEventListener(
        "click",
        limpiarFormulario
    );



    /* ==========================================
       GUARDAR / ACTUALIZAR
    ========================================== */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                productoId.value;


            const datosProducto = {
                descripcion: descripcion.value,
                precio: document.getElementById("precio").value,
                categoria: document.getElementById("categoria").value,
                estado: estado.value
            };

            const archivoFoto =
                foto.files.length > 0
                    ? foto.files[0]
                    : null;


            btnGuardar.disabled = true;

            btnGuardar.innerHTML =
                `<span class="spinner-border spinner-border-sm"></span>
                 Guardando...`;


            try {

                if (id) {
                    await actualizarProducto(
                        id,
                        datosProducto,
                        archivoFoto
                    );
                } else {
                    await crearProducto(
                        datosProducto,
                        archivoFoto
                    );
                }


                mostrarToast(
                    id
                        ? "Prenda actualizada correctamente. 💗"
                        : "Prenda agregada correctamente. 💗",
                    "success"
                );


                limpiarFormulario();

                if (!id) {
                    paginaActual = 1;
                }

                await cargarProductos();


            } catch (error) {

                console.error(error);

                mostrarToast(
                    error.message ||
                    "No fue posible guardar la prenda.",
                    "error"
                );

            } finally {

                btnGuardar.disabled = false;

            }

        }
    );



    /* ==========================================
       ELIMINAR
    ========================================== */

    document
        .getElementById(
            "btnConfirmarEliminar"
        )
        .addEventListener(
            "click",
            async () => {

                if (!idEliminar) return;


                try {

                    await eliminarProducto(idEliminar);


                    bootstrap.Modal
                        .getInstance(
                            document.getElementById(
                                "modalEliminar"
                            )
                        )
                        .hide();


                    mostrarToast(
                        "Prenda eliminada correctamente.",
                        "success"
                    );


                    idEliminar = null;

                    await cargarProductos();


                } catch (error) {

                    mostrarToast(
                        error.message ||
                        "No fue posible eliminar la prenda.",
                        "error"
                    );

                }

            }
        );



    /* ==========================================
       VISTA PREVIA
    ========================================== */

    foto.addEventListener(
        "change",
        () => {

            const archivo =
                foto.files[0];

            if (!archivo) return;


            if (
                !archivo.type.startsWith(
                    "image/"
                )
            ) {

                mostrarToast(
                    "Selecciona una imagen válida.",
                    "error"
                );

                foto.value = "";

                return;

            }


            const lector =
                new FileReader();


            lector.onload =
                event => {

                    previewImagen.src =
                        event.target.result;

                    previewContainer.classList.remove(
                        "d-none"
                    );

                    zonaImagen.classList.add(
                        "d-none"
                    );

                };


            lector.readAsDataURL(
                archivo
            );

        }
    );



    /* ==========================================
       QUITAR IMAGEN
    ========================================== */

    quitarImagen.addEventListener(
        "click",
        () => {

            foto.value = "";

            previewImagen.src = "";

            previewContainer.classList.add(
                "d-none"
            );

            zonaImagen.classList.remove(
                "d-none"
            );

        }
    );



    /* ==========================================
       CONTADOR
    ========================================== */

    descripcion.addEventListener(
        "input",
        () => {

            contadorCaracteres.textContent =
                descripcion.value.length;

        }
    );



    /* ==========================================
       LIMPIAR
    ========================================== */

    function limpiarFormulario() {

        form.reset();

        productoId.value = "";

        foto.value = "";

        previewImagen.src = "";

        previewContainer.classList.add(
            "d-none"
        );

        zonaImagen.classList.remove(
            "d-none"
        );

        contadorCaracteres.textContent =
            "0";


        tituloFormulario.textContent =
            "Agregar nueva prenda";

        btnGuardar.innerHTML =
            `<i class="bi bi-plus-circle"></i>
             Guardar prenda`;

        btnCancelar.classList.add(
            "d-none"
        );

    }



    /* ==========================================
       FECHA
    ========================================== */

    function formatearFecha(fecha) {

        if (!fecha) return "—";

        /*
         * Llega como "AAAA-MM-DD" (tipo DATE de
         * PostgreSQL). Se arma el texto directo del
         * string para evitar corrimientos de un día
         * por zona horaria al usar new Date().
         */

        const partes =
            String(fecha).slice(0, 10).split("-");

        if (partes.length !== 3) return "—";

        const [anio, mes, dia] = partes;

        return `${dia}/${mes}/${anio}`;

    }



    /* ==========================================
       PRECIO
    ========================================== */

    function formatearPrecio(precio) {

        return new Intl.NumberFormat(
            "es-MX",
            {
                style: "currency",
                currency: "MXN"
            }
        ).format(precio);

    }



    /* ==========================================
       ESCAPAR HTML
    ========================================== */

    function escapeHTML(texto) {

        const div =
            document.createElement("div");

        div.textContent = texto;

        return div.innerHTML;

    }



    /* ==========================================
       TOAST
    ========================================== */

    function mostrarToast(
        mensaje,
        tipo
    ) {

        const toast =
            document.getElementById(
                "toastAdmin"
            );

        const mensajeElemento =
            document.getElementById(
                "toastMensaje"
            );


        mensajeElemento.textContent =
            mensaje;


        toast.classList.remove(
            "text-bg-danger",
            "text-bg-success"
        );


        toast.classList.add(
            tipo === "error"
                ? "text-bg-danger"
                : "text-bg-success"
        );


        new bootstrap.Toast(
            toast
        ).show();

    }



    /* ==========================================
       INICIO
    ========================================== */

    cargarProductos();



    /* Estilos del modal de compartir de administración */
    if (!document.getElementById("estilosModalCompartirAdmin")) {

        const estilos = document.createElement("style");
        estilos.id = "estilosModalCompartirAdmin";
        estilos.textContent = `
            .modal-compartir-admin-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(0, 0, 0, 0.55);
            }

            .modal-compartir-admin-contenido {
                position: relative;
                width: min(460px, 100%);
                padding: 30px 24px 24px;
                border-radius: 18px;
                background: #fff;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
                text-align: center;
            }

            .modal-compartir-admin-contenido h3 {
                margin: 0 0 10px;
            }

            .modal-compartir-admin-contenido p {
                margin: 0 0 22px;
                line-height: 1.5;
            }

            .modal-compartir-admin-cerrar {
                position: absolute;
                top: 10px;
                right: 14px;
                border: 0;
                background: transparent;
                font-size: 30px;
                line-height: 1;
                cursor: pointer;
            }

            .modal-compartir-admin-botones {
                display: grid;
                gap: 10px;
            }

            .modal-compartir-admin-botones button {
                width: 100%;
                padding: 13px 16px;
                border: 0;
                border-radius: 10px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
            }

            .opcion-compartir-admin {
                background: #25d366;
                color: #fff;
            }

            .opcion-copiar-admin {
                background: #f1f1f1;
                color: #222;
            }

            .opcion-foto-admin {
                background: #eee;
                color: #222;
            }

            .btn-compartir {
                border: 0;
                cursor: pointer;
            }
        `;

        document.head.appendChild(estilos);
    }

});
