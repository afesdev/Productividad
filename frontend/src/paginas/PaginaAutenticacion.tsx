import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, AtSign, Check, Eye, EyeOff, FileText, KeyRound, LifeBuoy, Lock, Mail, NotebookPen, SquareKanban, Timer, TriangleAlert, User, Zap } from 'lucide-react';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';
import { obtenerMensajeError } from '../servicios/clienteApi';
import { Boton, Campo, Entrada, MensajeError, unirClases, type Icono } from '../componentes/ui/primitivos';

/** Módulos del panel de marca, con los mismos tonos pastel del menú lateral. */
const modulos: { icono: Icono; titulo: string; texto: string; tono: string }[] = [
  { icono: SquareKanban, titulo: 'Tareas', texto: 'Tablero, matriz de Eisenhower y subtareas', tono: 'bg-violet-100 text-violet-600' },
  { icono: LifeBuoy, titulo: 'Tickets', texto: 'Del análisis a producción, con ramas y PRs', tono: 'bg-rose-100 text-rose-500' },
  { icono: NotebookPen, titulo: 'Diario', texto: 'Decisiones, aprendizajes y revisión semanal', tono: 'bg-orange-100 text-orange-500' },
  { icono: FileText, titulo: 'Documentos', texto: 'Wiki técnica con enlaces [[entre todo]]', tono: 'bg-emerald-100 text-emerald-600' },
  { icono: Timer, titulo: 'Tiempo', texto: 'Cronómetro por tarea o ticket', tono: 'bg-indigo-100 text-indigo-500' },
  { icono: KeyRound, titulo: 'Bóveda', texto: 'Secretos cifrados con AES-256', tono: 'bg-teal-100 text-teal-600' },
];

/** Mismas reglas que valida la API al registrarse. */
const requisitosContrasena: { texto: string; cumple: (contrasena: string) => boolean }[] = [
  { texto: 'Al menos 8 caracteres', cumple: (contrasena) => contrasena.length >= 8 },
  { texto: 'Una letra (a-z)', cumple: (contrasena) => /[A-Za-z]/.test(contrasena) },
  { texto: 'Un número', cumple: (contrasena) => /\d/.test(contrasena) },
];

