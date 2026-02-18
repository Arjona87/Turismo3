/*
 * Dashboard Turismo - Jalisco (Versión Mejorada)
 * Script principal para la gestión del mapa interactivo con carga dinámica desde Google Sheets
 * 
 * Funcionalidades:
 * - Carga dinámica de datos desde Google Sheets (CSV)
 * - Renderizado de municipios desde GeoJSON
 * - Interactividad: hover transparente y click para mostrar información
 * - Pop-ups mejorados con información turística sin truncamiento
 * - Links con texto descriptivo (no URLs visibles)
 * - Actualización manual de datos
 */

// ============================================
// VARIABLES GLOBALES
// ============================================

let map;
let geojsonLayer;
let turismoDatos = {};
let currentActiveFeature = null;
let pueblosMagicosMarkers = [];
let dataManager;

// Colores y estilos
const STYLES = {
    default: {
        color: '#666',
        weight: 2,
        opacity: 0.7,
        fillColor: '#d0d0d0',
        fillOpacity: 0.7
    },
    hover: {
        color: '#2a5298',
        weight: 2.5,
        opacity: 1,
        fillColor: '#2a5298',
        fillOpacity: 0.3
    },
    active: {
        color: '#1e3c72',
        weight: 3,
        opacity: 1,
        fillColor: '#2a5298',
        fillOpacity: 0.5
    }
};

// ============================================
// CLASE GESTOR DE DATOS DESDE GOOGLE SHEETS
// ============================================

class TurismoDataManager {
    constructor() {
        // URL de exportación CSV del Google Sheet
        // ID del sheet: 1x8jI4RYM6nvhydMfxBn68x7shxyEuf_KWNC0iDq8mzw
        // gid: 0 (primera hoja)
        this.googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1x8jI4RYM6nvhydMfxBn68x7shxyEuf_KWNC0iDq8mzw/export?format=csv&gid=0';
        this.updateInterval = 5000; // 5 segundos
        this.lastDataHash = null;
        this.isUpdating = false;
        this.statusElement = null;
        this.createStatusIndicator();
        this.startAutoUpdate();
    }

    createStatusIndicator() {
        // Crear indicador de estado en el header
        const headerContent = document.querySelector('.header-content');
        if (headerContent) {
            this.statusElement = document.querySelector('.status-indicator');
        }
    }

    updateStatus(icon, text) {
        const statusIcon = document.getElementById('status-icon');
        const statusText = document.getElementById('status-text');
        if (statusIcon) statusIcon.textContent = icon;
        if (statusText) statusText.textContent = text;
    }

    startAutoUpdate() {
        // Actualizar datos automáticamente
        setInterval(() => {
            this.updateData();
        }, this.updateInterval);

        // Botón de actualización manual
        const manualUpdateBtn = document.getElementById('manual-update');
        if (manualUpdateBtn) {
            manualUpdateBtn.addEventListener('click', () => {
                this.updateData(true);
            });
        }
    }

    async updateData(manual = false) {
        if (this.isUpdating) return;
        
        this.isUpdating = true;
        if (manual) {
            this.updateStatus('🔄', 'Actualizando datos...');
        }

        try {
            const newData = await this.fetchDataFromGoogleSheets();
            const newHash = JSON.stringify(newData).split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);

            if (newHash !== this.lastDataHash || manual) {
                turismoDatos = {};
                newData.forEach(pueblo => {
                    turismoDatos[pueblo.nombre] = pueblo;
                });
                this.lastDataHash = newHash;
                
                // Actualizar marcadores en el mapa
                if (typeof updatePueblosMagicosMarkers === 'function') {
                    updatePueblosMagicosMarkers();
                }
                
                this.updateStatus('🟢', 'Datos actualizados');
                console.log('✓ Datos actualizados desde Google Sheets:', Object.keys(turismoDatos).length, 'pueblos');
            } else {
                this.updateStatus('🟢', 'Sin cambios');
            }
        } catch (error) {
            console.error('Error actualizando datos:', error);
            this.updateStatus('❌', 'Error de conexión');
        }

