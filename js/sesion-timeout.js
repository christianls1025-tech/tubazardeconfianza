/* ==========================================
   CONTROL DE INACTIVIDAD Y CIERRE DE SESIÓN
   ------------------------------------------
   - Redirige al login después de 5 minutos sin
     actividad (mouse, teclado, scroll, click).
   - Intenta cerrar la sesión al cerrar la pestaña
     o navegador (evento beforeunload), aunque no
     es garantizado por el navegador.
========================================== */

import { cerrarSesion } from "./auth.js";

const TIEMPO_INACTIVIDAD_MS = 5 * 60 * 1000; // 5 minutos

let temporizadorInactividad = null;

/* Reinicia el temporizador en cada interacción */
function reiniciarTemporizador() {
    clearTimeout(temporizadorInactividad);
    temporizadorInactividad = setTimeout(() => {
        cerrarSesion(); // Llama a auth.js -> elimina sesión y redirige a login
    }, TIEMPO_INACTIVIDAD_MS);
}

/* Eventos que cuentan como actividad */
const eventosActividad = [
    'click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'resize'
];

/* Inicializa el detector de inactividad */
export function iniciarControlInactividad() {
    // Reinicia al cargar la página
    reiniciarTemporizador();

    // Añade listeners
    eventosActividad.forEach(evento => {
        window.addEventListener(evento, reiniciarTemporizador);
    });

    // Intenta cerrar sesión cuando se cierra la pestaña (no garantizado)
    window.addEventListener('beforeunload', () => {
        cerrarSesion(); // Esto podría no completarse, pero intenta
    });
}

/* Opcional: función para detener el control (no usada normalmente) */
export function detenerControlInactividad() {
    clearTimeout(temporizadorInactividad);
    eventosActividad.forEach(evento => {
        window.removeEventListener(evento, reiniciarTemporizador);
    });
}