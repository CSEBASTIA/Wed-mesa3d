# Wed Mesa 3D · Taller de Escritorios

Editor 3D en el navegador para diseñar escritorios a medida y mandarle el plano al carpintero.

- **Entorno:** cuarto, sala u oficina con la forma real de la habitación (rectangular, en L, en U o la que dibujes
  arrastrando esquinas y paredes), piso, color de paredes, puertas y ventanas. Las paredes que tapan la vista se recortan solas.
- **Escritorio a medida:** en L (esquinero) o recto, con cajonera; se arma en la esquina del entorno y se pueden agregar varios.
  Sus medidas se editan como un solo escritorio y se actualizan en tiempo real.
- **Materiales y presupuesto:** melaminas, MDF, contrachapado y maderas macizas con precio por m²; presupuesto con
  tablas, cantos, herrajes y mano de obra, y comparación de acabados (económico, estándar, premium, lujo).
- **Mini tutorial** guiado la primera vez (y con el botón "?").
- **32 piezas sueltas** en 4 categorías, con buscador: tableros y paneles (travesaño, panel divisor…), patas y soportes
  (cónica, torneada, horquilla, caballete, en U, marco cerrado, trapecio, en X, escuadra de pared), almacenamiento
  (cajonera con ruedas, archivador, módulo con puerta, librero, nicho, repisa superior) y accesorios (bandeja de teclado,
  porta CPU, elevador de monitor, reposapiés, bandeja de cables, pasacables).
- **Exportar plano (JPG/PNG):** vista 3D con cotas a/b/c/d, vista superior a escala y despiece completo.

Hecho con **TypeScript**, **React 18**, **three.js** y **Vite**.

## Cómo ejecutarlo

Necesitas [Node.js](https://nodejs.org) 18 o más reciente.

```bash
npm install
npm run dev
```

Luego abre http://localhost:5173

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga al guardar |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run build` | Revisa tipos y genera la versión final en `dist/` |
| `npm run preview` | Sirve la versión final para probarla |

## Arquitectura

```
index.html                 punto de entrada de Vite
src/
  main.tsx                 monta React
  App.tsx                  composición de la pantalla
  styles.css               estilos (tokens de color claro/oscuro)
  core/                    modelo y reglas: TypeScript puro, sin React ni three.js
    types.ts               tipos: Piece, Room, DeskConfig, Dim...
    catalog.ts             tipos de pieza, materiales, límites
    geometry.ts            cajas, contorno en L, huellas, cotas
    templates.ts           generador de escritorios a medida
    cutlist.ts             despiece para el carpintero
    actions.ts             agregar, duplicar, girar, apoyar...
    store.ts               estado único + historial + guardado + eventos tipados
  three/                   todo lo que dibuja en 3D
    materials.ts           texturas y materiales
    builders.ts            pieza del modelo -> mallas
    viewport.ts            clase Viewport: escena, cámara, paredes, selección, foto para exportar
    interaction.ts         arrastrar piezas con imán
  export/sheet.ts          lámina del plano (canvas)
  app/                     puente con React: store compartido, avisos, atajos de teclado
  components/              componentes React: barra, catálogo, escena, ficha, lista, ventanas
```

**Flujo de datos:** los componentes y el arrastre llaman a `store` (o a `actions`). El `store` cambia el modelo,
lo guarda en `localStorage`, apila el historial y emite eventos tipados (`reset`, `added`, `removed`, `rebuilt`,
`moved`, `select`, `history`, `options`). El `Viewport` 3D escucha esos eventos y React se vuelve a dibujar con
`useSyncExternalStore`. Nada en `core/` sabe de la pantalla, así que se puede reutilizar en un servidor
(guardar diseños, cotizar) o en pruebas.

### Agregar un tipo de pieza

1. Agregar su nombre a `PieceType` en `src/core/types.ts`.
2. Declararlo en `TYPES` (`src/core/catalog.ts`) con su categoría, medidas y material por defecto.
3. Describir sus partes en `src/core/parts.ts` (cajas, cilindros o conos, con su giro y herrajes).
   De esa descripción salen solos el 3D, el despiece, el presupuesto y la miniatura de la biblioteca.

## Controles

- **Doble clic** en una pieza para activarla; solo la pieza activa se puede arrastrar (con Shift o "Mover en altura" sube y baja).
- **Girar:** arrastra el aro que rodea la pieza activa (de 15° en 15° con el imán, libre con Alt), escribe los grados en la ficha o usa R (90°) y Shift+R (15°).
- Arrastra el fondo para girar la vista; la rueda acerca y aleja; clic derecho desplaza.
- **Cámara con teclado:** W adelante · S atrás · A izquierda · D derecha · Q bajar · E subir · Shift más rápido.
  Las teclas van por posición física, así que funcionan igual en otros teclados (por ejemplo AZERTY).
- Botón **Cámara**: velocidad del teclado y sensibilidad del giro y del zoom (se guardan en el navegador).
- Doble clic en un cajón activo para abrirlo o cerrarlo.
- Los paneles laterales se minimizan con el botón de su esquina.
- Flechas: mover · Supr: eliminar · Ctrl+Z / Ctrl+Y: deshacer / rehacer.
