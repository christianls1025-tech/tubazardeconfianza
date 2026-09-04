import {
    obtenerProductos as obtenerProductosFirebase,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    urlFoto,
    urlDescargaFoto,
    suscribirseAProductos
} from "./productos-service.js";

import {
    protegerPagina,
    cerrarSesion
} from "./auth.js";

// 👇 NUEVA IMPORTACIÓN
import { iniciarControlInactividad } from "./sesion-timeout.js";

/* ==========================================
   PROTEGER EL ACCESO A ESTA PÁGINA
========================================== */

let usuarioActual = null;

try {
    usuarioActual = await protegerPagina();
} catch (error) {
    console.error("Error al verificar sesión:", error);
    document.body.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: 'Poppins', sans-serif;">
            <h1 style="color: #8e2855;">Error al verificar la sesión</h1>
            <p style="color: #563546;">${error.message}</p>
            <a href="login.html" style="color: #d63384; text-decoration: none;">Ir al login</a>
        </div>
    `;
    throw error;
}

if (usuarioActual) {

    // ⚠️ IMPORTANTE: en lugar de usar DOMContentLoaded, se ejecuta
    // directamente porque el DOM ya está cargado (los módulos se ejecutan después)
    document.body.classList.add("sesion-verificada");

    // 👇 NUEVA LÍNEA: activa el detector de inactividad
    iniciarControlInactividad();

    const nombreUsuarioAdmin = document.getElementById("nombreUsuarioAdmin");
    if (nombreUsuarioAdmin) {
        nombreUsuarioAdmin.textContent = usuarioActual.name || usuarioActual.email;
    }

    const btnCerrarSesion = document.getElementById("btnCerrarSesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", cerrarSesion);
    }

    const form = document.getElementById("formProducto");
    const foto = document.getElementById("foto");
    const previewContainer = document.getElementById("previewContainer");
    const previewImagen = document.getElementById("previewImagen");
    const zonaImagen = document.getElementById("zonaImagen");
    const quitarImagen = document.getElementById("quitarImagen");
    const descripcion = document.getElementById("descripcion");
    const contadorCaracteres = document.getElementById("contadorCaracteres");
    const tablaProductos = document.getElementById("tablaProductos");
    const loader = document.getElementById("loaderAdmin");
    const sinProductos = document.getElementById("sinProductos");
    const totalProductos = document.getElementById("totalProductos");
    const tituloFormulario = document.getElementById("tituloFormulario");
    const btnGuardar = document.getElementById("btnGuardar");
    const btnCancelar = document.getElementById("btnCancelar");
    const productoId = document.getElementById("productoId");
    const estado = document.getElementById("estado");
    const paginacionProductos = document.getElementById("paginacionProductos");
    const buscarProducto = document.getElementById("buscarProducto");
    const filtroEstado = document.getElementById("filtroEstado");

    let productos = [];
    let idEliminar = null;
    const PRODUCTOS_POR_PAGINA = 10;
    let paginaActual = 1;
    const GRUPO_WHATSAPP = "https://chat.whatsapp.com/L27TM6CVe0R6IFYzoIs9O5";
    let sinAvisoTiempoRealHasta = 0;

    function suprimirAvisoTiempoReal(ms = 4000) {
        sinAvisoTiempoRealHasta = Date.now() + ms;
    }

    /* ==========================================
       FILTRAR PRODUCTOS DE LA TABLA
    ========================================== */
    function obtenerProductosFiltrados() {
        const termino = buscarProducto.value.trim().toLowerCase();
        const estadoSeleccionado = filtroEstado.value;
        return productos.filter(producto => {
            const coincideEstado = estadoSeleccionado === "todos" || producto.estado === estadoSeleccionado;
            const coincideTexto = !termino ||
                (producto.descripcion || "").toLowerCase().includes(termino) ||
                (producto.categoria || "").toLowerCase().includes(termino);
            return coincideEstado && coincideTexto;
        });
    }

    [buscarProducto, filtroEstado].forEach(control => {
        control.addEventListener(control === buscarProducto ? "input" : "change", () => {
            paginaActual = 1;
            mostrarTabla();
        });
    });

    /* ==========================================
       LEER RESPUESTA COMO JSON
    ========================================== */
    async function leerJSON(respuesta) {
        const tipoContenido = respuesta.headers.get("content-type") || "";
        const texto = await respuesta.text();
        if (!texto) throw new Error("El servidor no devolvió ninguna respuesta.");
        if (!tipoContenido.includes("application/json")) throw new Error("El servidor no respondió correctamente.");
        try { return JSON.parse(texto); } catch { throw new Error("No se pudo interpretar la respuesta."); }
    }

    /* ==========================================
       CARGAR PRODUCTOS
    ========================================== */
    async function cargarProductos() {
        loader.classList.remove("d-none");
        try {
            productos = await obtenerProductosFirebase();
            mostrarTabla();
        } catch (error) {
            console.error(error);
            mostrarToast(error.message || "No fue posible cargar las prendas.", "error");
        } finally {
            loader.classList.add("d-none");
        }
    }

    /* ==========================================
       MOSTRAR TABLA
    ========================================== */
    function mostrarTabla() {
        tablaProductos.innerHTML = "";
        totalProductos.textContent = `${productos.length} ${productos.length === 1 ? "prenda" : "prendas"}`;
        const listaFiltrada = obtenerProductosFiltrados();

        if (productos.length === 0) {
            sinProductos.querySelector("h3").textContent = "Todavía no hay prendas";
            sinProductos.querySelector("p").textContent = "Agrega la primera prenda utilizando el formulario.";
            sinProductos.classList.remove("d-none");
            paginacionProductos.innerHTML = "";
            return;
        }
        if (listaFiltrada.length === 0) {
            sinProductos.querySelector("h3").textContent = "Sin resultados";
            sinProductos.querySelector("p").textContent = "Ninguna prenda coincide con el filtro aplicado.";
            sinProductos.classList.remove("d-none");
            paginacionProductos.innerHTML = "";
            return;
        }

        sinProductos.classList.add("d-none");
        const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PRODUCTOS_POR_PAGINA));
        if (paginaActual > totalPaginas) paginaActual = totalPaginas;
        if (paginaActual < 1) paginaActual = 1;
        const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
        const productosPagina = listaFiltrada.slice(inicio, inicio + PRODUCTOS_POR_PAGINA);

        productosPagina.forEach(producto => {
            const fila = document.createElement("tr");
            const imagen = producto.foto ? urlFoto(producto.foto) : "https://placehold.co/100x120/f9edf3/8e2855?text=Sin+imagen";

            fila.innerHTML = `
                <td><img src="${imagen}" alt="Prenda" class="tabla-imagen"></td>
                <td><div class="descripcion-tabla">${escapeHTML(producto.descripcion || "")}</div></td>
                <td><strong>${formatearPrecio(producto.precio)}</strong></td>
                <td>${escapeHTML(producto.categoria || "")}</td>
                <td>${formatearFecha(producto.fecha)}</td>
                <td><span class="estado estado-${producto.estado}">${producto.estado}</span></td>
                <td>
                    <div class="acciones-tabla">
                        <button class="btn-tabla btn-editar" data-editar="${producto.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button class="btn-tabla btn-eliminar" data-eliminar="${producto.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                        <button class="btn-tabla btn-compartir" data-compartir="${producto.id}" title="Compartir"><i class="bi bi-share"></i></button>
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

        paginacionProductos.appendChild(crearItemPaginacion("Anterior", paginaActual - 1, paginaActual === 1));
        for (let pagina = 1; pagina <= totalPaginas; pagina++) {
            paginacionProductos.appendChild(crearItemPaginacion(pagina, pagina, false, pagina === paginaActual));
        }
        paginacionProductos.appendChild(crearItemPaginacion("Siguiente", paginaActual + 1, paginaActual === totalPaginas));
    }

    function crearItemPaginacion(etiqueta, paginaDestino, deshabilitado, activo = false) {
        const item = document.createElement("li");
        item.className = `page-item${deshabilitado ? " disabled" : ""}${activo ? " active" : ""}`;
        const enlace = document.createElement("a");
        enlace.className = "page-link";
        enlace.href = "#";
        enlace.textContent = etiqueta;
        if (activo) enlace.setAttribute("aria-current", "page");
        enlace.addEventListener("click", evento => {
            evento.preventDefault();
            if (deshabilitado || activo) return;
            paginaActual = paginaDestino;
            mostrarTabla();
            document.getElementById("tablaContainer").scrollIntoView({ behavior: "smooth", block: "start" });
        });
        item.appendChild(enlace);
        return item;
    }

    /* ==========================================
       EVENTOS TABLA
    ========================================== */
    function agregarEventosTabla() {
        document.querySelectorAll("[data-editar]").forEach(boton => {
            boton.addEventListener("click", () => editarProducto(boton.dataset.editar));
        });
        document.querySelectorAll("[data-compartir]").forEach(boton => {
            boton.addEventListener("click", () => compartirProductoAdmin(boton.dataset.compartir));
        });
        document.querySelectorAll("[data-eliminar]").forEach(boton => {
            boton.addEventListener("click", () => {
                idEliminar = boton.dataset.eliminar;
                const modal = new bootstrap.Modal(document.getElementById("modalEliminar"));
                modal.show();
            });
        });
    }

    /* ==========================================
       COMPARTIR DESDE ADMINISTRACIÓN
    ========================================== */
    let sweetAlertAdminCargado = false;

    function cargarSweetAlertAdmin() {
        return new Promise((resolve, reject) => {
            if (window.Swal) { sweetAlertAdminCargado = true; resolve(window.Swal); return; }
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
            script.onload = () => { sweetAlertAdminCargado = true; resolve(window.Swal); };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    if (!document.getElementById("estilosSweetAlertAdmin")) {
        const estilosSweetAlert = document.createElement("style");
        estilosSweetAlert.id = "estilosSweetAlertAdmin";
        estilosSweetAlert.textContent = `.swal2-container-admin { z-index: 100000 !important; }`;
        document.head.appendChild(estilosSweetAlert);
    }

    const mostrarSweetAlert = async (icon, title, text, confirmText = "Aceptar", callback = null) => {
        try {
            const Swal = await cargarSweetAlertAdmin();
            Swal.fire({
                icon, title, text, confirmButtonText: confirmText, confirmButtonColor: "#198754",
                customClass: { container: "swal2-container-admin" }
            }).then((result) => {
                if (result.isConfirmed && callback) callback();
            });
        } catch (error) { console.error("No se pudo cargar SweetAlert2:", error); }
    };

    function descargarImagenAdmin(url) {
        if (!url) return;
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = "prenda.jpg";
        enlace.rel = "noopener";
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
    }

    async function manejarCompartirFotoInfoAdmin(imagenURL, imagenDescargaURL, textoCompartir) {
        let Swal;
        try { Swal = await cargarSweetAlertAdmin(); }
        catch (e) {
            alert("No se pudo abrir el panel de compartir. Copia manualmente la información y comparte la foto.");
            window.open(GRUPO_WHATSAPP, "_blank", "noopener");
            return;
        }

        if (navigator.share && navigator.canShare) {
            try {
                const respuesta = await fetch(imagenURL);
                const blobImagen = await respuesta.blob();
                const extension = (blobImagen.type.split("/")[1] || "jpg").split("+")[0];
                const archivoImagen = new File([blobImagen], `prenda.${extension}`, { type: blobImagen.type });
                if (navigator.canShare({ files: [archivoImagen], text: textoCompartir })) {
                    await navigator.share({ files: [archivoImagen], text: textoCompartir });
                    await Swal.fire({
                        icon: "success", title: "¡Compartido!",
                        text: "La imagen y la información se compartieron correctamente.",
                        confirmButtonText: "Abrir grupo", confirmButtonColor: "#25d366",
                        customClass: { container: "swal2-container-admin" },
                        preConfirm: () => window.open(GRUPO_WHATSAPP, "_blank", "noopener")
                    });
                    return;
                }
            } catch (error) {
                if (error && error.name === "AbortError") return;
                console.warn("Falló navigator.share:", error);
            }
        }

        try {
            const respuesta = await fetch(imagenURL);
            const blobImagen = await respuesta.blob();
            const item = new ClipboardItem({
                [blobImagen.type]: blobImagen,
                "text/plain": new Blob([textoCompartir], { type: "text/plain" })
            });
            await navigator.clipboard.write([item]);
            await Swal.fire({
                icon: "success", title: "¡Imagen e información copiadas!",
                text: "La foto y la información de la prenda están en tu portapapeles. Ve al grupo de WhatsApp y pégalos.",
                confirmButtonText: "Abrir grupo", confirmButtonColor: "#25d366",
                customClass: { container: "swal2-container-admin" },
                preConfirm: () => window.open(GRUPO_WHATSAPP, "_blank", "noopener")
            });
            return;
        } catch (error) {
            console.warn("Falló copiar imagen al portapapeles (ClipboardItem):", error);
            try { await navigator.clipboard.writeText(textoCompartir); } catch (e) { console.error("No se pudo copiar el texto:", e); }

            const resultado = await Swal.fire({
                icon: "warning", title: "No se pudo copiar la imagen",
                text: "La información se copió, pero la imagen no se pudo adjuntar. Puedes descargar la foto o abrirla para guardarla manualmente.",
                showDenyButton: true, showCancelButton: true,
                confirmButtonText: "📥 Descargar imagen", denyButtonText: "🖼️ Abrir foto", cancelButtonText: "Abrir grupo",
                reverseButtons: true, confirmButtonColor: "#3085d6", denyButtonColor: "#6c757d", cancelButtonColor: "#25d366",
                customClass: { container: "swal2-container-admin" },
                preConfirm: () => { descargarImagenAdmin(imagenDescargaURL); return false; },
                preDeny: () => { window.open(imagenURL, "_blank", "noopener"); return false; }
            });

            if (resultado.dismiss === Swal.DismissReason.cancel) {
                window.open(GRUPO_WHATSAPP, "_blank", "noopener");
            }
        }
    }

    function mostrarOpcionesCompartirAdmin(imagenURL, imagenDescargaURL, textoCompartir) {
        const modalAnterior = document.getElementById("modalOpcionesCompartirAdmin");
        if (modalAnterior) modalAnterior.remove();
        const modal = document.createElement("div");
        modal.id = "modalOpcionesCompartirAdmin";
        modal.innerHTML = `
            <div class="modal-compartir-admin-overlay">
                <div class="modal-compartir-admin-contenido" role="dialog" aria-modal="true">
                    <button type="button" class="modal-compartir-admin-cerrar" id="cerrarCompartirAdmin" aria-label="Cerrar">×</button>
                    <h3>Compartir prenda</h3>
                    <p>Selecciona cómo quieres compartir la foto de esta prenda con su categoría, descripción y precio.</p>
                    <div class="modal-compartir-admin-botones">
                        <button type="button" id="btnCompartirAdmin" class="opcion-compartir-admin">📤 Compartir foto + información</button>
                        <button type="button" id="btnCopiarInfoAdmin" class="opcion-copiar-admin">📋 Copiar categoría, descripción y precio</button>
                        <button type="button" id="btnAbrirFotoAdmin" class="opcion-foto-admin">🖼️ Abrir foto de la prenda</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const cerrar = () => modal.remove();
        document.getElementById("cerrarCompartirAdmin").addEventListener("click", cerrar);
        document.getElementById("btnCompartirAdmin").addEventListener("click", async () => {
            cerrar();
            await manejarCompartirFotoInfoAdmin(imagenURL, imagenDescargaURL, textoCompartir);
        });
        document.getElementById("btnCopiarInfoAdmin").addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(textoCompartir);
                await mostrarSweetAlert("success", "¡Información copiada!", "La categoría, descripción y precio se copiaron al portapapeles.", "Abrir grupo", () => window.open(GRUPO_WHATSAPP, "_blank", "noopener"));
            } catch (error) {
                mostrarSweetAlert("error", "No se pudo copiar", "No fue posible copiar automáticamente la categoría, descripción y precio.", "Aceptar");
            }
        });
        document.getElementById("btnAbrirFotoAdmin").addEventListener("click", () => {
            if (imagenURL) window.open(imagenURL, "_blank", "noopener");
        });
    }

    function compartirProductoAdmin(id) {
        const producto = productos.find(p => p.id === id);
        if (!producto) return;
        const imagenURL = producto.foto ? urlFoto(producto.foto) : "";
        const imagenDescargaURL = producto.foto ? urlDescargaFoto(producto.foto) : "";
        const textoCompartir = `Categoría: ${producto.categoria || "Sin categoría"}\nDescripción: ${producto.descripcion || "Sin descripción"}\nPrecio: $${producto.precio != null ? producto.precio : "0.00"}`;
        if (!imagenURL) { alert("Esta prenda no tiene una foto disponible para compartir."); return; }
        mostrarOpcionesCompartirAdmin(imagenURL, imagenDescargaURL, textoCompartir);
    }

    /* ==========================================
       EDITAR
    ========================================== */
    function editarProducto(id) {
        const producto = productos.find(p => p.id === id);
        if (!producto) return;
        productoId.value = producto.id;
        descripcion.value = producto.descripcion || "";
        document.getElementById("precio").value = producto.precio;
        document.getElementById("categoria").value = producto.categoria || "";
        estado.value = producto.estado;
        if (producto.foto) {
            previewImagen.src = urlFoto(producto.foto);
            previewContainer.classList.remove("d-none");
            zonaImagen.classList.add("d-none");
        }
        tituloFormulario.textContent = "Editar prenda";
        btnGuardar.innerHTML = `<i class="bi bi-check-circle"></i> Actualizar prenda`;
        btnCancelar.classList.remove("d-none");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /* ==========================================
       CANCELAR EDICIÓN
    ========================================== */
    btnCancelar.addEventListener("click", limpiarFormulario);

    /* ==========================================
       GUARDAR / ACTUALIZAR
    ========================================== */
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const id = productoId.value;
        const datosProducto = {
            descripcion: descripcion.value,
            precio: document.getElementById("precio").value,
            categoria: document.getElementById("categoria").value,
            estado: estado.value
        };
        const archivoFoto = foto.files.length > 0 ? foto.files[0] : null;

        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Guardando...`;

        try {
            if (id) await actualizarProducto(id, datosProducto, archivoFoto);
            else await crearProducto(datosProducto, archivoFoto);
            mostrarToast(id ? "Prenda actualizada correctamente. 💗" : "Prenda agregada correctamente. 💗", "success");
            suprimirAvisoTiempoReal();
            limpiarFormulario();
            if (!id) paginaActual = 1;
            await cargarProductos();
        } catch (error) {
            console.error(error);
            mostrarToast(error.message || "No fue posible guardar la prenda.", "error");
        } finally {
            btnGuardar.disabled = false;
        }
    });

    /* ==========================================
       ELIMINAR
    ========================================== */
    document.getElementById("btnConfirmarEliminar").addEventListener("click", async () => {
        if (!idEliminar) return;
        try {
            await eliminarProducto(idEliminar);
            bootstrap.Modal.getInstance(document.getElementById("modalEliminar")).hide();
            mostrarToast("Prenda eliminada correctamente.", "success");
            suprimirAvisoTiempoReal();
            idEliminar = null;
            await cargarProductos();
        } catch (error) {
            mostrarToast(error.message || "No fue posible eliminar la prenda.", "error");
        }
    });

    /* ==========================================
       VISTA PREVIA
    ========================================== */
    foto.addEventListener("change", () => {
        const archivo = foto.files[0];
        if (!archivo) return;
        if (!archivo.type.startsWith("image/")) {
            mostrarToast("Selecciona una imagen válida.", "error");
            foto.value = "";
            return;
        }
        const lector = new FileReader();
        lector.onload = event => {
            previewImagen.src = event.target.result;
            previewContainer.classList.remove("d-none");
            zonaImagen.classList.add("d-none");
        };
        lector.readAsDataURL(archivo);
    });

    /* ==========================================
       QUITAR IMAGEN
    ========================================== */
    quitarImagen.addEventListener("click", () => {
        foto.value = "";
        previewImagen.src = "";
        previewContainer.classList.add("d-none");
        zonaImagen.classList.remove("d-none");
    });

    /* ==========================================
       CONTADOR
    ========================================== */
    descripcion.addEventListener("input", () => {
        contadorCaracteres.textContent = descripcion.value.length;
    });

    /* ==========================================
       LIMPIAR
    ========================================== */
    function limpiarFormulario() {
        form.reset();
        productoId.value = "";
        foto.value = "";
        previewImagen.src = "";
        previewContainer.classList.add("d-none");
        zonaImagen.classList.remove("d-none");
        contadorCaracteres.textContent = "0";
        tituloFormulario.textContent = "Agregar nueva prenda";
        btnGuardar.innerHTML = `<i class="bi bi-plus-circle"></i> Guardar prenda`;
        btnCancelar.classList.add("d-none");
    }

    /* ==========================================
       FECHA
    ========================================== */
    function formatearFecha(fecha) {
        if (!fecha) return "—";
        const partes = String(fecha).slice(0, 10).split("-");
        if (partes.length !== 3) return "—";
        const [anio, mes, dia] = partes;
        return `${dia}/${mes}/${anio}`;
    }

    /* ==========================================
       PRECIO
    ========================================== */
    function formatearPrecio(precio) {
        return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(precio);
    }

    /* ==========================================
       ESCAPAR HTML
    ========================================== */
    function escapeHTML(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    /* ==========================================
       TOAST
    ========================================== */
    function mostrarToast(mensaje, tipo) {
        const toast = document.getElementById("toastAdmin");
        const mensajeElemento = document.getElementById("toastMensaje");
        mensajeElemento.textContent = mensaje;
        toast.classList.remove("text-bg-danger", "text-bg-success");
        toast.classList.add(tipo === "error" ? "text-bg-danger" : "text-bg-success");
        new bootstrap.Toast(toast).show();
    }

    /* ==========================================
       TIEMPO REAL
    ========================================== */
    function iniciarTiempoReal() {
        suscribirseAProductos(({ tipo, producto }) => {
            if (tipo === "crear") {
                if (!productos.some(p => p.id === producto.id)) productos.push(producto);
            } else if (tipo === "actualizar") {
                const indice = productos.findIndex(p => p.id === producto.id);
                if (indice !== -1) productos[indice] = producto;
                else productos.push(producto);
            } else if (tipo === "eliminar") {
                productos = productos.filter(p => p.id !== producto.id);
            }
            mostrarTabla();
            if (Date.now() < sinAvisoTiempoRealHasta) return;
            const mensajes = {
                crear: `Se agregó una nueva prenda: ${producto.descripcion || "Sin descripción"}`,
                actualizar: `Se actualizó una prenda: ${producto.descripcion || "Sin descripción"}`,
                eliminar: "Se eliminó una prenda."
            };
            mostrarToast(mensajes[tipo] || "Hubo un cambio en las prendas.", "success");
        });
    }

    /* ==========================================
       INICIO
    ========================================== */
    cargarProductos();
    iniciarTiempoReal();

    /* Estilos del modal de compartir de administración */
    if (!document.getElementById("estilosModalCompartirAdmin")) {
        const estilos = document.createElement("style");
        estilos.id = "estilosModalCompartirAdmin";
        estilos.textContent = `
            .modal-compartir-admin-overlay {
                position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.55);
            }
            .modal-compartir-admin-contenido {
                position: relative; width: min(460px, 100%); padding: 30px 24px 24px; border-radius: 18px; background: #fff; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); text-align: center;
            }
            .modal-compartir-admin-contenido h3 { margin: 0 0 10px; }
            .modal-compartir-admin-contenido p { margin: 0 0 22px; line-height: 1.5; }
            .modal-compartir-admin-cerrar { position: absolute; top: 10px; right: 14px; border: 0; background: transparent; font-size: 30px; line-height: 1; cursor: pointer; }
            .modal-compartir-admin-botones { display: grid; gap: 10px; }
            .modal-compartir-admin-botones button { width: 100%; padding: 13px 16px; border: 0; border-radius: 10px; cursor: pointer; font-size: 15px; font-weight: 600; }
            .opcion-compartir-admin { background: #25d366; color: #fff; }
            .opcion-copiar-admin { background: #f1f1f1; color: #222; }
            .opcion-foto-admin { background: #eee; color: #222; }
            .btn-compartir { border: 0; cursor: pointer; }
        `;
        document.head.appendChild(estilos);
    }

}