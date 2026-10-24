/* ============================================================
   config.js — Configuración interna: editar ítems
   ============================================================ */

// Ítems por defecto (se sobrescriben con localStorage si existen)
const ITEMS_DEFAULT = {
  pintura: [
    'Prep. Superficie (Limpieza SSPC y perfil de anclaje)',
    'Aplicación Capa Base / Primer (Espesor uniforme WFT/DFT)',
    'Acabado final libre de defectos (Sin chorreaduras/poros)',
    'Reporte de tiempo y optimización de material',
    'Control de condiciones ambientales (Humedad / Rocío)',
    'Limpieza exhaustiva de equipos (Airless / mangueras)',
    'Uso correcto y presiones operativas de equipos',
    'Almacenamiento y orden del set de pintura',
    'Uso estricto de EPP específico (Respirador doble vía/Tyvek)',
    'Mantenimiento e higiene de EPP personal',
    'Disposición final de residuos peligrosos',
    'Lectura y comprensión de ATS y Permisos de Trabajo',
    'Checklist diario de equipos completo',
    'Cero observaciones críticas en liberaciones QC',
    'Ausencia de reprocesos / No conformidades',
    'Actitud proactiva ante hallazgos en campo'
  ],
  andamios: [
    'Trabajo de Calidad en Armado (Nivelación/Arriostramiento)',
    'Cero retrabajos (armado en lugar indicado)',
    'Rendimiento y cumplimiento de cronograma seguro',
    'Dominio de modulación y capacidades de carga',
    'Instalación de componentes críticos (Plataformas/Rodapiés/Barandas)',
    'Inspección previa de componentes (Descarte de piezas corroídas)',
    'Uso correcto de accesorios de ajuste (Grapas y pines)',
    'Orden y desmovilización de materiales',
    'Uso de arnés y doble línea de vida en perfecto estado',
    'Puntos de anclaje certificados y seguros',
    'Uso correcto de casco con barbiquejo',
    'Uso obligatorio de guantes antigolpes',
    'Aseguramiento de herramientas (Portaherramientas y lanyards)',
    'Verificación y lectura de ATS real del frente',
    'Permiso de Trabajo en Altura firmado y vigente',
    'Verificación y llenado de formatos (5x5, caída de objetos)',
    'Cero observaciones de supervisión del cliente o auditorías',
    'Gestión proactiva ante hallazgos y corrección inmediata'
  ]
};

/* Obtener ítems guardados o usar los por defecto */
function getItems(area) {
  const guardados = localStorage.getItem(`items_${area}`);
  return guardados ? JSON.parse(guardados) : ITEMS_DEFAULT[area];
}

/* Renderizar filas de edición para un área */
function renderConfigItems(containerId, area) {
  const cont  = document.getElementById(containerId);
  const items = getItems(area);
  cont.innerHTML = items.map((desc, i) => `
    <div class="config-item-row">
      <div class="config-item-num">${i + 1}</div>
      <input
        class="config-item-input"
        id="${area}-item-${i}"
        type="text"
        value="${desc.replace(/"/g, '&quot;')}"
        placeholder="Descripción del ítem ${i + 1}">
    </div>`).join('');
}

/* Guardar ítems editados */
function guardarItems(area) {
  const items = getItems(area);
  const nuevos = items.map((_, i) => {
    const el = document.getElementById(`${area}-item-${i}`);
    return el ? el.value.trim() : '';
  }).filter(Boolean);

  if (nuevos.some(d => !d)) {
    alert('⚠️ Todos los ítems deben tener descripción.'); return;
  }

  localStorage.setItem(`items_${area}`, JSON.stringify(nuevos));
  alert(`✔ Ítems de ${area === 'pintura' ? 'Pintura' : 'Andamios'} guardados correctamente.\n\nLos formularios de evaluación usarán las nuevas descripciones.`);
  window.location.href = 'configuracion.html';
}

/* Renderizar secciones de especialidades dinámicas */
function renderConfigDinamicas() {
  const cont     = document.getElementById('config-dinamicas');
  const espList  = JSON.parse(localStorage.getItem('especialidades') || '[]');
  if (!espList.length) { cont.innerHTML = ''; return; }

  cont.innerHTML = espList.map((esp, espIdx) => `
    <div class="config-seccion">
      <div class="config-seccion-titulo">${esp.icono || '📋'} Ítems — ${esp.nombre}</div>
      <div class="card" style="padding:1rem 1.2rem;">
        <div id="config-items-esp-${espIdx}"></div>
        <div style="margin-top:0.75rem; display:flex; justify-content:flex-end;">
          <button class="btn-primary" onclick="guardarItemsEsp(${espIdx})">💾 Guardar ${esp.nombre}</button>
        </div>
      </div>
    </div>`).join('');

  espList.forEach((esp, espIdx) => {
    const cont2 = document.getElementById(`config-items-esp-${espIdx}`);
    if (!cont2) return;
    const items = JSON.parse(localStorage.getItem(`items_esp_${esp.nombre}`) || 'null') || esp.items;
    cont2.innerHTML = items.map((it, i) => `
      <div class="config-item-row">
        <div class="config-item-num">${i + 1}</div>
        <input
          class="config-item-input"
          id="esp-${espIdx}-item-${i}"
          type="text"
          value="${(it.descripcion || it).replace(/"/g, '&quot;')}"
          placeholder="Ítem ${i + 1}">
      </div>`).join('');
  });
}

function guardarItemsEsp(espIdx) {
  const espList = JSON.parse(localStorage.getItem('especialidades') || '[]');
  const esp     = espList[espIdx];
  if (!esp) return;

  const items = esp.items.map((_, i) => {
    const el = document.getElementById(`esp-${espIdx}-item-${i}`);
    return { numero: i + 1, descripcion: el ? el.value.trim() : '' };
  });

  if (items.some(it => !it.descripcion)) {
    alert('⚠️ Todos los ítems deben tener descripción.'); return;
  }

  localStorage.setItem(`items_esp_${esp.nombre}`, JSON.stringify(items));
  alert(`✔ Ítems de ${esp.nombre} guardados.`);
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  EvalApp.renderPageHeader('app-header', {
    title: 'Configuración — Editar Ítems',
    backHref: 'index.html'
  });

  renderConfigItems('config-items-pintura',  'pintura');
  renderConfigItems('config-items-andamios', 'andamios');
  renderConfigDinamicas();
});
