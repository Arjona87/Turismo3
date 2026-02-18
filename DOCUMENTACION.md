# Documentación Técnica - Dashboard Turismo Jalisco

## Descripción General

Este proyecto es una aplicación web interactiva que integra un mapa de Leaflet con datos dinámicos de un Google Sheet. La aplicación carga información de pueblos mágicos de Jalisco y la presenta de manera interactiva.

## Arquitectura

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos responsivos con flexbox
- **JavaScript Vanilla**: Sin dependencias externas (excepto Leaflet)
- **Leaflet.js**: Librería de mapas

### Backend
- **Google Sheets**: Base de datos en la nube
- **CSV Export API**: Exportación de datos en formato CSV

## Componentes Principales

### 1. TurismoDataManager (app.js)

Clase responsable de:
- Conectarse a Google Sheets
- Parsear datos CSV
- Detectar cambios en los datos
- Actualizar marcadores en el mapa

**Métodos principales:**
- `fetchDataFromGoogleSheets()`: Obtiene datos del sheet
- `parseCSVData()`: Parsea el CSV
- `parseCSVText()`: Parseador robusto para CSV con campos multilinea
- `updateData()`: Actualiza datos automáticamente o manualmente

### 2. Funciones de Mapa

- `initMap()`: Inicializa el mapa de Leaflet
- `loadGeoJSON()`: Carga los límites municipales
- `updatePueblosMagicosMarkers()`: Crea/actualiza marcadores
- `showPuebloInfo()`: Muestra modal con información

### 3. Estilos (styles.css)

- **Modal mejorado**: max-width 700px para evitar truncamiento
- **Links descriptivos**: Botones con estilos claros
- **Responsive**: Breakpoints en 768px y 480px
- **Animaciones**: Fade-in y slide-in para modales

## Flujo de Datos

```
Google Sheet (CSV)
    ↓
fetch() a URL de exportación
    ↓
parseCSVText() - Parsea con manejo de multilinea
    ↓
Objeto JavaScript con datos de pueblos
    ↓
Crear marcadores en el mapa
    ↓
Click en marcador → showPuebloInfo()
    ↓
Modal con información completa
```

## Parseador CSV Robusto

El parseador `parseCSVText()` maneja:
- Campos con comillas
- Campos con saltos de línea
- Comillas escapadas
- Diferentes terminadores de línea (\n, \r\n)

Ejemplo de campo multilinea:
```csv
"Disfruta el centro a pie: Tequila es un Pueblo Mágico muy caminable;
mantén tus pertenencias personales..."
```

## Actualización Automática

- Intervalo: 5 segundos
- Compara hash de datos anteriores con nuevos
- Solo actualiza si hay cambios
- Botón manual para forzar actualización

## Estructura del Google Sheet

```
Columna A: # (número de fila)
Columna B: Pueblo Mágico (nombre)
Columna C: Latitud
Columna D: Longitud
Columna E: Consejos de Seguridad (puede tener saltos de línea)
Columna F: Distancia / Tiempo
Columna G: Ruta/Viaje desde GDL (URL)
Columna H: Link Turismo (URL)
```

## Mejoras Implementadas

1. **Modal ampliado**: De 500px a 700px
2. **Links sin truncamiento**: Texto descriptivo en lugar de URLs
3. **Parseador CSV mejorado**: Maneja campos con saltos de línea
4. **Detección flexible**: Usa índices de columna por posición
5. **Indicador de estado**: Muestra estado de carga de datos
6. **Scroll en modal**: Para contenido largo

## Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/arjona87/Turismo3.git
cd Turismo3

# Servir localmente
python3 -m http.server 8000

# Acceder a http://localhost:8000
```

## Despliegue en GitHub Pages

1. Push a rama `main`
2. GitHub Pages automáticamente despliega desde `/` (root)
3. URL: `https://arjona87.github.io/Turismo3/`

## Consideraciones de Seguridad

- No hay datos sensibles en el código
- Google Sheet debe ser público (lectura)
- CORS habilitado para Google Sheets
- Sin almacenamiento local de datos

## Rendimiento

- Tamaño del GeoJSON: ~15MB (descargado una sola vez)
- CSV: ~2KB (actualizado cada 5 segundos)
- Mapa: Renderizado con Leaflet (optimizado)
- Sin base de datos backend

## Navegadores Soportados

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers modernos

## Futuras Mejoras

- [ ] Filtros por categoría
- [ ] Búsqueda de pueblos
- [ ] Rutas entre pueblos
- [ ] Galería de imágenes
- [ ] Reseñas de usuarios
- [ ] Integración con APIs de turismo

---

**Versión:** 2.0
**Última actualización:** 18 de Febrero de 2026
