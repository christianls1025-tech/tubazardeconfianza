/* ==========================================
   SERVICIO DE PRODUCTOS (APPWRITE)
   ------------------------------------------
   Todo vive en Appwrite: los DATOS en una
   colección de Databases y las FOTOS en un
   bucket de Storage. Mismo "contrato" que
   antes (mismas funciones exportadas), así
   que admin.js / ropa.js / dashboard.js no
   necesitan cambios.
========================================== */

import {
    databases,
    storage,
    client,
    DATABASE_ID,
    COLLECTION_PRODUCTOS_ID,
    BUCKET_PRENDAS_ID
} from "./appwrite-config.js";

import { ID, Query } from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

const ESTADOS_PERMITIDOS = ["disponible", "apartado", "comprado"];

/* ==========================================
   VALIDACIONES (mismas reglas que antes)
========================================== */

function validarDatos({ descripcion, precio, categoria, estado }) {
    if (!descripcion || !precio || !categoria || !estado) {
        throw new Error("Todos los campos son obligatorios.");
    }

    if (!ESTADOS_PERMITIDOS.includes(estado)) {
        throw new Error("El estado seleccionado no es válido.");
    }

    const precioNumero = Number(precio);

    if (!Number.isFinite(precioNumero) || precioNumero < 0) {
        throw new Error("El precio no es válido.");
    }

    return precioNumero;
}

/* ==========================================
   CONVERTIR DOCUMENTO DE APPWRITE A "PRODUCTO"
========================================== */

function convertirDocumento(documento) {
    return {
        id: documento.$id,
        descripcion: documento.descripcion,
        precio: documento.precio,
        categoria: documento.categoria,
        estado: documento.estado,
        fecha: documento.fecha,
        foto: documento.foto || null
    };
}

/* URL pública para mostrar una foto guardada en Storage */

export function urlFoto(fileId) {
    if (!fileId) return "";

    return storage
        .getFileView(BUCKET_PRENDAS_ID, fileId)
        .toString();
}

/* URL de DESCARGA forzada (Content-Disposition: attachment).
   A diferencia de urlFoto (getFileView), esta URL hace que el
   navegador descargue el archivo directamente en vez de mostrarlo,
   y no depende de que fetch() tenga permiso CORS. */

export function urlDescargaFoto(fileId) {
    if (!fileId) return "";

    return storage
        .getFileDownload(BUCKET_PRENDAS_ID, fileId)
        .toString();
}

/* ==========================================
   OBTENER TODAS LAS PRENDAS
========================================== */

export async function obtenerProductos() {
    const respuesta = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_PRODUCTOS_ID,
        [
            Query.orderDesc("$createdAt"),
            Query.limit(500)
        ]
    );

    return respuesta.documents.map(convertirDocumento);
}

/* ==========================================
   CREAR PRENDA
========================================== */

export async function crearProducto(datos, archivo) {
    const precioNumero = validarDatos(datos);

    let foto = null;

    if (archivo && archivo.size > 0) {
        if (!archivo.type.startsWith("image/")) {
            throw new Error("El archivo seleccionado no es una imagen.");
        }

        const subida = await storage.createFile(
            BUCKET_PRENDAS_ID,
            ID.unique(),
            archivo
        );

        foto = subida.$id;
    }

    const fecha = new Date().toISOString().slice(0, 10);

    const documento = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_PRODUCTOS_ID,
        ID.unique(),
        {
            descripcion: datos.descripcion,
            precio: precioNumero,
            categoria: datos.categoria,
            estado: datos.estado,
            fecha,
            foto
        }
    );

    return convertirDocumento(documento);
}

/* ==========================================
   ACTUALIZAR PRENDA
========================================== */

export async function actualizarProducto(id, datos, archivo) {
    if (!id) {
        throw new Error("ID inválido.");
    }

    const precioNumero = validarDatos(datos);

    const actual = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_PRODUCTOS_ID,
        id
    );

    let foto = actual.foto || null;

    if (archivo && archivo.size > 0) {
        if (!archivo.type.startsWith("image/")) {
            throw new Error("El archivo seleccionado no es una imagen.");
        }

        const fotoAnterior = foto;

        const subida = await storage.createFile(
            BUCKET_PRENDAS_ID,
            ID.unique(),
            archivo
        );

        foto = subida.$id;

        if (fotoAnterior) {
            try {
                await storage.deleteFile(BUCKET_PRENDAS_ID, fotoAnterior);
            } catch (error) {
                console.error("No se pudo eliminar la imagen anterior:", error);
            }
        }
    }

    /* La fecha nunca se modifica al editar */

    const documento = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_PRODUCTOS_ID,
        id,
        {
            descripcion: datos.descripcion,
            precio: precioNumero,
            categoria: datos.categoria,
            estado: datos.estado,
            foto
        }
    );

    return convertirDocumento(documento);
}

/* ==========================================
   TIEMPO REAL: ESCUCHAR CAMBIOS EN PRODUCTOS
   ------------------------------------------
   Se conecta al canal de Realtime de la colección
   de productos y avisa cada vez que se crea, edita
   o elimina un documento, sin necesidad de recargar
   la página ni de volver a pedir todo el listado.

   "onCambio" recibe un objeto:
     { tipo: "crear" | "actualizar" | "eliminar", producto }

   Devuelve una función para cancelar la suscripción
   (por si en algún momento se necesita dejar de
   escuchar, por ejemplo al salir de la página).
========================================== */

export function suscribirseAProductos(onCambio) {

    const canal =
        `databases.${DATABASE_ID}.collections.${COLLECTION_PRODUCTOS_ID}.documents`;

    const cancelar = client.subscribe(canal, (evento) => {

        const eventos = evento.events || [];

        let tipo = null;

        if (eventos.some(e => e.endsWith(".create"))) {
            tipo = "crear";
        } else if (eventos.some(e => e.endsWith(".update"))) {
            tipo = "actualizar";
        } else if (eventos.some(e => e.endsWith(".delete"))) {
            tipo = "eliminar";
        }

        if (!tipo) return;

        try {

            const producto = convertirDocumento(evento.payload);

            onCambio({ tipo, producto });

        } catch (error) {

            console.error(
                "Error procesando evento en tiempo real:",
                error
            );

        }

    });

    return cancelar;

}

/* ==========================================
   ELIMINAR PRENDA
========================================== */

export async function eliminarProducto(id) {
    if (!id) {
        throw new Error("ID inválido.");
    }

    const actual = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_PRODUCTOS_ID,
        id
    );

    const foto = actual.foto;

    await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_PRODUCTOS_ID,
        id
    );

    if (foto) {
        try {
            await storage.deleteFile(BUCKET_PRENDAS_ID, foto);
        } catch (error) {
            console.error("No se pudo eliminar la imagen:", error);
        }
    }
}
