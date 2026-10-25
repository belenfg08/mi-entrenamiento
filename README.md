# Mi Entrenamiento

App web personal para anotar en un solo lugar el gimnasio, las clases de jiu-jitsu y lucha, lo que como y mi peso. Se usa desde el celular o el PC, funciona sin internet y los datos no salen del dispositivo.

**[Abrir la app](https://belenfg08.github.io/mi-entrenamiento/)**

![Pantallas de Resumen, Tatami (con la faixa) y Gimnasio con datos de ejemplo](docs/captura.png)

*La captura usa datos de ejemplo inventados.*

## Qué hace

- **Resumen semanal:** los días de la semana con lo que se registró cada día, más sesiones de gimnasio, clases, horas y combates en el tatami, promedio de calorías y proteína, y cambio de peso.
- **Gimnasio:** ejercicios con series, repeticiones y kilos. Calcula récords y un 1RM estimado (fórmula de Epley). El botón «Repetir» carga una rutina anterior.
- **Mi faixa:** la faixa actual de BJJ (blanca, azul, morada, marrón o negra) con sus grados, dibujada como cinturón, más el historial de graduaciones y cuántas clases y horas de BJJ van desde la última. Al registrar una graduación, la app propone la siguiente (un grado más, o la faixa siguiente después del 4.º grado). Cada graduación se puede corregir (✏️) o borrar. Los nombres también aparecen en portugués (branca, roxa, marrom, preta).
- **Tatami (BJJ con gi, sin gi, lucha, open mat):** duración, combates, técnicas vistas, qué salió bien, qué repasar, cansancio (1-10) y molestias. Tiene buscador.
- **Fotos (opcional):** hasta 4 por entrenamiento de gimnasio o clase de tatami, sacadas con la cámara o elegidas de la galería. Se achican a 1280 px (JPEG) y se ven en miniatura en el historial; al tocarlas se abren en grande.
- **Comida:** alimentos por momento del día, con barras de avance hacia la meta de calorías y proteína, y accesos rápidos a lo que más se repite.
  - **Buscar alimentos:** en una lista de 41 alimentos comunes con valores aproximados por 100 g (funciona sin internet) y en [Open Food Facts](https://world.openfoodfacts.org). Al elegir uno y escribir los gramos, calcula las calorías y la proteína.
  - **Código de barras:** con la cámara (usa `BarcodeDetector` si el navegador lo trae o, si no, la librería ZXing) o escribiendo el número, busca el producto en Open Food Facts.
- **Peso:** un registro por día, con gráfico e historial. En la versión Android (ver abajo) se llena solo con el peso que la báscula deja en Health Connect.
- **Ajustes:** metas diarias, descargar y restaurar un respaldo (`.json`), y borrar todo.

## Uso

1. Abre **[la app](https://belenfg08.github.io/mi-entrenamiento/)** en el navegador del celular.
2. Instálala como ícono en la pantalla de inicio:
   - **Android (Chrome):** menú ⋮ → «Agregar a la pantalla principal».
   - **iPhone (Safari):** botón Compartir → «Agregar a inicio».
3. Después de la primera visita abre también sin internet.

En el PC también se puede abrir `index.html` con doble clic; en ese caso no funciona el modo sin internet.

### Versión Android (uso personal)

Existe además un APK hecho con Capacitor que empaqueta esta misma app y agrega la lectura del peso desde Health Connect (por ejemplo, el que registra una báscula Eufy a través de EufyLife), con permiso solo para leer el peso. Ese proyecto no está publicado en este repositorio. El código de `app.js` que lo usa no hace nada cuando la app se abre en un navegador.

La búsqueda por **nombre** en Open Food Facts solo funciona en el APK: su buscador no acepta llamadas desde páginas web. En el navegador funcionan la lista de alimentos comunes y la búsqueda por código de barras.

### Dónde quedan los datos

Todo se guarda en el navegador donde se usa la app: los registros en `localStorage` y las fotos en IndexedDB. El respaldo `.json` incluye las fotos. No hay servidor ni cuenta. Lo único que sale a internet es lo que se busca en Open Food Facts: el texto escrito o el número del código de barras, nunca los registros. Por lo mismo:

- Los datos del celular y los del PC **no se sincronizan** entre sí.
- Si se borran los datos del navegador, se pierden los registros. Conviene usar **Ajustes → Descargar respaldo** de vez en cuando.

## Cómo está hecha

HTML, CSS y JavaScript sin compilación. La única librería incluida es [@zxing/library](https://github.com/zxing-js/library) 0.21.3 (Apache-2.0), en `vendor/`, para leer códigos de barras; se carga solo al abrir el escáner. Los datos de productos vienen de Open Food Facts (licencia ODbL) y la lista común está en `alimentos.js`. Es una *Progressive Web App*: `manifest.webmanifest` permite instalarla y `sw.js` guarda los archivos para que abra sin conexión.

## Cómo se verificó

- Se registraron datos de prueba en todas las secciones en un navegador con tamaño de celular (375 px), y se revisó que los totales, récords y promedios fueran correctos. Por ejemplo, 65 kg × 6 da un 1RM estimado de 78 kg.
- Se recargó la página para confirmar que los datos se mantienen, que no hay errores en la consola, que la página no se desborda a lo ancho y que el modo sin internet guarda todos los archivos.
- Faixas: se registró blanca con 4 grados y luego azul, y se revisó que la app propusiera la siguiente graduación, que la negra permita hasta 6 grados y que las clases de lucha no cuenten como clases de BJJ.
- Fotos: con imágenes de prueba generadas en el navegador se revisó el límite de 4, la reducción (3000×2000 → 1280×853), que se mantengan al recargar, el visor, que al borrar un entrenamiento se borren sus fotos, y el ciclo respaldo → borrar todo → restaurar. También se revisó que guardar justo después de elegir las fotos no las pierda ni duplique la entrada.
- Alimentos: se revisó el cálculo por gramos (150 g de yogur griego a 97 kcal/100 g dan 146 kcal), que se guarde como frecuente con sus valores por 100 g, y la consulta real a Open Food Facts por código de barras (7802955007799), además de los mensajes de código inválido o no encontrado. El lector ZXing decodificó un EAN-13 dibujado en pantalla.
- Peso desde Health Connect: se probó la lógica con datos simulados (último pesaje del día, redondeo, el peso más reciente entre báscula y manual, sin duplicar) y la usuaria confirmó en su Android que se sincroniza el peso de su báscula.
- No se probaron con fotos reales de un celular ni con la ventana real de descarga y selección de archivos. La cámara del escáner no se pudo probar en el navegador de desarrollo.

## Límites

- Sin sincronización entre dispositivos ni copia en la nube.
- Los valores de la lista común son aproximados, y los de Open Food Facts los suben voluntarios, así que pueden tener errores: conviene compararlos con la etiqueta.
- Buscar alimentos en Open Food Facts necesita internet.
- Las faixas son las de adulto; no incluye las faixas infantiles (gris, amarilla, naranja, verde).
- El 1RM es una estimación y no reemplaza una prueba real ni la indicación de un profesional.

## Autoría

Belén Fuentes González. Desarrollado con asistencia de IA (Claude Code); las decisiones y la verificación son mías.

Licencia [MIT](LICENSE).