        this.isUpdating = false;
    }

    async fetchDataFromGoogleSheets() {
        try {
            const response = await fetch(this.googleSheetsUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            return this.parseCSVData(csvText);
        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            throw error;
        }
    }

    parseCSVData(csvText) {
        const data = [];
        
        // Usar un parseador robusto para CSV con campos multilinea
        const rows = this.parseCSVText(csvText);
        
        if (rows.length < 2) return data;
        
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        console.log('📋 Headers detectados:', headers);
        
        // Detectar índices de columnas por posición
        let latitudIndex = 2;      // Columna C
        let longitudIndex = 3;     // Columna D
        let nombreIndex = 1;       // Columna B
        let seguridadIndex = 4;    // Columna E
        let distanciaIndex = 5;    // Columna F
        let rutaIndex = 6;         // Columna G
        let linkTurismoIndex = 7;  // Columna H
        
        console.log('✅ Índices de columnas detectados:', {
            nombre: nombreIndex + ' (' + (nombreIndex >= 0 && nombreIndex < headers.length ? headers[nombreIndex] : 'N/A') + ')',
            latitud: latitudIndex + ' (' + (latitudIndex >= 0 && latitudIndex < headers.length ? headers[latitudIndex] : 'N/A') + ')',
            longitud: longitudIndex + ' (' + (longitudIndex >= 0 && longitudIndex < headers.length ? headers[longitudIndex] : 'N/A') + ')',
            seguridad: seguridadIndex + ' (' + (seguridadIndex >= 0 && seguridadIndex < headers.length ? headers[seguridadIndex] : 'N/A') + ')',
            distancia: distanciaIndex + ' (' + (distanciaIndex >= 0 && distanciaIndex < headers.length ? headers[distanciaIndex] : 'N/A') + ')',
            ruta: rutaIndex + ' (' + (rutaIndex >= 0 && rutaIndex < headers.length ? headers[rutaIndex] : 'N/A') + ')',
            linkTurismo: linkTurismoIndex + ' (' + (linkTurismoIndex >= 0 && linkTurismoIndex < headers.length ? headers[linkTurismoIndex] : 'N/A') + ')'
        });
        
        // Procesar filas de datos
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            try {
                // Extraer datos usando índices detectados
                const nombre = nombreIndex >= 0 && nombreIndex < row.length ? row[nombreIndex].trim() : '';
                const latitudStr = latitudIndex >= 0 && latitudIndex < row.length ? row[latitudIndex].trim() : '';
                const longitudStr = longitudIndex >= 0 && longitudIndex < row.length ? row[longitudIndex].trim() : '';
                const seguridad = seguridadIndex >= 0 && seguridadIndex < row.length ? row[seguridadIndex].trim() : '';
                const distancia = distanciaIndex >= 0 && distanciaIndex < row.length ? row[distanciaIndex].trim() : '';
                const ruta = rutaIndex >= 0 && rutaIndex < row.length ? row[rutaIndex].trim() : '';
                const linkTurismo = linkTurismoIndex >= 0 && linkTurismoIndex < row.length ? row[linkTurismoIndex].trim() : '';
                
                // Validar que tenga nombre y coordenadas
                if (!nombre || !latitudStr || !longitudStr) continue;
                
                // Procesar coordenadas
                let latitud = parseFloat(latitudStr.replace(',', '.'));
                let longitud = parseFloat(longitudStr.replace(',', '.'));
                
                if (isNaN(latitud) || isNaN(longitud)) continue;
                
                const record = {
                    nombre: nombre,
                    latitud: latitud,
                    longitud: longitud,
                    seguridad: seguridad || 'Información no disponible',
                    distancia: distancia || 'N/A',
                    ruta: ruta || '#',
                    linkTurismo: linkTurismo || '#'
                };
                
                data.push(record);
                console.log(`✅ Pueblo cargado: ${nombre} [${longitud}, ${latitud}] - Ruta: ${ruta ? 'SÍ' : 'NO'} - Link: ${linkTurismo ? 'SÍ' : 'NO'}`);
                
            } catch (error) {
                console.warn('Error procesando fila:', row, error);
            }
        }
        
        console.log(`📊 Total de pueblos procesados: ${data.length}`);
        return data;
    }

    parseCSVText(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Comilla escapada
                    currentField += '"';
                    i++; // Saltar siguiente comilla
                } else {
                    // Toggle de estado de comillas
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Fin de campo
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // Fin de fila
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField);
                    if (currentRow.some(f => f.length > 0)) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentField = '';
                }
                // Saltar \r\n
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentField += char;
            }
        }
        
        // Agregar último campo y fila
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(f => f.length > 0)) {
                rows.push(currentRow);
            }
        }
        
        return rows;
    }
}

