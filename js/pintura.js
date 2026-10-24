/* ============================================================
   pintura.js — Evaluación Personal de Pintura (16 ítems)
   ============================================================ */

const ITEMS_PINTURA_DEFAULT = [
  // 1. CALIDAD DEL PINTADO / RECUBRIMIENTO
  { numero:1,  descripcion:'Preparación de superficie (limpieza SSPC, remoción de contaminantes y perfil de anclaje adecuado)' },
  { numero:2,  descripcion:'Aplicación de capa base / Primer (espesor uniforme, control de película húmeda WFT y seca DFT)' },
  { numero:3,  descripcion:'Acabado final libre de defectos (sin chorreaduras, descuelgues, piel de naranja, burbujas o porosidades)' },
  { numero:4,  descripcion:'Reporte de tiempo de productividad y optimización de material (evitar desperdicios)' },
  { numero:5,  descripcion:'Control de condiciones ambientales (registro preventivo de temperatura de sustrato, humedad y punto de rocío)' },
  // 2. CUIDADO DE EQUIPOS DE PINTURA
  { numero:6,  descripcion:'Limpieza exhaustiva de equipos al finalizar (pistolas Airless, mangueras, boquillas y agitadores limpios sin residuos)' },
  { numero:7,  descripcion:'Uso correcto y presiones operativas (evitar sobrepresiones que dañen empaques o causen desgaste prematuro)' },
  { numero:8,  descripcion:'Almacenamiento y orden del set de pintura (enrollado correcto de mangueras, protección de boquillas y almacenamiento seguro)' },
  // 3. EPP Y SEGURIDAD / HIGIENE
  { numero:9,  descripcion:'Uso estricto del EPP específico (respirador de doble vía con cartuchos para vapores orgánicos, trajes Tyvek, guantes de nitrilo)' },
  { numero:10, descripcion:'Mantenimiento e higiene de sus EPP personales (limpieza del cuerpo del respirador, cambio oportuno de prefiltros saturados)' },
  { numero:11, descripcion:'Disposición final de residuos peligrosos (manejo correcto de latas vacías, trapos impregnados con solvente y huaipe)' },
  // 4. DOCUMENTACIÓN Y CHECKLISTS
  { numero:12, descripcion:'Verificación y lectura correcta del ATS / Permisos de Trabajo (descripción clara de riesgos específicos y medidas de control)' },
  { numero:13, descripcion:'Checklist diario de equipos completo (revisión de líneas de aire, manómetros, compresor, filtros de aire)' },
  // 5. INSPECCIONES DEL CLIENTE Y OTRAS ÁREAS
  { numero:14, descripcion:'Cero observaciones críticas en liberaciones (auditorías del inspector QC del cliente o de seguridad sin hallazgos negativos)' },
  { numero:15, descripcion:'Ausencia de reprocesos / No Conformidades por fallas operativas (doble material por mala aplicación)' },
  { numero:16, descripcion:'Actitud y respuesta ante observaciones en campo (corrección inmediata y proactiva de cualquier hallazgo reportado)' }
];

// Leer ítems desde localStorage (configuración) o usar defaults
const guardadosPintura = localStorage.getItem('items_pintura');
const ITEMS_PINTURA = guardadosPintura
  ? JSON.parse(guardadosPintura).map((d,i) => ({ numero: i+1, descripcion: d }))
  : ITEMS_PINTURA_DEFAULT;

const DIVISOR = 16;
let trabajadorActual = null;

function mostrarFormulario(mostrar) {
  ['datos-card','items-section','faltas-card','resultado-box','botones-accion']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = mostrar ? '' : 'none';
    });
}

