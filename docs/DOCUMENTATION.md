# 📚 MultiPlatform-Downloader - Documentación Completa

> **Consolidación de toda la documentación técnica del proyecto**  
> *Última actualización: 25 Noviembre 2025*

---

## 📋 Índice

1. [Análisis del Proyecto](#-análisis-del-proyecto)
2. [Bugfix: Error NaN en Argumentos](#-bugfix-error-nan-en-argumentos)
3. [Fix: Códec HEVC en Windows](#-fix-códec-hevc-en-windows)
4. [Solución: Problemas de Twitter/X](#-solución-problemas-de-twitterx)

---

# 📋 Análisis del Proyecto

## 📌 RESUMEN EJECUTIVO

**Nombre:** MultiPlatform-Downloader  
**Versión:** 2.0.0  
**Autor:** Esteban Salas  
**Stack Tecnológico:** React 19 + TypeScript + Electron 38 + TailwindCSS + Zustand  
**Propósito:** Aplicación de escritorio para descargar videos de múltiples plataformas

---

## 🎯 PROPÓSITO Y FUNCIONALIDADES

### Funcionalidades Principales:
1. **Descarga de videos** de 7+ plataformas soportadas
2. **Descarga de audio** (extracción MP3)
3. **Descarga de playlists** completas
4. **Recorte de videos** (clips con tiempo inicio/fin)
5. **Subtítulos** (descarga y embebido)
6. **Cola de descargas** con múltiples descargas concurrentes
7. **Historial** de descargas completadas
8. **Control de ancho de banda** y programación horaria
9. **Caché** de información de videos
10. **Notificaciones** de sistema
11. **Vista previa con reproductor integrado** para todas las plataformas

### Plataformas Soportadas:
| Plataforma | Estado | Reproducción |
|------------|--------|--------------|
| YouTube | ✅ | Embed nativo + Shorts |
| TikTok | ✅ | Embed nativo |
| Twitter/X | ✅ | Embed iframe |
| Instagram | ✅ | Embed iframe |
| Reddit | ✅ | Embed + fallback |
| Twitch | ✅ | Proxy Electron |
| Facebook | ✅ | Proxy Electron |

---

## 🏗️ ESTRUCTURA DEL PROYECTO

```
MultiPlatform-Downloader/
├── public/
│   └── electron.js          # Main process de Electron
├── src/
│   ├── App.tsx              # Componente principal React
│   ├── index.tsx            # Entry point
│   ├── components/
│   │   ├── Download/        # Componentes de descarga
│   │   │   ├── DownloadQueue.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   ├── VideoPlayer.tsx    # Reproductor universal
│   │   │   ├── PlaylistPreview.tsx
│   │   │   └── SubtitleSelector.tsx
│   │   ├── Layout/          # Estructura de la app
│   │   ├── Views/           # Vistas principales
│   │   ├── Settings/        # Configuraciones
│   │   └── ui/              # Componentes UI reutilizables
│   ├── services/            # Lógica de negocio
│   │   ├── DownloadService.ts
│   │   └── platforms/       # Implementaciones por plataforma
│   ├── stores/              # Estado global (Zustand)
│   ├── types/               # Tipos TypeScript
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utilidades
├── docs/                    # Documentación
└── package.json
```

---

## 🟢 ASPECTOS POSITIVOS

1. ✅ **Arquitectura bien estructurada** con separación de concerns
2. ✅ **Sistema de plataformas extensible** (patrón Strategy)
3. ✅ **Estado global con Zustand** bien implementado
4. ✅ **Persistencia** de historial y configuraciones
5. ✅ **UI moderna** con TailwindCSS y animaciones
6. ✅ **Manejo de caché** para optimizar requests
7. ✅ **Sistema de notificaciones** robusto
8. ✅ **Control de ancho de banda** avanzado
9. ✅ **Reproductor de video universal** con embeds nativos
10. ✅ **Tres temas** (Default, Dark, Light)

---

## 📊 MÉTRICAS DEL CÓDIGO

| Métrica | Valor | Estado |
|---------|-------|--------|
| Archivos TypeScript/TSX | ~40 | ✅ |
| Líneas de código estimadas | ~10000 | ✅ |
| Servicios | 10 | ✅ |
| Componentes React | ~25 | ✅ |
| Plataformas soportadas | 7 | ✅ |

---

# 🔧 Bugfix: Error NaN en Argumentos

## 🐛 Problema Identificado

### Error Original
```
-f best[height<=NaN]
```

**Causa:** Cuando `job.quality` tiene el valor `'best'` o es inválido, `parseInt('best')` retorna `NaN`.

## ✅ Solución Implementada

### Helper Centralizado en BasePlatform

#### `parseQualityHeight(quality: string | undefined): number | null`
- Parsea calidad de video de forma **segura**
- Retorna `null` si la calidad es inválida o 'best'/'worst'
- Valida rangos razonables (0 < height <= 8192)

```typescript
protected parseQualityHeight(quality: string | undefined): number | null {
  if (!quality || quality === 'best' || quality === 'worst') {
    return null;
  }

  const match = quality.match(/^(\d+)p?/);
  if (!match) return null;

  const height = parseInt(match[1], 10);

  if (isNaN(height) || height <= 0 || height > 8192) {
    return null;
  }

  return height;
}
```

### Casos de Prueba

| Input | Output | Resultado |
|-------|--------|-----------|
| `'best'` | `null` | `-f bestvideo+bestaudio/best` |
| `'1080p'` | `1080` | `-f bestvideo[height<=1080]+bestaudio/best` |
| `'720p60'` | `720` | `-f bestvideo[height<=720]+bestaudio/best` |
| `'invalid'` | `null` | `-f bestvideo+bestaudio/best` (fallback) |

---

# 🎬 Fix: Códec HEVC en Windows

## 🔍 Problema Identificado

### Error de Windows
```
Necesitas un nuevo códec para reproducir este elemento
"Extensiones de video HEVC", disponible en Microsoft Store. $17.00
```

**Causa:** Windows 10/11 **NO incluye el códec HEVC (H.265) por defecto**.

### Plataformas Afectadas
- 🎵 **TikTok** - Usa HEVC frecuentemente
- 📸 **Instagram** - Reels en HEVC
- 📘 **Facebook** - Videos recientes en HEVC

## ✅ Solución Implementada

### Estrategia: Re-codificación Automática a H.264

```typescript
if (ffmpegPath) {
  // Re-codificar a H.264 para compatibilidad universal
  args.push('--recode-video', 'mp4');
  args.push('--postprocessor-args', 'ffmpeg:-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k');
}
```

### Parámetros de FFmpeg

| Parámetro | Descripción |
|-----------|-------------|
| `--recode-video mp4` | Fuerza re-codificación |
| `-c:v libx264` | Códec H.264 (universal) |
| `-preset fast` | Balance velocidad/calidad |
| `-crf 23` | Calidad visual sin pérdida |
| `-c:a aac -b:a 128k` | Audio AAC a 128 kbps |

### Comparación: HEVC vs H.264

| Aspecto | HEVC (H.265) | H.264 (Solución) |
|---------|--------------|------------------|
| **Compatibilidad** | ❌ Limitada | ✅ Universal |
| **Windows** | ❌ $17 USD | ✅ Incluido |
| **Tamaño** | Menor (~30%) | Normal |
| **Calidad** | Excelente | Excelente |

---

# 🐦 Solución: Problemas de Twitter/X

## 🔍 Problema Identificado

### Error de yt-dlp
```
ERROR: [twitter] 1974473033017630952: No video could be found in this tweet
```

**Causas Posibles:**
1. Cuenta Privada/Protegida
2. Video Eliminado
3. Contenido Restringido por Edad
4. Cambios en la API de Twitter
5. Rate Limiting

## ✅ Soluciones Implementadas

### 1. Detección Mejorada de Errores

```typescript
if (stderr.includes('[twitter]') && stderr.includes('No video could be found')) {
  return {
    isRecoverable: false,
    message: '❌ Twitter/X: Video not accessible. This may be due to:\n' +
             '• Private or protected account\n' +
             '• Deleted tweet\n' +
             '• Age-restricted content\n' +
             '• Video removed by Twitter'
  };
}
```

### 2. Headers y User-Agent Mejorados

```typescript
args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...');
args.push('--add-header', 'Referer:https://twitter.com/');
args.push('--no-check-certificate');
```

### 3. Estrategias de Descarga

| Error | Mensaje | Acción |
|-------|---------|--------|
| `No video could be found` | Video no accesible | Sugerir cookies |
| `Login required` | Autenticación requerida | Sugerir cookies |
| `Private video` | Video privado | No recuperable |
| `HTTP Error 429` | Rate limited | Esperar |

## 💡 Solución para Contenido Restringido: Cookies

### ¿Por qué usar cookies?
Las cookies permiten a yt-dlp autenticarse como si fueras tú:
- ✅ Contenido restringido por edad
- ✅ Tweets de cuentas que sigues
- ✅ Contenido sensible

### Cómo exportar cookies:

1. **Instalar extensión** "Get cookies.txt LOCALLY"
2. **Iniciar sesión** en Twitter/X
3. **Exportar** el archivo `cookies.txt`
4. **Usar:** `yt-dlp --cookies /path/to/cookies.txt [URL]`

---

# 🎬 VideoPlayer Universal

## Arquitectura

```
Platform Detection →
  ├─ YouTube (regular + Shorts) → iframe embed
  ├─ TikTok → iframe embed nativo
  ├─ Twitter/X → iframe embed
  ├─ Instagram → iframe embed
  ├─ Reddit → iframe + fallback
  └─ Others → Electron IPC Proxy → HTML5 video
```

## Componentes

| Componente | Plataforma | Método |
|------------|------------|--------|
| `YouTubeEmbed` | YouTube | `youtube.com/embed/{id}` |
| `TikTokEmbed` | TikTok | `tiktok.com/embed/v2/{id}` |
| `TwitterEmbed` | Twitter/X | `platform.twitter.com/embed` |
| `InstagramEmbed` | Instagram | `instagram.com/p/{id}/embed` |
| `RedditEmbed` | Reddit | `redditmedia.com` |
| `ProxyVideoPlayer` | Otros | Proxy via Electron IPC |

---

# 🎨 Sistema de Temas

## Tres Temas Disponibles

### Default (Premium Blue)
- Gradientes azules premium
- Efectos glassmorphism
- Look moderno y elegante

### Dark (Pure)
- Grises puros (#0a0a0a, #141414)
- Sin tinte azul
- Máximo contraste

### Light (Clean)
- Fondos blancos/grises claros
- Texto de alta legibilidad
- Tips en azul oscuro (#1e40af)

---

*Documentación consolidada el: 25 Noviembre 2025*  
*Análisis y desarrollo: GitHub Copilot (Claude Opus 4.5)*
