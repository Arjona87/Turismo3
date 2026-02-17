/*
 * Dashboard Turismo - Jalisco
 * Script principal para la gestión del mapa interactivo
 * 
 * Funcionalidades:
 * - Carga del mapa base con Leaflet
 * - Renderizado de municipios desde GeoJSON
 * - Interactividad: hover transparente y click para mostrar información
 * - Pop-ups con información turística desde Google Sheets (vía municipios_data.json)
 * - Marcadores de Pueblos Mágicos
 */

// ============================================
// VARIABLES GLOBALES
// ============================================

let map;
let geojsonLayer;
let municipiosData = {};
let currentActiveFeature = null;
let pueblosMagicosData = [];
let pueblosMagicosMarkers = [];

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

    // Cargar datos de municipios desde archivo local
    loadMunicipiosData();
    
    // Cargar y mostrar Pueblos Mágicos
    loadPueblosMagicos();
}

// ============================================
// CARGAR DATOS DE MUNICIPIOS (desde archivo local)
// ============================================

function loadMunicipiosData() {
    fetch('municipios_data.json')
        .then(response => response.json())
        .then(data => {
            // Convertir array a objeto indexado por nombre
            data.municipios.forEach(municipio => {
                municipiosData[municipio.nombre] = municipio;
            });
            console.log('Datos cargados:', Object.keys(municipiosData).length, 'municipios');
            // Cargar GeoJSON después de obtener los datos
            loadGeoJSON();
        })
        .catch(error => {
            console.error('Error cargando municipios_data.json:', error);
            // Intentar cargar GeoJSON de todas formas
            loadGeoJSON();
        });
}

// ============================================
// CARGAR Y MOSTRAR PUEBLOS MÁGICOS
// ============================================

function loadPueblosMagicos() {
    fetch('pueblos_magicos.json')
        .then(response => response.json())
        .then(data => {
            pueblosMagicosData = data.pueblos_magicos;
            addPueblosMagicosToMap();
        })
        .catch(error => console.error('Error cargando pueblos_magicos.json:', error));
}

function addPueblosMagicosToMap() {
    // Crear ícono personalizado para Pueblos Mágicos
    const puebloMagicoIcon = L.icon({
        iconUrl: 'pueblo-magico-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });

    // Agregar marcador para cada Pueblo Mágico
    pueblosMagicosData.forEach(pueblo => {
        const marker = L.marker([pueblo.lat, pueblo.lng], {
            icon: puebloMagicoIcon,
            title: pueblo.nombre,
            zIndexOffset: 1000
        }).addTo(map);

        // Agregar tooltip con el nombre del Pueblo Mágico
        marker.bindTooltip(pueblo.nombre, {
            permanent: false,
            direction: 'top',
            className: 'pueblo-magico-tooltip'
        });

        // Evento click para mostrar información del municipio
        marker.on('click', function() {
            showMunicipioInfo(pueblo.nombre);
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
        showMunicipioInfo(municipioNombre);
    });
}

// ============================================
// MOSTRAR INFORMACIÓN DEL MUNICIPIO
// ============================================

function showMunicipioInfo(municipioNombre) {
    // Obtener datos del municipio
    const municipio = municipiosData[municipioNombre] || {
        nombre: municipioNombre,
        distancia_tiempo: 'N/A',
        consejos_seguridad: 'N/A',
        ruta_viaje: '#',
        link_turismo: '#'
    };

    // Construir contenido del modal con nuevo orden
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <h2>${municipio.nombre}</h2>
        
        <div class="info-section">
            <div class="info-label">📍 DESDE GUADALAJARA</div>
            <div class="info-value">${municipio.distancia_tiempo}</div>
        </div>

        <div class="info-section">
            <div class="info-label">🛡️ CONSEJOS DE SEGURIDAD</div>
            <div class="info-value">${municipio.consejos_seguridad}</div>
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
                <a href="${municipio.ruta_viaje}" target="_blank" rel="noopener noreferrer">${municipio.ruta_viaje}</a>
            </div>
        </div>

        <div class="info-section">
            <div class="info-label">🌍 LINK TURISMO</div>
            <div class="info-value">
                <a href="${municipio.link_turismo}" target="_blank" rel="noopener noreferrer">${municipio.link_turismo}</a>
            </div>
        </div>
    `;

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
