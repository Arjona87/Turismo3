/*
 * Dashboard Turismo - Jalisco
 * Script principal para la gestión del mapa interactivo
 * Conecta en tiempo real a Google Sheets usando servicio proxy
 */

let map;
let geojsonLayer;
let municipiosData = {};
let pueblosMagicosMarkers = [];

// Google Sheets URL con servicio proxy
const GOOGLE_SHEETS_ID = '1x8jI4RYM6nvhydMfxBn68x7shxyEuf_KWNC0iDq8mzw';
const GOOGLE_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=csv&gid=0`;
const PROXY_URL = `https://api.allorigins.win/raw?url=${encodeURIComponent(GOOGLE_SHEETS_URL)}`;

const STYLES = {
    default: { color: '#666', weight: 2, opacity: 0.7, fillColor: '#d0d0d0', fillOpacity: 0.7 },
    hover: { color: '#2a5298', weight: 2.5, opacity: 1, fillColor: '#2a5298', fillOpacity: 0.3 },
    active: { color: '#1e3c72', weight: 3, opacity: 1, fillColor: '#2a5298', fillOpacity: 0.5 }
};

// ============================================
// INICIALIZACIÓN
// ============================================

function initMap() {
    map = L.map('map').setView([20.5, -103.5], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 7
    }).addTo(map);

    loadDataFromGoogleSheets();
    loadGeoJSON();
}

// ============================================
// CARGAR DATOS DESDE GOOGLE SHEETS
// ============================================

function loadDataFromGoogleSheets() {
    fetch(PROXY_URL)
        .then(response => response.text())
        .then(csvText => procesarDatosCSV(csvText))
        .catch(error => console.error('Error:', error));
}

function procesarDatosCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;

    const headerLine = lines[0];
    const headers = parseCSVRow(headerLine).map(h => h.trim().toLowerCase());

    const colIndices = {
        pueblo_magico: headers.indexOf('pueblo mágico'),
        latitud: headers.indexOf('latitud'),
        longitud: headers.indexOf('longitud'),
        consejos_seguridad: headers.indexOf('consejos de seguridad'),
        distancia_tiempo: headers.indexOf('distancia / tiempo'),
        ruta_viaje: headers.indexOf('ruta/viaje desde gdl'),
        link_turismo: headers.indexOf('link turismo')
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVRow(line);
        const puebloMagico = values[colIndices.pueblo_magico]?.trim() || '';
        const latitud = parseFloat(values[colIndices.latitud] || 0);
        const longitud = parseFloat(values[colIndices.longitud] || 0);

        if (puebloMagico && latitud && longitud) {
            municipiosData[puebloMagico] = {
                nombre: puebloMagico,
                lat: latitud,
                lng: longitud,
                consejos_seguridad: values[colIndices.consejos_seguridad]?.trim() || '',
                distancia_tiempo: values[colIndices.distancia_tiempo]?.trim() || '',
                ruta_viaje: values[colIndices.ruta_viaje]?.trim() || '',
                link_turismo: values[colIndices.link_turismo]?.trim() || ''
            };

            agregarMarcadorPuebloMagico(puebloMagico, latitud, longitud);
        }
    }
}

function parseCSVRow(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

// ============================================
// MARCADORES DE PUEBLOS MÁGICOS
// ============================================

function agregarMarcadorPuebloMagico(nombre, lat, lng) {
    const puebloMagicoIcon = L.icon({
        iconUrl: 'pueblo-magico-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
    });

    const marker = L.marker([lat, lng], {
        icon: puebloMagicoIcon,
        title: nombre,
        zIndexOffset: 1000
    }).addTo(map);

    marker.bindTooltip(nombre, {
        permanent: false,
        direction: 'top',
        className: 'pueblo-magico-tooltip'
    });

    marker.on('click', function() {
        showMunicipioInfo(nombre);
    });

    pueblosMagicosMarkers.push(marker);
}

// ============================================
// CARGAR GEOJSON
// ============================================

function loadGeoJSON() {
    fetch('jalisco_municipios.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJSON(data, {
                style: getFeatureStyle,
                onEachFeature: onEachFeature
            }).addTo(map);
        })
        .catch(error => console.error('Error cargando GeoJSON:', error));
}

function getFeatureStyle(feature) {
    return STYLES.default;
}

function onEachFeature(feature, layer) {
    const municipioName = feature.properties.NOMGEO;

    layer.on('mouseover', function() {
        this.setStyle(STYLES.hover);
        this.bindTooltip(municipioName, {
            permanent: false,
            direction: 'center',
            className: 'municipio-tooltip'
        }).openTooltip();
    });

    layer.on('mouseout', function() {
        this.setStyle(STYLES.default);
        this.closeTooltip();
    });

    layer.on('click', function() {
        showMunicipioInfo(municipioName);
    });
}

// ============================================
// MOSTRAR INFORMACIÓN
// ============================================

function showMunicipioInfo(municipioName) {
    const municipio = municipiosData[municipioName];
    if (!municipio) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>${municipio.nombre}</h2>
        
        <div class="info-section">
            <div class="info-label">📍 Distancia / Tiempo</div>
            <div class="info-value">${municipio.distancia_tiempo} DESDE GUADALAJARA</div>
        </div>

        <div class="info-section">
            <div class="info-label">🛡️ Consejos de Seguridad</div>
            <div class="info-value">${municipio.consejos_seguridad}</div>
        </div>

        <div class="info-section">
            <a href="tel:911" class="clicktocall-btn">
                <span class="clicktocall-icon">📞</span>
                LLAMAR AL 911
            </a>
        </div>

        <div class="info-section">
            <div class="info-label">🗺️ Ruta / Viaje desde GDL</div>
            <div class="info-value">
                <a href="${municipio.ruta_viaje}" target="_blank">${municipio.ruta_viaje}</a>
            </div>
        </div>

        <div class="info-section">
            <div class="info-label">🌍 Link Turismo</div>
            <div class="info-value">
                <a href="${municipio.link_turismo}" target="_blank">${municipio.link_turismo}</a>
            </div>
        </div>
    `;

    const modal = document.getElementById('infoModal');
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

// ============================================
// EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const modal = document.getElementById('infoModal');
    window.addEventListener('click', function(event) {
        if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') closeModal();
    });

    initMap();
});
