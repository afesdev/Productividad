import { TableroAnalitica } from '../caracteristicas/analitica/TableroAnalitica';
import { EncabezadoPagina } from '../componentes/ui/primitivos';
import { usarSesion } from '../caracteristicas/autenticacion/ContextoSesion';

export function PaginaTablero() {
  const { usuario } = usarSesion();
  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${usuario?.nombreCompleto.split(' ')[0] ?? ''}`} descripcion="Tu rendimiento personal en el periodo seleccionado." />
      <TableroAnalitica />
    </>
  );
}
