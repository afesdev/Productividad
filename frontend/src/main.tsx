import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { ProveedorSesion, RutaProtegida } from './caracteristicas/autenticacion/ContextoSesion';
import { DisposicionPrincipal } from './componentes/DisposicionPrincipal';
import { ProveedorConfirmacion } from './componentes/ui/DialogoConfirmacion';
import { ProveedorRevisionIA } from './componentes/editor/RevisionIA';
import { PaginaAutenticacion } from './paginas/PaginaAutenticacion';
import { PaginaBoveda } from './paginas/PaginaBoveda';
import { PaginaTiempo } from './paginas/PaginaTiempo';
import { PaginaDiario, RedireccionRegistroDiario } from './paginas/PaginaDiario';
import { PaginaDetalleTarea } from './paginas/PaginaDetalleTarea';
import { PaginaDetalleTicket } from './paginas/PaginaDetalleTicket';
import { PaginaNuevoTicket } from './paginas/PaginaNuevoTicket';
import { PaginaRepositorios } from './paginas/PaginaRepositorios';
import { PaginaGrafoRepositorio } from './paginas/PaginaGrafoRepositorio';
import { PaginaProyectosSoporte } from './paginas/PaginaProyectosSoporte';
import { PaginaTickets } from './paginas/PaginaTickets';
import { PaginaMatriz } from './paginas/PaginaMatriz';
import { PaginaNuevaTarea } from './paginas/PaginaNuevaTarea';
import { PaginaTablero } from './paginas/PaginaTablero';
import { PaginaTareas } from './paginas/PaginaTareas';
import { PaginaLienzos } from './paginas/PaginaLienzos';
import { usarTema } from './servicios/tema';
import './index.css';

function NotificacionesConTema() {
  const { oscuro } = usarTema();
  return <Toaster position="top-center" offset={{ top: 68 }} theme={oscuro ? 'dark' : 'light'} />;
}

// El editor (Tiptap + resaltado de sintaxis) pesa ~1 MB: se descarga solo al entrar a Documentos.
const PaginaDocumentos = lazy(() => import('./paginas/PaginaDocumentos').then((modulo) => ({ default: modulo.PaginaDocumentos })));
const documentosDiferidos = (
  <Suspense fallback={<div className="py-24 text-center text-sm text-texto-3">Cargando editor…</div>}>
    <PaginaDocumentos />
  </Suspense>
);

// Excalidraw pesa bastante: el editor del lienzo se descarga solo al abrir uno.
const PaginaLienzo = lazy(() => import('./paginas/PaginaLienzo').then((modulo) => ({ default: modulo.PaginaLienzo })));
const lienzoDiferido = (
  <Suspense fallback={<div className="grid flex-1 place-items-center py-24 text-sm text-texto-3">Cargando lienzo…</div>}>
    <PaginaLienzo />
  </Suspense>
);

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProveedorSesion>
        <ProveedorConfirmacion>
          <Routes>
            <Route path="/iniciar-sesion" element={<PaginaAutenticacion modo="iniciar" />} />
            <Route path="/registrar" element={<PaginaAutenticacion modo="registrar" />} />
            <Route
              element={
                <RutaProtegida>
                  <DisposicionPrincipal />
                </RutaProtegida>
              }
            >
              <Route index element={<PaginaTablero />} />
              <Route path="tareas" element={<PaginaTareas />} />
              <Route path="tareas/nueva" element={<PaginaNuevaTarea />} />
              <Route path="tareas/:id" element={<PaginaDetalleTarea />} />
              <Route path="matriz" element={<PaginaMatriz />} />
              <Route path="tiempo" element={<PaginaTiempo />} />
              <Route path="documentos" element={documentosDiferidos} />
              <Route path="documentos/:id" element={documentosDiferidos} />
              <Route path="boveda" element={<PaginaBoveda />} />
              <Route path="lienzos" element={<PaginaLienzos />} />
              <Route path="lienzos/:id" element={lienzoDiferido} />
              <Route path="diario" element={<PaginaDiario />} />
              <Route path="diario/registro/:id" element={<RedireccionRegistroDiario />} />
              <Route path="diario/:fecha" element={<PaginaDiario />} />
              <Route path="tickets" element={<PaginaTickets />} />
              <Route path="tickets/nuevo" element={<PaginaNuevoTicket />} />
              <Route path="tickets/repositorios" element={<PaginaRepositorios />} />
              <Route path="tickets/repositorios/:id/grafo" element={<PaginaGrafoRepositorio />} />
              <Route path="tickets/proyectos" element={<PaginaProyectosSoporte />} />
              <Route path="tickets/:id" element={<PaginaDetalleTicket />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ProveedorRevisionIA />
        </ProveedorConfirmacion>
      </ProveedorSesion>
      <NotificacionesConTema />
    </BrowserRouter>
  </StrictMode>,
);
