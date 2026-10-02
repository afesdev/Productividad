import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, PenTool, Plus, Trash2 } from 'lucide-react';
import { apiLienzos } from '../servicios/api';
import { notificar } from '../servicios/notificaciones';
import { formatearRelativo } from '../servicios/formato';
import type { LienzoResumenDto } from '../servicios/tipos';
import { Boton, EncabezadoPagina, EstadoVacio, Esqueleto, Entrada } from '../componentes/ui/primitivos';
import { Modal } from '../componentes/ui/Modal';
import { usarConfirmacion } from '../componentes/ui/DialogoConfirmacion';

export function PaginaLienzos() {
  const navegar = useNavigate();
  const confirmar = usarConfirmacion();
  const [lienzos, setLienzos] = useState<LienzoResumenDto[] | null>(null);
  const [dialogo, setDialogo] = useState<{ modo: 'crear' } | { modo: 'renombrar'; lienzo: LienzoResumenDto } | null>(null);
  const [titulo, setTitulo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  useEffect(() => {
    apiLienzos
      .listar()
      .then(setLienzos)
      .catch((error) => {
        notificar.error('No se pudieron cargar los lienzos', error);
        setLienzos([]);
      });
  }, []);

  function abrirCrear() {
    setTitulo('');
    setDialogo({ modo: 'crear' });
  }

  function abrirRenombrar(lienzo: LienzoResumenDto) {
    setMenuAbierto(null);
    setTitulo(lienzo.titulo);
    setDialogo({ modo: 'renombrar', lienzo });
  }

  async function confirmarDialogo() {
    if (!dialogo) return;
    const limpio = titulo.trim();
    if (!limpio) return;
    setGuardando(true);
    try {
      if (dialogo.modo === 'crear') {
        const id = await apiLienzos.crear(limpio);
        navegar(`/lienzos/${id}`);
      } else {
        await apiLienzos.renombrar(dialogo.lienzo.id, limpio);
        setLienzos((actual) => actual?.map((l) => (l.id === dialogo.lienzo.id ? { ...l, titulo: limpio } : l)) ?? null);
        setDialogo(null);
      }
    } catch (error) {
      notificar.error(dialogo.modo === 'crear' ? 'No se pudo crear el lienzo' : 'No se pudo renombrar', error);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(lienzo: LienzoResumenDto) {
    setMenuAbierto(null);
    const seguro = await confirmar({
      titulo: `¿Eliminar "${lienzo.titulo}"?`,
      descripcion: 'Se borra el lienzo y todo su contenido. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligrosa: true,
    });
    if (!seguro) return;
    try {
      await apiLienzos.eliminar(lienzo.id);
      setLienzos((actual) => actual?.filter((l) => l.id !== lienzo.id) ?? null);
      notificar.exito('Lienzo eliminado');
    } catch (error) {
      notificar.error('No se pudo eliminar', error);
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Lienzos"
        descripcion="Pizarras infinitas para bocetos, diagramas e ideas al vuelo."
        acciones={<Boton icono={Plus} onClick={abrirCrear}>Nuevo lienzo</Boton>}
      />

      {lienzos === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Esqueleto key={indice} className="h-40" />
          ))}
        </div>
      ) : lienzos.length === 0 ? (
        <EstadoVacio
          icono={PenTool}
          titulo="Aún no hay lienzos"
          descripcion="Crea tu primera pizarra para dibujar diagramas, esquemas o notas visuales."
          accion={<Boton icono={Plus} onClick={abrirCrear}>Nuevo lienzo</Boton>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lienzos.map((lienzo) => (
            <div
              key={lienzo.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-borde bg-superficie shadow-tarjeta transition hover:border-borde-fuerte"
            >
              <button
                onClick={() => navegar(`/lienzos/${lienzo.id}`)}
                className="grid h-32 place-items-center bg-gradient-to-br from-violet-50 via-sky-50 to-white text-violet-300 transition group-hover:text-violet-400"
              >
                <PenTool className="size-8" />
              </button>
              <div className="flex items-center gap-2 px-3.5 py-3">
                <button onClick={() => navegar(`/lienzos/${lienzo.id}`)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium">{lienzo.titulo}</p>
                  <p className="mt-0.5 text-xs text-texto-3">Editado {formatearRelativo(lienzo.fechaActualizacion)}</p>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuAbierto((actual) => (actual === lienzo.id ? null : lienzo.id))}
                    className="grid size-8 place-items-center rounded-lg text-texto-3 transition hover:bg-superficie-2 hover:text-texto"
                    aria-label="Opciones del lienzo"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuAbierto === lienzo.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(null)} />
                      <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-borde bg-superficie p-1 shadow-flotante">
                        <button
                          onClick={() => abrirRenombrar(lienzo)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-texto-2 hover:bg-superficie-2 hover:text-texto"
                        >
                          <Pencil className="size-4" /> Renombrar
                        </button>
                        <button
                          onClick={() => eliminar(lienzo)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-peligro hover:bg-red-50"
                        >
                          <Trash2 className="size-4" /> Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        abierto={dialogo !== null}
        alCerrar={() => setDialogo(null)}
        titulo={dialogo?.modo === 'renombrar' ? 'Renombrar lienzo' : 'Nuevo lienzo'}
        ancho="sm"
        pie={
          <>
            <Boton variante="secundario" onClick={() => setDialogo(null)}>Cancelar</Boton>
            <Boton onClick={confirmarDialogo} cargando={guardando} disabled={!titulo.trim()}>
              {dialogo?.modo === 'renombrar' ? 'Guardar' : 'Crear'}
            </Boton>
          </>
        }
      >
        <Entrada
          autoFocus
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          onKeyDown={(evento) => evento.key === 'Enter' && titulo.trim() && confirmarDialogo()}
          placeholder="Nombre del lienzo"
          maxLength={200}
        />
      </Modal>
    </>
  );
}
