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
========================================== */

export async function obtenerUsuarioActual() {
    try {
        return await account.get();
    } catch (error) {
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
   Se debe llamar ANTES de mostrar cualquier
   contenido protegido (idealmente antes del
   DOMContentLoaded). Si no hay sesión activa,
   redirige de inmediato al login y devuelve
   null; el código que la llama debe evitar
   seguir ejecutándose en ese caso. Si hay
   sesión, devuelve el usuario.

   Se usa location.replace() (no location.href)
   para que la página de login no quede en el
   historial y el botón "atrás" no regrese al
   panel protegido.
========================================== */

export async function protegerPagina() {
    const usuario = await obtenerUsuarioActual();

    if (!usuario) {
        location.replace(PAGINA_LOGIN);
        return null;
    }

    return usuario;
}
