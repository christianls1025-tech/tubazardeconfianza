import {
    obtenerUsuarioActual,
    iniciarSesion
} from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("formLogin");
    const correo = document.getElementById("correo");
    const contrasena = document.getElementById("contrasena");
    const btnIngresar = document.getElementById("btnIngresar");
    const mensajeError = document.getElementById("mensajeError");

    const TEXTO_BOTON_NORMAL = "Ingresar";

    /* Si ya hay una sesión activa, no tiene sentido mostrar
       el login: se manda directo al panel de administración. */
    async function verificarSesionExistente() {
        const usuario = await obtenerUsuarioActual();
        if (usuario) {
            location.replace("admin.html");
        }
    }

    function mostrarError(texto) {
        mensajeError.textContent = texto;
        mensajeError.classList.remove("d-none");
    }

    function ocultarError() {
        mensajeError.classList.add("d-none");
    }

    function mensajeDeError(error) {
        // Appwrite responde 401 cuando el usuario o la
        // contraseña no coinciden.
        if (error && error.code === 401) {
            return "Usuario o contraseña incorrectos.";
        }

        return (error && error.message) ||
            "No se pudo iniciar sesión. Intenta de nuevo.";
    }

    form.addEventListener("submit", async (evento) => {

        evento.preventDefault();
        ocultarError();

        btnIngresar.disabled = true;
        btnIngresar.innerHTML =
            `<span class="spinner-border spinner-border-sm"></span> Ingresando...`;

        try {

            await iniciarSesion(
                correo.value.trim(),
                contrasena.value
            );

            location.replace("admin.html");

        } catch (error) {

            console.error("Error al iniciar sesión:", error);

            mostrarError(mensajeDeError(error));

            btnIngresar.disabled = false;
            btnIngresar.innerHTML = TEXTO_BOTON_NORMAL;

        }

    });

    verificarSesionExistente();

});
