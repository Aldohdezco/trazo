# Trazo — SPEC

> Cuadernos digitales lindos 🎀 para tablet y PC: lienzo libre, dibujo a mano, escritura que se convierte en letra bonita, stickers y fuentes propias. Todo guardado en el dispositivo.

- **Para quién:** una usuaria (apuntes de clase, diario, bocetos y listas).
- **Estética:** *coquette*: rosas y cremas pastel, moños, perlas, encaje, corazoncitos, tipografías caligráficas y redondas. Tiene que verse muy linda en cada pantalla, no solo en las notas.
- **Idioma de la interfaz:** español.
- **Estado:** SPEC v1, 2026-11-06.

---

## 1. Plataformas y entrada

| Dispositivo | Navegador | Notas |
|---|---|---|
| iPad | Safari (PWA instalada en inicio) | Lápiz genérico |
| Tablet Android | Chrome (PWA instalada) | Lápiz genérico |
| PC | Chrome / Edge | Mouse y teclado |

- **Dedo, lápiz y mouse dibujan.** El lápiz genérico (pasivo) le llega al navegador como si fuera un dedo, así que **no hay rechazo de palma confiable** y la presión no es real.
  - La presión se **simula por velocidad** del trazo.
  - Dos dedos = desplazar y hacer zoom (*pinch*). Un dedo o el lápiz = usar la herramienta activa.
  - Opción en ajustes: "Solo lápiz dibuja" para cuando se use un lápiz activo (Apple Pencil o lápiz con `pointerType === "pen"`).
- La interfaz es táctil primero (botones ≥ 44 px) y también tiene atajos de teclado en PC.

## 2. Modelo de datos

```
Cuaderno
 ├─ nombre, portada, fondo por defecto, color, fechas
 └─ Notas[]
     ├─ título, fondo (tipo + color de papel), fechas, miniatura
     └─ Lienzo (crece sin límite)
         └─ Elementos[] (orden z)
             ├─ Trazo         (puntos, herramienta, color, grosor, opacidad)
             ├─ Texto         (contenido, fuente, tamaño, color, resaltado de fondo por rango)
             ├─ Figura        (rect, círculo, triángulo, estrella, corazón, flecha, línea…)
             ├─ Imagen        (blob)
             ├─ PáginaPDF     (blob del PDF + número de página, anotable encima)
             ├─ Sticker       (referencia a la biblioteca)
             └─ NotaDecorada  (cuadro con color, decoración de esquina y texto dentro)
Biblioteca
 ├─ Stickers (propios + prediseñados)
 ├─ Fuentes propias (glifos + archivo generado)
 └─ Plantillas de portada
Ajustes (fuentes por estilo de letra, llave de reconocimiento, preferencias)
```

- **Lienzo:** crece sin límite hacia abajo y a los lados. Hay zoom y desplazamiento. El fondo de papel se dibuja como patrón infinito.
- **Al exportar a PDF**, el contenido se corta automáticamente en hojas (A4 o Carta, a elegir) dentro del área con contenido. *A confirmar.*

## 3. Funcionalidades

### 3.1 Cuadernos y portadas
- Estantería de cuadernos con sus portadas.
- Crear, renombrar, duplicar, borrar (con papelera) y reordenar cuadernos.
- **Portadas:** plantillas coquette prediseñadas, o una portada personalizada que se edita con el mismo lienzo (texto, stickers, imágenes, dibujo).
- Dentro del cuaderno, lista de notas con miniaturas y búsqueda.

### 3.2 Fondos
Al crear un cuaderno o una nota se elige el fondo, que se puede cambiar después: liso, rayado, cuadrícula, punteado, Cornell, planner semanal y pentagrama, más el color del papel (blanco, crema, rosa, lila, menta, negro…).

