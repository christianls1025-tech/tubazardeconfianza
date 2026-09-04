/* ==========================================
   CONFIGURACIÓN DE APPWRITE
   ------------------------------------------
   Reemplaza los valores de aquí abajo por los
   de TU proyecto (Appwrite console).
========================================== */

import { Client, Databases, Storage, Account } from "https://cdn.jsdelivr.net/npm/appwrite@16.0.0/+esm";

const client = new Client();

client
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("6a9a217200006d355960");

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);
export { client };

export const DATABASE_ID = "6a9a251300006b2d084c";
export const COLLECTION_PRODUCTOS_ID = "productos";
export const BUCKET_PRENDAS_ID = "6a9a27aa001b8a4c0b66";