function recalcular() {
  const scores = ITEMS_PINTURA.map(i => i.score || 1);
  const fgDia  = scores.filter(s => s === 3).length;
  const flDia  = scores.filter(s => s === 2).length;

  // Si hay falta grave → día cae a 0% directo
  let pct;
  if (fgDia > 0) {
    pct = 0;
  } else {
    const penalizaciones = scores.map(s => s === 1 ? 0 : 1);
    pct = EvalApp.calcPercentage(penalizaciones, DIVISOR);
  }

  const el = document.getElementById('resultado-valor');
  if (el) { el.textContent = `${pct.toFixed(2)}%`; EvalApp.applyResultColor(el, pct); }

  const elFaltas    = document.getElementById('faltas');
  const elSanciones = document.getElementById('sanciones');
  if (elFaltas)    elFaltas.value    = flDia;
  if (elSanciones) elSanciones.value = fgDia;
}

function limpiar() {
  trabajadorActual = null;
  mostrarFormulario(false);
  const inp = document.getElementById('dni-input');
  if (inp) inp.value = '';
  const res = document.getElementById('dni-resultado');
  if (res) { res.className = 'dni-resultado'; res.innerHTML = ''; }
  document.getElementById('supervisor') && (document.getElementById('supervisor').value = '');
  document.getElementById('faltas')    && (document.getElementById('faltas').value = '0');
  document.getElementById('sanciones') && (document.getElementById('sanciones').value = '0');
  EvalApp.setToday('fecha');
  ITEMS_PINTURA.forEach((item, idx) => {
    item.score = 1; item.observacion = '';
    const card = document.getElementById(`item-card-${idx}`);
    if (!card) return;
    card.querySelectorAll('.score-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.score)===1));
    EvalApp.updateItemBorder(card, 1);
    const obs = document.getElementById(`obs-${idx}`);
    if (obs) obs.value = '';
  });
  recalcular();
}

async function guardar() {
  const supervisor = (document.getElementById('supervisor')?.value || '').trim();
  const v = EvalApp.validate({ trabajador: trabajadorActual?.id, supervisor });
  if (!v.ok) { alert('⚠️ ' + v.msg); return; }

  const scores   = ITEMS_PINTURA.map(i => i.score || 1);
  const flDia    = scores.filter(s => s === 2).length;
  const fgDia    = scores.filter(s => s === 3).length;
  const pctDia   = fgDia > 0 ? 0 : parseFloat(EvalApp.calcPercentage(scores.map(s => s===1?0:1), DIVISOR).toFixed(2));

  const payload = {
    area:              'Pintura',
    trabajadorId:      trabajadorActual.id,
    trabajadorNombre:  trabajadorActual.nombre,
    trabajadorDni:     trabajadorActual.dni,
    fecha:             document.getElementById('fecha')?.value || '',
    supervisor,
    faltasLeves:       flDia,
    sancionesGraves:   fgDia,
    items:             ITEMS_PINTURA.map(i => ({...i})),
    porcentajeTecnico: pctDia
  };

  const btnGuardar = document.getElementById('btn-guardar');
  btnGuardar.textContent = '⏳ Guardando...';
  btnGuardar.disabled = true;

  const resultado = await EvalApp.enviarAlSheet(payload);

  btnGuardar.textContent = '💾 Guardar Evaluación';
  btnGuardar.disabled = false;

  if (resultado.success) {
    alert('✅ Evaluación guardada correctamente en Google Sheets.');
    limpiar();
  } else {
    alert('❌ Error al guardar: ' + (resultado.error || 'Error desconocido'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  EvalApp.renderPageHeader('app-header', {
    title: 'Evaluación de Desempeño Pintura',
    backHref: 'index.html'
  });

  mostrarFormulario(false);

  EvalApp.renderDniBusqueda('dni-section', (t) => {
    trabajadorActual = t;
    mostrarFormulario(!!t);
    if (t) {
      EvalApp.setToday('fecha');
      EvalApp.renderItemCards('items-container', ITEMS_PINTURA, recalcular);
      recalcular();
    }
  }, 'Pintura');

  document.getElementById('btn-guardar')?.addEventListener('click', guardar);
  document.getElementById('btn-limpiar')?.addEventListener('click', () => {
    if (confirm('¿Limpiar el formulario?')) limpiar();
  });
});
