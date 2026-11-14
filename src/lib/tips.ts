/**
 * Ayuditas: nombre y explicación corta de cada botón.
 * La clave es el aria-label del botón (o su texto visible si no tiene).
 */
export interface Tip {
  name: string
  desc: string
}

export const TIPS: Record<string, Tip> = {
  // Herramientas
  'Mover lienzo': { name: 'Mano', desc: 'Arrastra para moverte por la hoja sin dibujar. Con dos dedos también te mueves y haces zoom.' },
  Lazo: { name: 'Lazo', desc: 'Rodea lo que quieras para moverlo, girarlo, cambiarle el tamaño o el color, duplicarlo o volverlo sticker. Un toque elige una sola cosa.' },
  'Lápiz mágico': { name: 'Lápiz mágico ✨', desc: 'Escribe a mano y haz una pausa: tu letra se convierte en texto bonito con la fuente de tu estilo (cursiva, molde o mayúsculas).' },
  Pluma: { name: 'Pluma', desc: 'Para escribir y dibujar con trazo suave. Si dejas el lápiz quieto al terminar un círculo, cuadro o línea, se endereza solo.' },
  Lápiz: { name: 'Lápiz', desc: 'Trazo delgadito con textura de lápiz de verdad, ideal para bocetos.' },
  Pincel: { name: 'Pincel', desc: 'Trazo que se hace grueso y delgado según la velocidad, como pincel de caligrafía.' },
  Marcador: { name: 'Marcador', desc: 'Resaltador libre: queda tal como lo trazas, transparente encima de lo que pasas.' },
  'Marcatextos mágico': { name: 'Marcatextos mágico ✨', desc: 'Pásalo por tu letra o un texto y se acomoda parejito: de fondo, subrayado, como marco o iluminando el contorno de las letras.' },
  Lápices: { name: 'Estuche de lápices', desc: 'Pluma, pluma fina, lápiz, crayón, pincel, caligrafía, acuarela, neón y brillitos. Elige el que quieras arriba.' },
  'Pluma fina': { name: 'Pluma fina', desc: 'Línea delgadita y pareja, como plumón de punta fina. Ideal para apuntes.' },
  Crayón: { name: 'Crayón', desc: 'Trazo gordito con textura de crayola, con huequitos del papel.' },
  Caligrafía: { name: 'Caligrafía', desc: 'Punta biselada: la línea se hace gruesa o delgada según hacia dónde vayas. Perfecta para títulos.' },
  Acuarela: { name: 'Acuarela', desc: 'Pintura aguada y transparente, con la orilla difuminada. Se mezcla al encimarla.' },
  Neón: { name: 'Neón', desc: 'Línea que brilla con resplandor, como letrero de neón. Se ve increíble en papel negro.' },
  Brillitos: { name: 'Brillitos', desc: 'Trazo con destellos de glitter ✨' },
  Fondo: { name: 'Fondo', desc: 'Franja pareja detrás de la letra, como marcatextos de verdad.' },
  Subrayar: { name: 'Subrayar', desc: 'Línea recta y pareja debajo de lo que pases.' },
  Marco: { name: 'Marco', desc: 'Solo el borde: un recuadro redondeado alrededor del renglón.' },
  'Contorno de letras': { name: 'Contorno de letras', desc: 'Ilumina el borde de cada letra, siguiendo su forma (sin cuadro).' },
  'Letra del lápiz mágico': { name: 'Letra', desc: 'Automática: detecta si escribes en cursiva, molde o mayúsculas. O elige una letra fija y todo lo que escribas se convierte en ella.' },
  Borrador: { name: 'Borrador', desc: 'Borra trazos enteros o solo la parte que tocas (lo eliges arriba). Las páginas de PDF no se borran.' },
  Figuras: { name: 'Figuras', desc: 'Arrastra para dibujar corazones, estrellas, círculos, rectángulos y más. Un toque pone una de tamaño normal.' },
  Líneas: { name: 'Líneas', desc: 'Líneas rectas, con flecha o punto en las puntas, y también punteadas.' },
  Texto: { name: 'Texto', desc: 'Toca la hoja para escribir con el teclado. Toca un texto que ya existe para editarlo.' },
  'Nota decorada': { name: 'Nota decorada', desc: 'Una tarjetita con color, moño, cinta o chincheta y tu texto adentro.' },
  Stickers: { name: 'Stickers', desc: 'Moños, corazones, flores, washi tapes y marcos para decorar. En «Míos» están los que tú hiciste.' },
  'Agregar imagen o PDF': { name: 'Imagen o PDF', desc: 'Agrega fotos o un PDF para escribir encima. En la computadora también puedes arrastrarlos a la hoja.' },

  // Barra de arriba de la nota
  'Volver al cuaderno': { name: 'Volver', desc: 'Regresa a la lista de notas del cuaderno. Todo se guarda solo.' },
  Deshacer: { name: 'Deshacer', desc: 'Quita lo último que hiciste.' },
  Rehacer: { name: 'Rehacer', desc: 'Vuelve a poner lo que deshiciste.' },
  Alejar: { name: 'Alejar', desc: 'Ve la hoja más pequeña para ver más cosas a la vez.' },
  Acercar: { name: 'Acercar', desc: 'Agranda la hoja para escribir con más detalle.' },
  'Ver todo': { name: 'Ver todo', desc: 'Acomoda el zoom para ver todo lo que hay en la nota.' },
  'Cambiar papel': { name: 'Papel', desc: 'Cambia el tipo de hoja (rayada, cuadrícula, punteada, planner…) y su color.' },
  Exportar: { name: 'Exportar', desc: 'Guarda la nota como imagen (PNG) o PDF para compartirla o imprimirla.' },
  'Pantalla dividida': { name: 'Pantalla dividida', desc: 'Abre otra nota al lado para tener las dos a la vista y copiar cosas de una a otra.' },
  'Ver solo esta nota': { name: 'Ver solo esta', desc: 'Cierra la pantalla dividida y deja esta nota en grande.' },
  Ajustes: { name: 'Ajustes', desc: 'Escritura mágica, fuentes, tema claro u oscuro, respaldos y más.' },

  // Barra de lo seleccionado
  'Editar texto': { name: 'Editar texto', desc: 'Cambia lo que dice, la fuente, el tamaño o el color.' },
  'Editar nota': { name: 'Editar nota', desc: 'Cambia el texto, los colores o el adorno de la nota decorada.' },
  'Convertir a texto': { name: 'Convertir a texto ✨', desc: 'Lee tu letra a mano y la vuelve texto bonito.' },
  'Quitar resaltado': { name: 'Quitar resaltado', desc: 'Borra el color de fondo que le pusiste al texto con el marcador.' },
  'Cambiar color': { name: 'Color', desc: 'Pinta de otro color lo que seleccionaste.' },
  Duplicar: { name: 'Duplicar', desc: 'Hace una copia justo al lado.' },
  'Guardar como sticker': { name: 'Hacer sticker', desc: 'Convierte lo seleccionado en un sticker tuyo (con o sin borde blanco) para usarlo cuando quieras.' },
  'Copiar al otro lado': { name: 'Copiar al otro lado', desc: 'Pasa una copia de lo seleccionado a la otra nota de la pantalla dividida.' },
  'Traer al frente': { name: 'Al frente', desc: 'Pone lo seleccionado encima de todo lo demás.' },
  'Mandar atrás': { name: 'Atrás', desc: 'Pone lo seleccionado detrás de todo lo demás.' },
  Borrar: { name: 'Borrar', desc: 'Quita lo seleccionado. Si te arrepientes, usa Deshacer.' },

  // Formato de texto
  Fuente: { name: 'Fuente', desc: 'Elige el tipo de letra, incluidas las que dibujaste en el taller.' },
  'Letra más chica': { name: 'Más chica', desc: 'Hace la letra más pequeña.' },
  'Letra más grande': { name: 'Más grande', desc: 'Hace la letra más grande.' },
  Negrita: { name: 'Negrita', desc: 'Letra más gruesa para lo importante.' },
  Cursiva: { name: 'Cursiva', desc: 'Letra inclinada.' },
  Alinear: { name: 'Alinear', desc: 'Acomoda el texto a la izquierda, al centro o a la derecha.' },

  // Estante y cuaderno
  'Nuevo cuaderno': { name: 'Nuevo cuaderno', desc: 'Crea un cuaderno con su portada y el papel que quieras.' },
  'Taller de fuentes': { name: 'Taller de fuentes', desc: 'Dibuja tu propia letra, una por una, y úsala en tus notas.' },
  Papelera: { name: 'Papelera', desc: 'Aquí está lo que borraste, por si lo quieres recuperar.' },
  'Volver al estante': { name: 'Volver', desc: 'Regresa a todos tus cuadernos.' },
  'Exportar cuaderno a PDF': { name: 'Cuaderno en PDF', desc: 'Junta todas las notas del cuaderno en un solo PDF.' },
  PDF: { name: 'Importar PDF', desc: 'Crea una nota con las páginas de un PDF para escribir y resaltar encima.' },
  'Editar portada': { name: 'Portada', desc: 'Cambia el nombre, la portada o el papel del cuaderno.' },
}

/** Busca la ayudita de un elemento (por su aria-label o su texto). */
export function tipFor(el: Element): Tip | null {
  const label = el.getAttribute('aria-label')?.trim()
  if (label && TIPS[label]) return TIPS[label]
  if (label?.startsWith('Opciones de ')) return { name: 'Opciones', desc: 'Cambiar nombre, duplicar, mover, exportar o mandar a la papelera.' }
  const text = el.textContent?.trim().replace(/\s+/g, ' ')
  if (text && TIPS[text]) return TIPS[text]
  // Botones con nombre pero sin explicación: al menos el nombre.
  const title = el.getAttribute('data-tip-title') ?? el.getAttribute('title')
  if (label && title) return { name: label, desc: '' }
  return null
}