// ============================================
// INICIALIZACIÓN DEL MAPA
// ============================================

function initMap() {
    // Crear mapa centrado en Jalisco
    map = L.map('map').setView([20.5, -103.5], 8);

    // Agregar capa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 7
    }).addTo(map);

    // Inicializar gestor de datos
    dataManager = new TurismoDataManager();
    
    // Cargar datos y mostrar pueblos mágicos
    loadTurismoData();
}

// ============================================
// CARGAR DATOS DE TURISMO DESDE GOOGLE SHEETS
// ============================================

async function loadTurismoData() {
    try {
        const data = await dataManager.fetchDataFromGoogleSheets();
        
        // Convertir array a objeto indexado por nombre
        data.forEach(pueblo => {
            turismoDatos[pueblo.nombre] = pueblo;
        });
        
        console.log('Datos de turismo cargados:', Object.keys(turismoDatos).length, 'pueblos');
        
        // Mostrar pueblos mágicos en el mapa
        updatePueblosMagicosMarkers();
        
        // Cargar GeoJSON
        loadGeoJSON();
        
    } catch (error) {
        console.error('Error cargando datos de turismo:', error);
        // Intentar cargar GeoJSON de todas formas
        loadGeoJSON();
    }
}

// ============================================
// ACTUALIZAR MARCADORES DE PUEBLOS MÁGICOS
// ============================================

function updatePueblosMagicosMarkers() {
    // Limpiar marcadores anteriores
    pueblosMagicosMarkers.forEach(marker => map.removeLayer(marker));
    pueblosMagicosMarkers = [];
    
    // Crear ícono personalizado para Pueblos Mágicos
    const puebloMagicoIcon = L.icon({
        iconUrl: 'pueblo-magico-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });

    // Agregar marcador para cada pueblo mágico
    Object.values(turismoDatos).forEach(pueblo => {
        const marker = L.marker([pueblo.latitud, pueblo.longitud], {
            icon: puebloMagicoIcon,
            title: pueblo.nombre,
            zIndexOffset: 1000
        }).addTo(map);

        // Agregar tooltip con el nombre del pueblo
        marker.bindTooltip(pueblo.nombre, {
            permanent: false,
            direction: 'top',
            className: 'pueblo-magico-tooltip'
        });

        // Evento click para mostrar información
        marker.on('click', function() {
            showPuebloInfo(pueblo.nombre);
        });

        pueblosMagicosMarkers.push(marker);
    });
}

// ============================================
// CARGAR GEOJSON DE MUNICIPIOS
// ============================================

function loadGeoJSON() {
    fetch('jalisco_municipios.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJSON(data, {
                style: getFeatureStyle,
                onEachFeature: onEachFeature
            }).addTo(map);

            // Ajustar vista al mapa cargado
            if (geojsonLayer.getLayers().length > 0) {
                map.fitBounds(geojsonLayer.getBounds(), { padding: [50, 50] });
            }
        })
        .catch(error => console.error('Error cargando GeoJSON:', error));
}

// ============================================
// OBTENER ESTILO DE CARACTERÍSTICA
// ============================================

function getFeatureStyle(feature) {
    return STYLES.default;
}

// ============================================
// PROCESAR CADA CARACTERÍSTICA DEL GEOJSON
// ============================================

