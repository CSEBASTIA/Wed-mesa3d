# Diseñador 3D de Escritorios y Muebles Personalizados

## Descripción del proyecto

Desarrollo de una aplicación web interactiva para el **diseño, modelado y personalización de escritorios y muebles en 3D**, que permita a los usuarios crear sus propios diseños desde cero mediante un entorno visual, intuitivo y profesional.

La plataforma contará con un **editor tridimensional interactivo**, donde los usuarios podrán agregar, mover, rotar, modificar y dimensionar diferentes componentes, como tableros, patas, cajones, repisas, soportes y otras piezas de mobiliario, utilizando medidas reales expresadas en centímetros o milímetros.

El objetivo principal es facilitar la creación de muebles personalizados sin necesidad de conocimientos avanzados en modelado 3D, permitiendo visualizar el resultado final antes de su fabricación.

### Funcionalidades principales

- **Modelado 3D interactivo:** entorno tridimensional donde el usuario podrá construir escritorios y muebles manualmente, utilizando herramientas de edición y manipulación de objetos.
- **Componentes personalizables:** incorporación de tableros, patas, cajones, divisiones, repisas y estructuras con dimensiones configurables.
- **Medidas precisas:** configuración del ancho, alto, profundidad y grosor de cada pieza, utilizando unidades de medida reales.
- **Editor profesional:** herramientas para mover, rotar, alinear, duplicar, agrupar y eliminar componentes dentro del escenario 3D.
- **Visualización en tiempo real:** posibilidad de observar el diseño desde diferentes ángulos, acercar, alejar y modificar materiales, colores y acabados.
- **Planos técnicos:** generación de vistas frontal, lateral, superior e isométrica con sus respectivas cotas y dimensiones.
- **Exportación de diseños:** generación de archivos PNG, JPG y PDF con imágenes del modelo, medidas y especificaciones técnicas.
- **Lista de materiales:** generación de un listado de piezas con sus dimensiones, cantidades y espesores para facilitar el trabajo del carpintero.
- **Guardado de proyectos:** posibilidad de almacenar, editar y continuar diseños previamente creados.

### Objetivo del proyecto

Crear una herramienta web de diseño de mobiliario que conecte la creatividad del usuario con el proceso de fabricación, transformando modelos tridimensionales en **planos técnicos claros, precisos y listos para entregar a un carpintero**.

### Alcance inicial

La primera versión estará enfocada en la creación de escritorios personalizados, incorporando un escenario 3D, herramientas básicas de modelado, componentes editables, medidas reales y exportación de planos.

Posteriormente, el sistema podrá ampliarse para incluir diseños de armarios, estanterías, mesas, muebles de oficina y otros tipos de mobiliario, así como funciones avanzadas de diseño y cálculo de materiales.

**Resultado esperado:** una aplicación web que permita diseñar un escritorio desde cero, visualizarlo en 3D, establecer las dimensiones exactas de cada componente y obtener un documento técnico con la información necesaria para su fabricación.

## Estado actual

Ya implementado en esta versión:

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
    templates.ts           generador de escritorios a medida (escritorios agrupados)
    room.ts                habitación: contorno de esquinas, paredes, puertas y ventanas
    collide.ts             colisión de las piezas con las paredes
    parts.ts               piezas compuestas: partes de cada pieza (3D, despiece, costo, miniatura)
    budget.ts              presupuesto: materiales, herrajes, mano de obra y acabados
    cutlist.ts             despiece para el carpintero
    actions.ts             agregar, duplicar, girar, apoyar...
    store.ts               estado único + historial + guardado + eventos tipados
  three/                   todo lo que dibuja en 3D
    materials.ts           texturas y materiales
    builders.ts            pieza del modelo -> mallas
    viewport.ts            clase Viewport: escena, cámara, selección, foto para exportar
    room.ts                habitación en 3D: piso, paredes, rodapiés, puertas y ventanas
    interaction.ts         arrastrar y girar piezas con imán y colisión
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
