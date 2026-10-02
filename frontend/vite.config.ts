import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// El proxy sirve API y SignalR desde el mismo origen que la SPA:
// sin CORS y la cookie HttpOnly del token de refresco funciona con SameSite=Strict.
// URL_API permite apuntar a otra instancia (ej. URL_API=http://localhost:5258 npm run dev).
const urlApi = process.env.URL_API ?? 'http://localhost:5080';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Excalidraw lee process.env.IS_PREACT en tiempo de ejecución; sin esto el navegador lanza "process is not defined".
  define: {
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  // `npm run build` deja la web directamente en wwwroot de la API, que la sirve en el mismo sitio (IIS).
  build: {
    outDir: '../SolucionProductividad/src/Presentacion/APIWeb/wwwroot',
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PUERTO ?? 5173),
    proxy: {
      '/api': { target: urlApi, changeOrigin: true },
      '/hubs': { target: urlApi, changeOrigin: true, ws: true },
    },
  },
});
