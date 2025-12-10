# MultiPlatform-Downloader - Documentacion Tecnica

> **Manual completo de usuario y desarrollador**
> *Version: 2.0.0*

---

## Indice

1. [Introduccion](#introduccion)
2. [Caracteristicas y Funcionalidades](#caracteristicas-y-funcionalidades)
3. [Guia de Usuario](#guia-de-usuario)
4. [Arquitectura Tecnica](#arquitectura-tecnica)
5. [Configuracion y Ajustes](#configuracion-y-ajustes)
6. [Solucion de Problemas Comunes](#solucion-de-problemas-comunes)

---

# Introduccion

**MultiPlatform-Downloader** es una aplicacion de escritorio robusta y moderna diseñada para facilitar la descarga de contenido multimedia desde las plataformas sociales mas populares. Construida con tecnologias web de vanguardia (React, TypeScript) sobre el framework Electron, ofrece una experiencia de usuario fluida y nativa en Windows.

El objetivo principal del proyecto es unificar la descarga de videos y audio en una sola herramienta, eliminando la necesidad de utilizar multiples sitios web llenos de publicidad o herramientas de linea de comandos complejas.

---

# Caracteristicas y Funcionalidades

### Soporte Multi-Plataforma
La aplicacion es capaz de detectar y procesar enlaces de:
*   **YouTube**: Videos individuales, Shorts, y Playlists completas.
*   **TikTok**: Videos sin marca de agua (cuando es posible).
*   **Twitter/X**: Videos de tweets.
*   **Instagram**: Reels y videos de publicaciones.
*   **Facebook**: Videos publicos.
*   **Twitch**: Clips y VODs.
*   **Reddit**: Videos embebidos en posts.

### Motor de Descarga Potente
*   **Alta Calidad**: Soporte para resoluciones hasta 4K y 8K si estan disponibles.
*   **Formatos de Audio**: Extraccion directa a MP3, M4A, WAV y FLAC con metadatos.
*   **Subtitulos**: Descarga automatica de subtitulos y opcion para incrustarlos en el video.
*   **Recorte de Video**: Herramienta integrada para descargar solo un fragmento especifico del video.

### Gestion de Descargas
*   **Cola de Descargas**: Añade multiples enlaces y deja que la aplicacion los procese secuencialmente o en paralelo.
*   **Control de Ancho de Banda**: Limita la velocidad de descarga para no saturar tu red.
*   **Programacion**: Define horarios en los que las descargas estan permitidas.
*   **Reintentos Automaticos**: Sistema inteligente que reintenta descargas fallidas por problemas de red.

### Interfaz de Usuario
*   **Temas**: Soporte para modo Claro, Oscuro y tema por defecto (Azul Premium).
*   **Vista Previa**: Reproductor integrado para verificar el video antes de descargarlo.
*   **Historial**: Registro persistente de todas las descargas realizadas.

---

# Guia de Usuario

### Descargar un Video
1.  Copia el enlace del video desde tu navegador.
2.  La aplicacion detectara automaticamente el enlace si tienes el monitoreo del portapapeles activo, o puedes pegarlo manualmente con `Ctrl+V`.
3.  La aplicacion analizara el video y mostrara sus detalles (titulo, duracion, miniatura).
4.  Selecciona el formato (Video+Audio, Solo Video, Solo Audio) y la calidad deseada.
5.  Haz clic en **"Add to Queue"**.

### Descargar una Playlist
1.  Pega el enlace de una lista de reproduccion de YouTube.
2.  Se abrira una ventana modal mostrando todos los videos de la lista.
3.  Puedes seleccionar/deseleccionar videos especificos.
4.  Haz clic en **"Download Selected"** para añadir todos a la cola.

### Actualizaciones Automaticas
La aplicacion busca actualizaciones cada vez que se inicia. Si encuentra una nueva version (ej. v2.0.1), la descargara en segundo plano y te notificara para reiniciar e instalar. No es necesario visitar la pagina web nuevamente.

---

# Arquitectura Tecnica

El proyecto sigue una arquitectura moderna basada en **Electron** con **React**.

### Stack Tecnologico
*   **Frontend**: React 19, TypeScript, TailwindCSS, Framer Motion.
*   **Backend (Main Process)**: Electron 38, Node.js.
*   **Estado**: Zustand para gestion de estado global.
*   **Core**: `yt-dlp` para la interaccion con las plataformas y `ffmpeg` para el procesamiento multimedia.

### Estructura de Directorios
*   `src/components`: Componentes de React divididos por funcionalidad (Download, Settings, UI).
*   `src/services`: Logica de negocio. Aqui reside el `DownloadService` que orquesta las descargas y el `PlatformService` que maneja las estrategias por plataforma.
*   `src/stores`: Stores de Zustand para persistencia de datos.
*   `public/electron.js`: Punto de entrada del proceso principal de Electron.

### Patron de Diseño: Strategy
Para manejar multiples plataformas, se utiliza el patron Strategy. Cada plataforma (YouTube, TikTok, etc.) tiene su propia clase que implementa una interfaz comun `IPlatform`. Esto permite añadir nuevas plataformas facilmente sin modificar el codigo base del servicio de descargas.

---

# Configuracion y Ajustes

### General
*   **Carpeta de Descargas**: Define donde se guardaran los archivos.
*   **Descargas Simultaneas**: Configura cuantos videos se pueden descargar al mismo tiempo (1-4).

### Red
*   **Limite de Velocidad**: Establece un limite maximo de descarga (ej. 5 MB/s).
*   **Proxy**: Configuracion de proxy HTTP/HTTPS para evadir restricciones regionales.

### Avanzado
*   **Cookies**: Importacion de cookies (formato Netscape) para descargar contenido con restriccion de edad o premium.

---

# Solucion de Problemas Comunes

### Videos de TikTok/Instagram no se reproducen en Windows
**Causa**: Windows no incluye el codec HEVC por defecto.
**Solucion**: La aplicacion ahora convierte automaticamente estos videos al formato H.264 (universal) durante la descarga, por lo que seran compatibles con cualquier reproductor sin necesidad de instalar extensiones de pago.

### Error en Twitter/X "No video found"
**Causa**: El tweet puede ser de una cuenta privada o contenido sensible.
**Solucion**: Asegurate de que el tweet es publico. Para contenido restringido, es necesario configurar las cookies en la seccion de ajustes.

### La descarga falla inmediatamente
**Solucion**: Verifica tu conexion a internet. Si el problema persiste, intenta actualizar los binarios de `yt-dlp` (la aplicacion intenta hacerlo automaticamente, pero puede requerir reinicio).