export function PaginaAutenticacion({ modo }: { modo: 'iniciar' | 'registrar' }) {
  const { usuario, cargando, iniciarSesion, registrar } = usarSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [correo, setCorreo] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [mayusculasActivas, setMayusculasActivas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/';
  if (!cargando && usuario) return <Navigate to={destino} replace />;

  const esRegistro = modo === 'registrar';
  const contrasenaValida = !esRegistro || requisitosContrasena.every((requisito) => requisito.cumple(contrasena));

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!contrasenaValida) return;
    setError(null);
    setEnviando(true);
    try {
      if (esRegistro) await registrar({ correo, nombreUsuario, nombreCompleto, contrasena });
      else await iniciarSesion(identificador.trim(), contrasena);
      navegar(destino, { replace: true });
    } catch (errorAutenticacion) {
      setError(obtenerMensajeError(errorAutenticacion));
      setIntentos((actual) => actual + 1);
    } finally {
      setEnviando(false);
    }
  }

  const detectarMayusculas = (evento: KeyboardEvent<HTMLInputElement>) => setMayusculasActivas(evento.getModifierState('CapsLock'));

  return (
    <div className="grid min-h-screen bg-superficie lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <PanelMarca />

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <motion.div
          key={modo}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex w-full max-w-sm flex-col gap-7"
        >
          {/* Logo solo en pantallas pequeñas: en grandes está en el panel de marca. */}
          <div className="flex items-center gap-3 lg:hidden">
            <Logo />
            <span className="text-lg font-semibold tracking-tight">Productividad</span>
          </div>

          <div>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">{esRegistro ? 'Crea tu espacio' : 'Hola de nuevo'}</h1>
            <p className="mt-2 text-sm text-texto-2">
              {esRegistro ? 'Tu espacio personal para trabajo, conocimiento y hábitos.' : 'Inicia sesión para seguir donde lo dejaste.'}
            </p>
          </div>

          <motion.form
            onSubmit={enviar}
            // Un pequeño temblor cuando el servidor rechaza el intento.
            animate={intentos > 0 && error ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            key={intentos}
            className="flex flex-col gap-4"
          >
            {esRegistro ? (
              <>
                <Campo etiqueta="Nombre completo">
                  <ConIcono icono={User}>
                    <Entrada required autoFocus autoComplete="name" value={nombreCompleto} onChange={(evento) => setNombreCompleto(evento.target.value)} placeholder="Andrés Espitia" className="h-11 pl-10" />
                  </ConIcono>
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Usuario">
                    <ConIcono icono={AtSign}>
                      <Entrada
                        required
                        autoComplete="username"
                        pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,29}"
                        title="3 a 30 caracteres: letras, números, punto, guion o guion bajo"
                        value={nombreUsuario}
                        onChange={(evento) => setNombreUsuario(evento.target.value.replace(/\s/g, '').toLowerCase())}
                        placeholder="andres"
                        className="h-11 pl-10"
                      />
                    </ConIcono>
                  </Campo>
                  <Campo etiqueta="Correo">
                    <ConIcono icono={Mail}>
                      <Entrada required type="email" autoComplete="email" value={correo} onChange={(evento) => setCorreo(evento.target.value)} placeholder="tu@empresa.com" className="h-11 pl-10" />
                    </ConIcono>
                  </Campo>
                </div>
              </>
            ) : (
              <Campo etiqueta="Correo o usuario">
                <ConIcono icono={Mail}>
                  <Entrada
                    required
                    autoFocus
                    autoComplete="username"
                    value={identificador}
                    onChange={(evento) => setIdentificador(evento.target.value)}
                    placeholder="tu@empresa.com o andres"
                    className="h-11 pl-10"
                  />
                </ConIcono>
              </Campo>
            )}

            <Campo etiqueta="Contraseña">
              <ConIcono icono={Lock}>
                <Entrada
                  required
                  type={verContrasena ? 'text' : 'password'}
                  minLength={esRegistro ? 8 : undefined}
                  autoComplete={esRegistro ? 'new-password' : 'current-password'}
                  value={contrasena}
                  onChange={(evento) => setContrasena(evento.target.value)}
                  onKeyUp={detectarMayusculas}
                  onKeyDown={detectarMayusculas}
                  onBlur={() => setMayusculasActivas(false)}
                  placeholder="••••••••"
                  className="h-11 pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setVerContrasena((actual) => !actual)}
                  aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verContrasena}
                  className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-texto-3 transition hover:bg-superficie-2 hover:text-texto-2"
                >
                  {verContrasena ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </ConIcono>
            </Campo>

            <AnimatePresence initial={false}>
              {mayusculasActivas && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="-mt-2 flex items-center gap-1.5 text-xs text-aviso"
                >
                  <TriangleAlert className="size-3.5" />
                  Bloq Mayús está activado
                </motion.p>
              )}
            </AnimatePresence>

            {esRegistro && (
              <ul className="-mt-1 grid grid-cols-3 gap-2" aria-label="Requisitos de la contraseña">
                {requisitosContrasena.map((requisito) => {
                  const cumple = requisito.cumple(contrasena);
                  return (
                    <li key={requisito.texto} className="flex flex-col gap-1">
                      <span className={unirClases('h-1 rounded-full transition-colors', cumple ? 'bg-emerald-400' : 'bg-superficie-3')} />
                      <span className={unirClases('flex items-center gap-1 text-[11px] leading-tight', cumple ? 'text-emerald-700' : 'text-texto-3')}>
                        {cumple && <Check className="size-3 shrink-0" />}
                        {requisito.texto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <MensajeError mensaje={error} />

            <Boton type="submit" cargando={enviando} disabled={!contrasenaValida} className="group mt-1 h-11 w-full text-[15px]">
              {esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
              {!enviando && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
            </Boton>
          </motion.form>

          <p className="text-center text-sm text-texto-2">
            {esRegistro ? '¿Ya tienes cuenta? ' : '¿Aún no tienes cuenta? '}
            <Link to={esRegistro ? '/iniciar-sesion' : '/registrar'} state={ubicacion.state} className="font-medium text-violet-700 underline-offset-4 hover:underline">
              {esRegistro ? 'Inicia sesión' : 'Crea tu cuenta'}
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

/** Panel izquierdo (pantallas grandes): degradado pastel y los módulos de la app. */
function PanelMarca() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-violet-100 via-indigo-50 to-orange-50 lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Manchas de color difuminadas para dar profundidad sin imágenes. */}
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-violet-300/30 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 right-0 size-96 rounded-full bg-orange-200/40 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute right-1/3 top-1/3 size-64 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <Logo />
        <span className="text-lg font-semibold tracking-tight">Productividad</span>
      </div>

      <div className="relative flex max-w-lg flex-col gap-8">
        <div>
          <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900">
            Tu trabajo,
            <br />
            tus notas y tu día,
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-orange-500 bg-clip-text text-transparent">en un solo lugar.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">Tareas, tickets con GitHub, documentación, diario y tiempo, enlazados entre sí.</p>
        </div>

        <ul className="grid grid-cols-2 gap-3">
          {modulos.map(({ icono: IconoModulo, titulo, texto, tono }, indice) => (
            <motion.li
              key={titulo}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + indice * 0.05, duration: 0.3 }}
              className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/60 p-3 shadow-tarjeta backdrop-blur"
            >
              <span className={unirClases('grid size-9 shrink-0 place-items-center rounded-xl', tono)}>
                <IconoModulo className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900">{titulo}</span>
                <span className="block text-xs leading-snug text-zinc-500">{texto}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-zinc-500">Espacio personal · tus datos solo los ves tú.</p>
    </aside>
  );
}

function Logo() {
  return (
    <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 via-indigo-400 to-sky-400 text-white shadow-flotante">
      <Zap className="size-5" fill="currentColor" />
    </span>
  );
}

/** Icono dentro del campo, a la izquierda. */
function ConIcono({ icono: IconoCampo, children }: { icono: Icono; children: ReactNode }) {
  return (
    <div className="relative">
      <IconoCampo className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-texto-3" />
      {children}
    </div>
  );
}
