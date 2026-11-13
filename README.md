# Wed Mesa 3D · Taller de Escritorios

Editor 3D en el navegador para diseñar escritorios a medida y mandarle el plano al carpintero.

- **Escritorio a medida:** en L (esquinero) o recto, con cajonera, paredes de la habitación y espacio libre.
- **Piezas sueltas:** tableros, tablero en L, paneles, estantes, faldones, patas, cajonera y cajones.
- **Exportar plano (JPG/PNG):** vista 3D con cotas a/b/c/d, vista superior a escala y despiece completo.

## Cómo ejecutarlo

Necesitas [Node.js](https://nodejs.org). No hay dependencias que instalar.

```bash
npm start
```

Luego abre http://localhost:5173

## Arquitectura

```
index.html            estructura de la página
css/styles.css        estilos (tokens de color claro/oscuro)
js/
  main.js             punto de entrada: crea todo y lo conecta
  utils/format.js     números, redondeos, nombres de archivo
  core/               datos y reglas, sin DOM ni three.js
    catalog.js        tipos de pieza, materiales, límites
    geometry.js       cajas, contorno en L, huellas, cotas
    templates.js      generador de escritorios a medida
    cutlist.js        despiece para el carpintero
    actions.js        agregar, duplicar, girar, apoyar...
    store.js          estado único + historial + guardado + eventos
  three/              todo lo que dibuja en 3D
    materials.js      texturas y materiales
    builders.js       pieza del modelo -> mallas
    viewport.js       escena, cámara, paredes, selección, foto para exportar
    interaction.js    arrastrar piezas con imán
  ui/                 paneles, ventanas y teclado
  export/sheet.js     lámina del plano (canvas)
```

**Flujo de datos:** la interfaz y el arrastre llaman a `store` (o a `actions`); el `store` cambia el modelo,
guarda en `localStorage`, apila el historial y emite eventos (`reset`, `added`, `removed`, `rebuilt`, `moved`,
`select`, `history`). La vista 3D y los paneles solo escuchan esos eventos. Nada en `core/` sabe de la pantalla,
así que se puede reutilizar en un servidor o en pruebas.

### Agregar un tipo de pieza

1. Declararlo en `js/core/catalog.js` (`TYPES`).
2. Construir su malla en `js/three/builders.js`.
3. Si se fabrica con varias tablas, describir su despiece en `js/core/cutlist.js`.

## Controles

- Arrastra una pieza para moverla; con Shift (o "Mover en altura") sube y baja.
- Arrastra el fondo para girar la vista; la rueda acerca y aleja.
- Doble clic en un cajón para abrirlo o cerrarlo.
- Flechas: mover · R: girar · Supr: eliminar · Ctrl+Z / Ctrl+Y: deshacer / rehacer.

Hecho con [three.js](https://threejs.org).
