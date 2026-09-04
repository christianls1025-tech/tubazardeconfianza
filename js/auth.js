/* ==========================================
   AUTENTICACIÓN (APPWRITE ACCOUNT)
   ------------------------------------------
   Funciones reutilizables para el login del
   panel de administración. Usa el servicio
   nativo "Account" de Appwrite: las contraseñas
   quedan hasheadas del lado de Appwrite y nunca
   viajan ni se guardan en texto plano en una
   colección propia.
========================================== */

import { account } from "./appwrite-config.js";

const PAGINA_LOGIN = "login.html";

/* ==========================================
   OBTENER USUARIO ACTUAL (o null si no hay sesión)
   ------------------------------------------
   Se añade un Promise.race con un Timeout de 5
   segundos para evitar que la página se quede
   cargando infinitamente si Appwrite tarda en
   responder o se bloquea la conexión.
========================================== */

export async function obtenerUsuarioActual() {
    try {
        // Timeout de 5 segundos (5000 ms)
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tiempo de espera agotado")), 5000)
        );

        return await Promise.race([account.get(), timeout]);
    } catch (error) {
        console.error("Error al obtener usuario (o timeout):", error);
        return null;
    }
}

/* ==========================================
   INICIAR SESIÓN
========================================== */

export async function iniciarSesion(correo, contrasena) {
    return account.createEmailPasswordSession(correo, contrasena);
}

/* ==========================================
   CERRAR SESIÓN
========================================== */

export async function cerrarSesion() {
    try {
        await account.deleteSession("current");
    } catch (error) {
        console.error("No se pudo cerrar la sesión:", error);
    } finally {
        location.replace(PAGINA_LOGIN);
    }
}

/* ==========================================
   PROTEGER UNA PÁGINA
   ------------------------------------------
   Si la sesión expiró o no existe, redirige a
   login. Si hay un error de conexión o timeout,
   también redirige o devuelve null.
========================================== */

export async function protegerPagina() {
    const usuario = await obtenerUsuarioActual();

    if (!usuario) {
        location.replace(PAGINA_LOGIN);
        return null;
    }

    return usuario;
}