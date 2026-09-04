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