### 3.3 Herramientas de lienzo
- **Pluma** (trazo suave con `perfect-freehand`), **lápiz**, **pincel**.
- **Marcador / resaltador** (translúcido). Si se pasa sobre un **Texto**, **pinta el fondo de las palabras que toca** en lugar de quedar como trazo.
- **Lápiz mágico ✨:** lo que se escribe con él se **reconoce y se convierte en texto** con la fuente de su estilo (ver 3.5).
- **Borrador:** de trazo completo o parcial (tipo goma).
- **Lazo:** selecciona cualquier mezcla de elementos para mover, escalar, rotar, cambiar color, duplicar, borrar, **convertir a texto** o **guardar como sticker**.
- **Figuras** predeterminadas y **líneas/flechas**: con relleno, borde y color editables. El trazo de una figura a mano se puede reconocer y "enderezar" (mantener presionado al terminar).
- **Texto** con teclado: fuente, tamaño, color, negrita/cursiva, alineación.
- **Imágenes:** desde archivo, cámara o portapapeles.
- **PDF:** importar un PDF crea un elemento por página en el lienzo, sobre el que se puede escribir y dibujar.
- Paleta de colores con favoritos y selector libre.
- Deshacer y rehacer (con historial por nota).

### 3.4 Pantalla dividida
Dos notas de Trazo lado a lado dentro de la app (de cualquier cuaderno), con un divisor ajustable. Cada mitad tiene su propio zoom. Se pueden arrastrar elementos de una a la otra.

### 3.5 Reconocimiento de escritura (híbrido)
1. **Reconocer el texto** en español (acentos, ñ).
   - **En la nube** si hay internet y la llave está configurada: mejor precisión.
   - **Local** sin internet o sin llave: menos precisión.
   - Proveedores candidatos, a evaluar al inicio de la Fase 2 (precisión en español, plan gratis, privacidad): MyScript iink, Google Cloud Vision (handwriting OCR), Azure AI Vision Read. Para el modo local: un modelo en el navegador (ONNX/transformers.js) o la Handwriting Recognition API donde exista.
   - **La llave de API nunca va en el repo** (es público). Ella la pega en Ajustes y se guarda solo en su dispositivo.
2. **Detectar el estilo:** el trazo se clasifica en **cursiva**, **molde** o **mayúsculas** con heurísticas (letras unidas por trazo, inclinación, proporción de altura).
3. **Aplicar la fuente:** en Ajustes ella elige qué fuente corresponde a cada estilo (de las incluidas o de las que ella creó). El texto convertido conserva el color y aproximadamente el tamaño y la posición del trazo original.
4. **Cuándo convierte:** al escribir con el **Lápiz mágico** (al hacer una pausa), o seleccionando con el **lazo → Convertir**. La pluma normal deja el trazo a mano.
5. **Búsqueda:** se indexa el texto escrito con teclado, el convertido y, en segundo plano, el reconocido de los trazos a mano que no se convirtieron.

### 3.6 Stickers
- **Crear:** se recorta con el lazo cualquier cosa (dibujo, imagen, texto) y se elige "Guardar como sticker". Se puede agregar un borde blanco tipo sticker troquelado.
- **Paquete prediseñado coquette:** moños, perlas, corazones, flores, washi tapes, marcos, estrellitas, sobres, cintas.
- Biblioteca con categorías y favoritos. Arrastrar o tocar para poner un sticker. Escalar y rotar.

### 3.7 Notas decoradas
Cuadros tipo post-it o tarjeta con color de fondo, borde, **decoración de esquina** a elegir (moño, cinta adhesiva, chincheta, corazón, encaje) y texto o dibujo dentro. Se pueden cambiar todos los colores.

### 3.8 Creador de fuentes
- Plantilla con una casilla por carácter, con línea base y altura de x como guía: `a–z`, `A–Z`, `ñ Ñ`, `á é í ó ú ü Á É Í Ó Ú Ü`, `0–9` y `. , ; : ¿ ? ¡ ! ' " ( ) - _ / @ # & % $ + = *`.
- Ella dibuja cada letra. Puede rehacerla y ver una vista previa con una frase.
- Se genera una fuente (OpenType con `opentype.js`) que se puede usar en sus notas y como fuente de un estilo en el reconocimiento.
- **Descargar como `.ttf`** para usarla en otras apps.
- Opcional: 2–3 variantes por letra para que se vea más natural.