function onEachFeature(feature, layer) {
    const municipioNombre = feature.properties.NOMGEO;

    // Agregar eventos de mouse
    layer.on('mouseover', function() {
        this.setStyle(STYLES.hover);
        this.bringToFront();
        
        // Mostrar nombre del municipio en tooltip
        this.bindTooltip(municipioNombre, {
            permanent: false,
            direction: 'center',
            className: 'municipio-tooltip'
        }).openTooltip();
    });

    layer.on('mouseout', function() {
        // Restaurar estilo anterior si no está activo
        if (currentActiveFeature !== this) {
            this.setStyle(STYLES.default);
        }
        this.closeTooltip();
    });

    // Evento de click para mostrar información
    layer.on('click', function() {
        // Remover estilo activo del municipio anterior
        if (currentActiveFeature && currentActiveFeature !== this) {
            currentActiveFeature.setStyle(STYLES.default);
        }

        // Establecer nuevo municipio como activo
        currentActiveFeature = this;
        this.setStyle(STYLES.active);

        // Mostrar modal con información
        showPuebloInfo(municipioNombre);
    });
}

// ============================================
// MOSTRAR INFORMACIÓN DEL PUEBLO
// ============================================

function showPuebloInfo(nombrePueblo) {
    // Obtener datos del pueblo desde Google Sheets
    const pueblo = turismoDatos[nombrePueblo] || {
        nombre: nombrePueblo,
        distancia: 'N/A',
        seguridad: 'Información no disponible',
        ruta: '#',
        linkTurismo: '#'
    };

    // Construir contenido del modal
    const modalBody = document.getElementById('modalBody');

    // Crear secciones de información
    let contenido = `
        <h2>${pueblo.nombre}</h2>
        
        <div class="info-section">
            <div class="info-label">📍 DESDE GUADALAJARA</div>
            <div class="info-value">${pueblo.distancia}</div>
        </div>

        <div class="info-section">
            <div class="info-label">🛡️ CONSEJOS DE SEGURIDAD</div>
            <div class="info-value recomendaciones">
                <div class="recomendaciones-text">${pueblo.seguridad}</div>
            </div>
        </div>

        <div class="info-section">
            <a href="tel:911" class="clicktocall-btn">
                <span class="clicktocall-icon">📞</span>
                LLAMAR AL 911
            </a>
        </div>

        <div class="info-section">
            <div class="info-label">🗺️ RUTA / VIAJE DESDE GDL</div>
            <div class="info-value">
    `;

    // Agregar link de ruta si existe
    if (pueblo.ruta && pueblo.ruta !== '#' && pueblo.ruta.length > 0) {
        contenido += `<a href="${pueblo.ruta}" target="_blank" rel="noopener noreferrer" class="info-link">Ver ruta en Waze</a>`;
    } else {
        contenido += `<span class="info-unavailable">No disponible</span>`;
    }

    contenido += `
            </div>
        </div>

        <div class="info-section">
            <div class="info-label">🌍 LINK TURISMO</div>
            <div class="info-value">
    `;

    // Agregar link de turismo si existe
    if (pueblo.linkTurismo && pueblo.linkTurismo !== '#' && pueblo.linkTurismo.length > 0) {
        contenido += `<a href="${pueblo.linkTurismo}" target="_blank" rel="noopener noreferrer" class="info-link">Visitar sitio turístico</a>`;
    } else {
        contenido += `<span class="info-unavailable">No disponible</span>`;
    }

    contenido += `
            </div>
        </div>
    `;

    modalBody.innerHTML = contenido;

    // Mostrar modal
    const modal = document.getElementById('infoModal');
    modal.style.display = 'block';
}

// ============================================
// CERRAR MODAL
// ============================================

function closeModal() {
    const modal = document.getElementById('infoModal');
    modal.style.display = 'none';

    // Remover estilo activo del municipio
    if (currentActiveFeature) {
        currentActiveFeature.setStyle(STYLES.default);
        currentActiveFeature = null;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar mapa cuando el DOM esté listo
    initMap();

    // Cerrar modal al hacer click en el botón X
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Cerrar modal al hacer click fuera del contenido
    const modal = document.getElementById('infoModal');
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // Cerrar modal al presionar ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
});
