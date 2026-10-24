/* ============================================================
   andamios.js — Evaluación Personal de Andamios (18 ítems)
   ============================================================ */

const ITEMS_ANDAMIOS_DEFAULT = [
  // 1. CALIDAD EN EL ARMADO Y EFICIENCIA
  { numero:1,  descripcion:'Trabajo de Calidad en el Armado (nivelación y arriostramiento estructural)' },
  { numero:2,  descripcion:'Retrabajos (arma en lugares distintos al indicado en planos / órdenes de trabajo)' },
  { numero:3,  descripcion:'Rendimiento y Tiempos (evita demora innecesaria en el armado, cumple cronograma seguro)' },
  { numero:4,  descripcion:'Conocimiento del Trabajo (domina modulación, capacidades de carga y tipos de andamio)' },
  { numero:5,  descripcion:'Instalación de Componentes Críticos (plataformas completas, rodapiés y barandas)' },
  // 2. CUIDADO DE LOS EQUIPOS Y MATERIALES
  { numero:6,  descripcion:'Inspección Previa de Componentes (inspeccionar y descartar piezas corroídas o deformadas)' },
  { numero:7,  descripcion:'Uso Correcto de Accesorios de Ajuste (grapas, pines de seguridad)' },
  { numero:8,  descripcion:'Orden y Desmovilización (acopio ordenado por tipo de pieza, evita golpes y pérdidas)' },
  // 3. EPP, SEGURIDAD E HIGIENE
  { numero:9,  descripcion:'Arnés y Doble Línea de Vida (uso obligatorio, inspeccionado y en perfecto estado)' },
  { numero:10, descripcion:'Puntos de Anclaje Certificados (enganche a estructuras certificadas o líneas de vida)' },
  { numero:11, descripcion:'Casco con Barbiquejo (ajustado correctamente en todo momento)' },
  { numero:12, descripcion:'Guantes Anti Golpes (uso obligatorio, inspeccionado y en perfecto estado)' },
  { numero:13, descripcion:'Aseguramiento de Herramientas (uso de portaherramientas y lanyards anticaídas)' },
  // 4. DOCUMENTACIÓN Y GESTIÓN DE RIESGOS
  { numero:14, descripcion:'Verificación y lectura de ATS (Análisis de Trabajo Seguro descriptivo y real del frente)' },
  { numero:15, descripcion:'Permiso de Trabajo en Altura (firmado, vigente y con personal autorizado)' },
  { numero:16, descripcion:'Verificación y llenado de formatos (caída de objetos, herramientas, ATS de manos, 5x5)' },
  // 5. INSPECCIONES POR EL CLIENTE Y REPROCESOS
  { numero:17, descripcion:'Cero Observaciones de la Supervisión del Cliente o Auditorías Internas' },
  { numero:18, descripcion:'Gestión y Respuesta ante Hallazgos (actitud proactiva ante la corrección de fallas)' }
];

// Leer desde localStorage (configuración) o usar defaults
const guardadosAndamios = localStorage.getItem('items_andamios');
const ITEMS_ANDAMIOS = guardadosAndamios
  ? JSON.parse(guardadosAndamios).map((d,i) => ({ numero: i+1, descripcion: d }))
  : ITEMS_ANDAMIOS_DEFAULT;

const DIVISOR = 18;
let trabajadorActual = null;

function mostrarFormulario(mostrar) {
  ['datos-card','items-section','faltas-card','resultado-box','botones-accion']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = mostrar ? '' : 'none';
    });
}

function recalcular() {
  const scores = ITEMS_ANDAMIOS.map(i => i.score || 1);
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
  ITEMS_ANDAMIOS.forEach((item, idx) => {
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

  const scores   = ITEMS_ANDAMIOS.map(i => i.score || 1);
  const flDia    = scores.filter(s => s === 2).length;
  const fgDia    = scores.filter(s => s === 3).length;
  const pctDia   = fgDia > 0 ? 0 : parseFloat(EvalApp.calcPercentage(scores.map(s => s===1?0:1), DIVISOR).toFixed(2));

  const payload = {
    area:              'Andamios',
    trabajadorId:      trabajadorActual.id,
    trabajadorNombre:  trabajadorActual.nombre,
    trabajadorDni:     trabajadorActual.dni,
    fecha:             document.getElementById('fecha')?.value || '',
    supervisor,
    faltasLeves:       flDia,
    sancionesGraves:   fgDia,
    items:             ITEMS_ANDAMIOS.map(i => ({...i})),
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
    title: 'Evaluación de Desempeño Andamios',
    backHref: 'index.html'
  });

  mostrarFormulario(false);

  EvalApp.renderDniBusqueda('dni-section', (t) => {
    trabajadorActual = t;
    mostrarFormulario(!!t);
    if (t) {
      EvalApp.setToday('fecha');
      EvalApp.renderItemCards('items-container', ITEMS_ANDAMIOS, recalcular);
      recalcular();
    }
  }, 'Andamio');

  document.getElementById('btn-guardar')?.addEventListener('click', guardar);
  document.getElementById('btn-limpiar')?.addEventListener('click', () => {
    if (confirm('¿Limpiar el formulario?')) limpiar();
  });
});
