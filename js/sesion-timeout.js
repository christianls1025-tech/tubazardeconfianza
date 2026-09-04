/* ==========================================
   CONTROL DE INACTIVIDAD Y CIERRE DE SESIÓN
   ------------------------------------------
   - Cierra la sesión automáticamente después de 10 minutos sin actividad.
   - Muestra un SweetAlert informativo y redirige al login al confirmar.
========================================== */

import { account } from "./appwrite-config.js";

const TIEMPO_INACTIVIDAD_MS = 10 * 60 * 1000; // 10 minutos

let temporizadorInactividad = null;

/* ==========================================
   CARGAR SWEETALERT2 (dinámico)
========================================== */

function cargarSweetAlert() {
    return new Promise((resolve, reject) => {
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
}

/* ==========================================
   CERRAR SESIÓN POR INACTIVIDAD
========================================== */

async function cerrarSesionPorInactividad() {
    try {
        // Eliminar la sesión actual en Appwrite (la sesión ya no queda activa)
        await account.deleteSession("current");
    } catch (error) {
        console.error("Error al cerrar sesión por inactividad:", error);
    }

    try {
        const Swal = await cargarSweetAlert();
        await Swal.fire({
            title: 'Sesión cerrada',
            text: 'Se cerró la sesión por inactividad.',
            icon: 'info',
            confirmButtonText: 'Ir al login',
            confirmButtonColor: '#d63384',
            allowOutsideClick: false,
            allowEscapeKey: false
        });
    } catch (error) {
        console.error("No se pudo cargar SweetAlert:", error);
    }

    // Redirigir al login después del alert (o si falla)
    window.location.replace("login.html");
}

/* Reinicia el temporizador en cada interacción */
function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(cerrarSesionPorInactividad, TIEMPO_INACTIVIDAD_MS);
}

/* Eventos que cuentan como actividad */
const eventosActividad = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'resize'];

/* Inicializa el detector de inactividad */
export function iniciarControlInactividad() {
    reiniciarTemporizador();

    eventosActividad.forEach(evento => {
        window.addEventListener(evento, reiniciarTemporizador);
    });

    // Intenta cerrar sesión al cerrar la pestaña (opcional)
    window.addEventListener('beforeunload', () => {
        account.deleteSession("current").catch(() => {});
    });
}

/* Opcional: función para detener el control (no usada normalmente) */
export function detenerControlInactividad() {
    clearTimeout(temporizadorInactividad);
    eventosActividad.forEach(evento => {
        window.removeEventListener(evento, reiniciarTemporizador);
    });
}