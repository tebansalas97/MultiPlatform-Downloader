# 🎬 MultiPlatform Downloader

[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-38.1.2-47848F?logo=electron)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

Una aplicación de escritorio moderna para descargar videos de múltiples plataformas con una interfaz intuitiva y potente sistema de gestión de descargas.

## ✨ Características

### 🌐 Plataformas Soportadas
- **YouTube** - Videos, Shorts, y Playlists completas
- **TikTok** - Videos públicos
- **Twitter/X** - Videos de tweets
- **Instagram** - Reels y videos de posts
- **Reddit** - Videos de posts
- **Twitch** - Clips y VODs
- **Facebook** - Videos públicos

### 🎯 Funcionalidades Principales
- 📥 **Descarga de video/audio** en múltiples calidades (hasta 4K)
- 🎵 **Extracción de audio** en MP3, M4A, WAV, FLAC
- 📋 **Descarga de playlists** completas de YouTube
- 🔄 **Cola de descargas** con gestión de prioridad
- ⏸️ **Pausar/Reanudar** descargas en progreso
- 📊 **Monitor de ancho de banda** con límites configurables
- 🌙 **Tema oscuro** moderno
- ⌨️ **Atajos de teclado** para acciones rápidas

### ⚙️ Características Avanzadas
- 🔧 **Detección automática** de FFmpeg y yt-dlp
- 📈 **Control de ancho de banda** con horarios
- 💾 **Sistema de caché** para metadata
- 🔔 **Notificaciones** de progreso y completado
- 📝 **Historial** de descargas
- 🔀 **Proxy** configurable

## 📋 Requisitos del Sistema

### Dependencias Externas (Obligatorias)
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** - Motor de descarga de videos
- **[FFmpeg](https://ffmpeg.org/)** - Procesamiento y merge de video/audio

### Instalación de Dependencias

#### Windows
```powershell
# Usando winget (recomendado)
winget install --id=yt-dlp.yt-dlp -e
winget install --id=Gyan.FFmpeg -e

# O usando Chocolatey
choco install yt-dlp ffmpeg
```

#### macOS
```bash
# Usando Homebrew
brew install yt-dlp ffmpeg
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install yt-dlp ffmpeg

# Fedora
sudo dnf install yt-dlp ffmpeg

# Arch Linux
sudo pacman -S yt-dlp ffmpeg
```

## 🚀 Instalación

### Opción 1: Descargar el Instalador
Descarga la última versión desde [Releases](https://github.com/tu-usuario/multiplatform-downloader/releases).

### Opción 2: Compilar desde Código Fuente

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/multiplatform-downloader.git
cd multiplatform-downloader

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run electron-dev

# Crear ejecutable
npm run dist
```

## 🛠️ Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm start` | Inicia el servidor de desarrollo React |
| `npm run electron-dev` | Inicia la app en modo desarrollo |
| `npm run build` | Compila la aplicación React |
| `npm run dist` | Crea el instalador de escritorio |
| `npm test` | Ejecuta las pruebas |

## 📖 Uso

### Descarga Básica
1. Copia la URL del video
2. Pega en la aplicación (o usa `Ctrl+V`)
3. Selecciona la calidad deseada
4. Haz clic en "Descargar"

### Descargar Playlist de YouTube
1. Pega la URL de la playlist
2. Selecciona los videos que deseas
3. Configura calidad y carpeta de destino
4. Inicia la descarga

### Atajos de Teclado
| Atajo | Acción |
|-------|--------|
| `Ctrl+V` | Pegar URL |
| `Ctrl+Shift+D` | Descargar URL pegada |
| `Ctrl+O` | Abrir carpeta de descargas |
| `Ctrl+,` | Abrir configuración |
| `Esc` | Cerrar diálogo actual |

## 🏗️ Arquitectura del Proyecto

```
src/
├── components/
│   ├── Download/      # Componentes de descarga
│   ├── Layout/        # Estructura de la UI
│   ├── Settings/      # Configuración
│   ├── ui/           # Componentes reutilizables
│   └── Views/        # Vistas principales
├── config/
│   ├── constants.ts   # Constantes de la app
│   └── webMode.ts    # Configuración web
├── hooks/            # Custom React hooks
├── services/
│   ├── platforms/    # Implementaciones por plataforma
│   └── *.ts         # Servicios principales
├── stores/           # Estado global (Zustand)
├── types/            # TypeScript interfaces
└── utils/            # Utilidades
```

## 🔧 Configuración

### Límite de Ancho de Banda
Configura límites de velocidad en `Configuración > Ancho de Banda`:
- Límite global (KB/s)
- Horarios de límite automático
- Modo adaptativo según red

### Proxy
Configura un proxy en `Configuración > Proxy`:
- HTTP/HTTPS/SOCKS5
- Autenticación opcional

### Carpeta de Descargas
Cambia la carpeta por defecto en `Configuración > General`.

## 🐛 Solución de Problemas

### FFmpeg no detectado
```powershell
# Verificar instalación
ffmpeg -version

# Reinstalar con winget
winget install --id=Gyan.FFmpeg -e --force
```

### Error de descarga
- Verifica que el video sea público
- Actualiza yt-dlp: `yt-dlp -U`
- Revisa tu conexión a internet

### Video sin audio
- Asegúrate de que FFmpeg esté instalado
- Reinicia la aplicación

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu rama (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -am 'Add: nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - El motor de descarga
- [FFmpeg](https://ffmpeg.org/) - Procesamiento de video
- [Electron](https://www.electronjs.org/) - Framework de escritorio
- [React](https://reactjs.org/) - Biblioteca UI
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS

---

<div align="center">
  Hecho con ❤️ por Esteban Salas
</div>
