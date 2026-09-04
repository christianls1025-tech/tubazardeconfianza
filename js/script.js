document.addEventListener("DOMContentLoaded", function () {

    const scrollHint = document.getElementById("scrollHint");

    if (scrollHint) {

        scrollHint.addEventListener("click", function () {

            /*
             * Actualmente la página solamente
             * contiene la portada.
             *
             * Cuando agreguemos contenido debajo,
             * este botón permitirá desplazarse
             * hacia la siguiente sección.
             */

            window.scrollTo({
                top: window.innerHeight,
                behavior: "smooth"
            });

        });

    }

});