/* ==========================================
   CONFIGURACIÓN DE APPWRITE
   ------------------------------------------
   Reemplaza los valores de aquí abajo por los
   de TU proyecto (Appwrite console).

   - ENDPOINT y PROJECT_ID: Configuración del
     proyecto > "Descripción general" (o el
     botón "Add SDK" / "Instalar SDK").
   - DATABASE_ID y COLLECTION_PRODUCTOS_ID:
     Databases > tu base de datos > tu colección.
   - BUCKET_PRENDAS_ID: Storage > tu bucket.
========================================== */

import { Client, Databases, Storage, Account } from "https://cdn.jsdelivr.net/npm/appwrite@16.0.0/+esm";

const client = new Client();

client
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("6a9a217200006d355960");

export const databases = new Databases(client);
export const storage = new Storage(client);

/* Account: servicio nativo de autenticación de Appwrite.
   Guarda las contraseñas ya hasheadas (nunca en texto plano)
   y maneja las sesiones de forma segura; se usa para el login
   de administración (ver auth.js y login.js). */
export const account = new Account(client);

/* Se exporta también el cliente para poder usar
   Appwrite Realtime (client.subscribe) desde otros
   archivos, por ejemplo para detectar en vivo cuando
   se crea, edita o elimina un producto. */
export { client };

export const DATABASE_ID = "6a9a251300006b2d084c";
export const COLLECTION_PRODUCTOS_ID = "productos";
export const BUCKET_PRENDAS_ID = "6a9a27aa001b8a4c0b66";