### 3.9 Exportar y respaldo
- **Exportar una nota** a **PNG** (área con contenido, o la selección) y a **PDF** (cortado en hojas). Exportar un cuaderno completo a PDF.
- **Respaldo completo:** un archivo `.trazo` (zip con JSON + blobs) con todos los cuadernos, stickers, fuentes y ajustes. Restaurar desde ese archivo (reemplazar o combinar).
- Recordatorio amable para respaldar cada N días (configurable), porque en iPad Safari puede borrar los datos de una PWA que no se usa.
- Al iniciar se pide `navigator.storage.persist()` para que el navegador no borre los datos.

### 3.10 Sin sincronización
Los datos viven solo en el dispositivo (IndexedDB). No hay cuentas ni servidor. Para pasar notas de un dispositivo a otro se usa el respaldo.

## 4. Diseño visual (coquette)
- **Paleta base:** rosa empolvado, rosa chicle suave, crema, lila, blanco perla, y un rosa oscuro para el texto y los acentos. Modo oscuro en tonos ciruela o malva.
- **Tipografías de la interfaz:** una serif elegante para los títulos y una redonda para la UI (Google Fonts, autoalojadas para que funcionen sin internet).
- **Fuentes incluidas para notas:** varias caligráficas y cursivas, de molde redonda, serif clásica tipo Times, máquina de escribir y *handwritten* (todas con licencia OFL, autoalojadas).
- **Detalles:** íconos propios con moños y corazones, esquinas redondeadas, sombras suaves, microanimaciones (destellos al convertir texto, rebote al poner un sticker) y sonidos opcionales.
- Hay que cuidar el contraste y la legibilidad aunque todo sea pastel.

## 5. Arquitectura técnica
| Parte | Elección |
|---|---|
| Base | Vite + TypeScript |
| Interfaz | Svelte 5 |
| Lienzo | Canvas 2D propio: dos capas (contenido y trazo en vivo) y renderizado solo de lo visible. Si una nota llega a tener miles de elementos, se agrega un índice espacial (`rbush`) |
| Trazos | `perfect-freehand` |
| Almacenamiento | IndexedDB con `Dexie` |
| PDF entrada | `pdf.js` (renderiza cada página a una imagen para anotar encima) |
| PDF salida | `pdf-lib` |
| Fuentes | `opentype.js` |
| Respaldo | `fflate` (zip) |
| PWA | `vite-plugin-pwa` (funciona sin internet, instalable) |
| Pruebas | Vitest (lógica) + Playwright (flujos clave) |
| Publicación | GitHub Pages con GitHub Actions; se publica en cada push a `main` |

- Repo **público**: `Aldohdezco/trazo`. No se suben secretos.
- Commits solo a nombre de Aldohdezco, sin `Co-Authored-By`.
- **Sin integración con LifeOS** (decisión del usuario, aunque la ficha de LifeOS la sugiere).

## 6. Fases
1. **Fase 1, cuaderno básico:** estantería, cuadernos, portadas (plantillas), fondos, lienzo infinito con zoom y desplazamiento, pluma, lápiz, pincel, marcador, borrador, lazo, figuras, líneas, texto, imágenes, deshacer y rehacer, exportar PNG/PDF, respaldo `.trazo`, PWA instalable y publicada.
2. **Fase 2, escritura mágica:** reconocimiento híbrido, detección de estilo, Lápiz mágico, lazo → convertir, marcador que pinta el fondo del texto, búsqueda con texto reconocido.
3. **Fase 3, decorar:** stickers (recorte y paquete coquette), notas decoradas, portadas personalizadas, creador de fuentes con descarga `.ttf`.
4. **Fase 4, extras:** importar y anotar PDFs, pantalla dividida, reconocimiento de figuras a mano.

## 7. Estado

- **Fase 1:** terminada (2026-11-07).
  - El papel Cornell y el planner semanal se repiten por "hojas" tamaño carta dentro del lienzo infinito.
  - Atajos de teclado en PC: V lazo, H mano, P pluma, L lápiz, B pincel, M marcador, E borrador, F figuras, R líneas, T texto; Ctrl+Z/Y, Ctrl+C/X/V, Ctrl+D, Supr.

## 8. Pendientes por confirmar
- [ ] Exportar a PDF: cortar el lienzo en hojas A4 o Carta automáticamente.
- [ ] Proveedor de reconocimiento en la nube (se decide al empezar la Fase 2 tras probar los candidatos).
- [ ] Sin fecha límite.
