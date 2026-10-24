/* ============================================================
   app.js — Motor compartido EvalApp
   Servicios Generales — APTIM Pisco
   ============================================================ */

// URL del Apps Script (Google Sheets backend)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwA2sU032ZuoA_vxzQTJsEpfLDlazGcoz9i5mj3ueVRPvQqCUVcjVzOUclupAI6j6Ae/exec';

const EvalApp = (() => {

  /* ── Paleta de scores ─────────────────────────────────── */
  const SCORE_COLORS = {
    1: '#2e7d32',  // verde — cumple
    2: '#f57f17',  // ámbar — no cumple
    3: '#c62828'   // rojo  — falta grave
  };

  /* ── Generar prefijo de especialidad ─────────────────────
     1 palabra  → primeras 3 letras: Pintura→PIN, Andamios→AND
     2+ palabras → primeras 2 letras de cada palabra:
                   Lavado Industrial→LIND, Trabajos Verticales→TVER
  ─────────────────────────────────────────────────────────── */
  function prefijoEspecialidad(nombre) {
    const palabras = nombre.trim().split(/\s+/).filter(p => p.length > 0);
    if (palabras.length === 1) return palabras[0].substring(0, 3).toUpperCase();
    // 1 letra de la primera + 3 de la segunda
    return (palabras[0][0] + palabras[1].substring(0, 3)).toUpperCase();
  }
  /* ── Base local de trabajadores (fallback sin conexión) ─── */
  // Solo se usa si no hay internet. Los datos reales vienen del Sheet.
  const TRABAJADORES_BASE = [];

  /* Combina base + los guardados en localStorage */
  function getTrabajadores() {
    const extra = JSON.parse(localStorage.getItem('trabajadores_extra') || '[]');
    return [...TRABAJADORES_BASE, ...extra];
  }

  function guardarTrabajadorExtra(t) {
    const extra = JSON.parse(localStorage.getItem('trabajadores_extra') || '[]');
    const idx   = extra.findIndex(x => x.dni === t.dni);
    if (idx >= 0) extra[idx] = t; else extra.push(t);
    localStorage.setItem('trabajadores_extra', JSON.stringify(extra));
  }

  function eliminarTrabajador(dni) {
    const extra = JSON.parse(localStorage.getItem('trabajadores_extra') || '[]');
    localStorage.setItem('trabajadores_extra', JSON.stringify(extra.filter(x => x.dni !== dni)));
  }

  function buscarPorDni(dni) {
    return getTrabajadores().find(t => t.dni === dni.trim()) || null;
  }

  /* ── Cabecera de páginas internas ─────────────────────── */
  function renderPageHeader(containerId, { title, backHref }) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <header class="page-header">
        <img src="assets/logo.png" alt="Logo">
        <div class="page-header-info">
          <div class="page-header-titulo">${title}</div>
          <div class="page-header-sub">Servicios Generales — APTIM Pisco</div>
        </div>
        <a href="${backHref}" class="btn-volver">← Volver</a>
      </header>`;
  }

  /* ── Fecha de hoy ──────────────────────────────────────── */
  function setToday(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const h  = new Date();
    el.value = `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`;
  }

  /* ── Widget selector de trabajador (modo demo: dropdown) ── */
  // Búsqueda por DNI real desde Google Sheet
  function renderDniBusqueda(containerId, onSeleccionar, especialidadFiltro) {
    const cont = document.getElementById(containerId);
    if (!cont) return;

    cont.innerHTML = `
      <div class="card">
        <div class="field">
          <label for="dni-input">DNI del Trabajador</label>
          <div class="dni-wrap">
            <input type="text" id="dni-input" maxlength="8"
              placeholder="Ingrese 8 dígitos..."
              autocomplete="off" inputmode="numeric">
          </div>
        </div>
        <div class="dni-resultado" id="dni-resultado"></div>
      </div>`;

    const input     = document.getElementById('dni-input');
    const resultado = document.getElementById('dni-resultado');

    input.addEventListener('input', () => {
      const val = input.value.replace(/\D/g, '');
      input.value = val;

      if (val.length < 8) {
        resultado.className = 'dni-resultado';
        resultado.innerHTML = '';
        onSeleccionar(null);
        return;
      }

      resultado.className = 'dni-resultado visible';
      resultado.innerHTML = '<span style="color:var(--texto-suave);font-size:0.82rem;">🔍 Buscando...</span>';

      // Consultar Sheet vía Apps Script
      fetch(`${APPS_SCRIPT_URL}?action=buscarDni&dni=${val}`)
        .then(r => r.json())
        .then(data => {
          if (!data.success || !data.trabajador) {
            resultado.className = 'dni-resultado visible no-encontrado';
            resultado.innerHTML = `
              <div style="color:#c62828;font-size:0.85rem;margin-bottom:0.6rem;">
                DNI <strong>${val}</strong> no encontrado en el sistema.
              </div>
              <button class="btn-sm" onclick="EvalApp._abrirModalNuevo('${val}')">+ Registrar trabajador</button>`;
            onSeleccionar(null);
            return;
          }
          const t = data.trabajador;

          // Detectar especialidad por prefijo del ID usando regla de iniciales
          if (especialidadFiltro) {
            const prefFiltro = prefijoEspecialidad(especialidadFiltro);
            const prefID     = (t.id || '').split('-')[0].toUpperCase();
            if (prefID !== prefFiltro) {
              resultado.className = 'dni-resultado visible no-encontrado';
              resultado.innerHTML = `
                <div style="color:#e64a19;font-size:0.85rem;">
                  ⚠️ <strong>${t.nombre}</strong> (${t.id}) no pertenece a esta área.<br>
                  Usa el formulario correspondiente a <strong>${prefID}</strong>.
                </div>`;
              onSeleccionar(null);
              return;
            }
          }

          const iniciales = t.nombre.split(',')[0].trim().substring(0,2).toUpperCase();
          resultado.className = 'dni-resultado visible encontrado';
          resultado.innerHTML = `
            <div class="trabajador-card">
              <div class="trabajador-avatar">${iniciales}</div>
              <div class="trabajador-info">
                <div class="trabajador-nombre">${t.nombre}</div>
                <div class="trabajador-meta">${t.id} &nbsp;·&nbsp; ${t.especialidad} &nbsp;·&nbsp; ${t.estado}</div>
              </div>
            </div>`;
          onSeleccionar(t);
        })
        .catch(() => {
          // Fallback local si no hay conexión
          const tLocal = buscarPorDni(val);
          if (tLocal) {
            const iniciales = tLocal.nombre.split(',')[0].trim().substring(0,2).toUpperCase();
            resultado.className = 'dni-resultado visible encontrado';
            resultado.innerHTML = `
              <div class="trabajador-card">
                <div class="trabajador-avatar">${iniciales}</div>
                <div class="trabajador-info">
                  <div class="trabajador-nombre">${tLocal.nombre}</div>
                  <div class="trabajador-meta">${tLocal.id} · ${tLocal.especialidad} <span style="color:#e64a19;font-size:0.68rem;">(sin conexión)</span></div>
                </div>
              </div>`;
            onSeleccionar(tLocal);
          } else {
            resultado.className = 'dni-resultado visible no-encontrado';
            resultado.innerHTML = '<div style="color:#c62828;font-size:0.82rem;">❌ Sin conexión. Verifique su internet.</div>';
            onSeleccionar(null);
          }
        });
    });
  }

  /* ── Modal trabajador (nuevo / editar) ─────────────────── */
  function _renderModal(trabajador, esDni) {
    // Eliminar modal anterior si existe
    const anterior = document.getElementById('modal-trabajador');
    if (anterior) anterior.remove();

    const esNuevo = !trabajador.nombre;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-trabajador';

    const espOptions = ['Pintura','Andamio'].map(e =>
      `<option value="${e}" ${trabajador.especialidad === e ? 'selected' : ''}>${e}</option>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-titulo">${esNuevo ? 'Registrar Nuevo Trabajador' : 'Editar Trabajador'}</div>
        <div class="modal-campos">
          <div class="field">
            <label>DNI</label>
            <input type="text" id="m-dni" maxlength="8" value="${trabajador.dni || ''}" ${!esNuevo ? 'readonly' : ''}>
          </div>
          <div class="field">
            <label>Apellidos y Nombres</label>
            <input type="text" id="m-nombre" placeholder="Apellidos, Nombres" value="${trabajador.nombre || ''}">
          </div>
          <div class="field">
            <label>Especialidad</label>
            <select id="m-especialidad"><option value="">Seleccione...</option>${espOptions}</select>
          </div>
          <div class="field">
            <label>Estado</label>
            <select id="m-estado">
              <option value="Activo" ${trabajador.estado !== 'Inactivo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${trabajador.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>
        <div class="modal-botones">
          ${!esNuevo ? `<button class="btn-sm peligro" onclick="EvalApp._eliminarDesdeModal('${trabajador.dni}')">Eliminar</button>` : ''}
          <button class="btn-secondary" onclick="EvalApp._cerrarModal()">Cancelar</button>
          <button class="btn-primary" onclick="EvalApp._guardarModal()">Guardar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('visible'), 10);
  }

  function _abrirModalNuevo(dni) {
    _renderModal({ dni, nombre:'', especialidad:'', estado:'Activo' }, true);
  }

  function _abrirModalEditar(dni) {
    const t = buscarPorDni(dni);
    if (t) _renderModal(t, false);
  }

  function _cerrarModal() {
    const m = document.getElementById('modal-trabajador');
    if (!m) return;
    m.classList.remove('visible');
    setTimeout(() => m.remove(), 200);
  }

  function _guardarModal() {
    const dni        = (document.getElementById('m-dni')?.value || '').trim();
    const nombre     = (document.getElementById('m-nombre')?.value || '').trim();
    const especialidad = document.getElementById('m-especialidad')?.value || '';
    const estado     = document.getElementById('m-estado')?.value || 'Activo';

    if (!dni || dni.length !== 8) { alert('El DNI debe tener 8 dígitos.'); return; }
    if (!nombre)                  { alert('Ingrese el nombre del trabajador.'); return; }
    if (!especialidad)            { alert('Seleccione la especialidad.'); return; }

    // Generar ID si es nuevo
    const todos = getTrabajadores();
    let id = todos.find(t => t.dni === dni)?.id;
    if (!id) {
      const nums = todos.map(t => parseInt(t.id.replace('TRAB-',''))).filter(n => !isNaN(n));
      const max  = nums.length ? Math.max(...nums) : 0;
      id = `TRAB-${String(max + 1).padStart(3,'0')}`;
    }

    guardarTrabajadorExtra({ dni, id, nombre, especialidad, estado });
    _cerrarModal();

    // Refrescar búsqueda si el campo DNI está en pantalla
    const inp = document.getElementById('dni-input');
    if (inp && inp.value === dni) {
      inp.dispatchEvent(new Event('input'));
    }
  }

  function _eliminarDesdeModal(dni) {
    if (!confirm('¿Eliminar este trabajador?')) return;
    eliminarTrabajador(dni);
    _cerrarModal();
    const inp = document.getElementById('dni-input');
    if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
  }

  /* ── Renderizar ítems ──────────────────────────────────── */
  function renderItemCards(containerId, items, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return items;

    items.forEach(item => { item.score = 1; item.observacion = ''; });
    container.innerHTML = '';

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.id = `item-card-${idx}`;
      card.style.borderLeftColor = SCORE_COLORS[1];

      const btnsHTML = [1,2,3].map(s =>
        `<button type="button" class="score-btn${s===1?' selected':''}" data-score="${s}" data-idx="${idx}"
          title="${['','Cumple','No Cumple','Falta Grave'][s]}">${['','✔ Cumple','✘ No Cumple','⚠ Falta Grave'][s]}</button>`
      ).join('');

      card.innerHTML = `
        <div class="item-header">
          <span class="item-numero">${item.numero}</span>
          <span class="item-descripcion">${item.descripcion}</span>
        </div>
        <div class="score-group">${btnsHTML}</div>
        <label class="obs-label" for="obs-${idx}">Observación:</label>
        <textarea class="item-obs" id="obs-${idx}" data-idx="${idx}"
          placeholder="Escriba la observación de este ítem..." rows="2"></textarea>`;

      container.appendChild(card);

      card.querySelectorAll('.score-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const s = parseInt(btn.dataset.score);
          items[idx].score = s;
          card.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          updateItemBorder(card, s);
          onChange();
        });
      });

      document.getElementById(`obs-${idx}`).addEventListener('input', e => {
        items[idx].observacion = e.target.value;
      });
    });

    return items;
  }

  function updateItemBorder(cardEl, score) {
    cardEl.style.borderLeftColor = SCORE_COLORS[score] || SCORE_COLORS[1];
  }

  /* ── Cálculo % técnico ─────────────────────────────────── */
  function calcPercentage(scores, divisor) {
    const suma = scores.reduce((a,s) => a+s, 0);
    return Math.round(Math.max(0, 1 - suma/divisor) * 10000) / 100;
  }

  function applyResultColor(el, pct) {
    el.classList.remove('res-green','res-amber','res-red');
    if      (pct > 80)  el.classList.add('res-green');
    else if (pct >= 60) el.classList.add('res-amber');
    else                el.classList.add('res-red');
  }

  /* ── Validación ────────────────────────────────────────── */
  function validate({ trabajador, supervisor }) {
    if (!trabajador) return { ok:false, msg:'Seleccione un trabajador mediante su DNI.' };
    if (!supervisor || !supervisor.trim()) return { ok:false, msg:'Ingrese el nombre del supervisor evaluador.' };
    return { ok:true, msg:'' };
  }

  /* ── Formatear alerta de confirmación ──────────────────── */
  function formatAlert(data) {
    const L = '─'.repeat(44);
    let t = `\n${L}\n  EVALUACIÓN — ${data.area.toUpperCase()}\n${L}\n`;
    t += `  Trabajador : ${data.trabajadorId} — ${data.trabajadorNombre}\n`;
    t += `  DNI        : ${data.trabajadorDni || '—'}\n`;
    t += `  Fecha      : ${data.fecha}\n`;
    t += `  Supervisor : ${data.supervisor}\n`;
    t += `  Faltas Leves   : ${data.faltasLeves}\n`;
    t += `  Sanciones Grav.: ${data.sancionesGraves}\n`;
    t += `${L}\n  % TÉCNICO DEL DÍA: ${data.porcentajeTecnico.toFixed(2)}%\n${L}\n`;
    t += `  DETALLE ÍTEMS:\n`;
    data.items.forEach(it => {
      t += `\n  Ítem ${it.numero}: [${it.score}] ${it.descripcion}`;
      if (it.observacion?.trim()) t += `\n    → ${it.observacion.trim()}`;
      t += '\n';
    });
    t += `\n${L}\n  ✔ Listo para guardar en Google Sheets\n${L}\n`;
    return t;
  }

  /* ── Enviar evaluación al Google Sheet ─────────────────── */
  async function enviarAlSheet(payload) {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const resultado = await resp.json();
      return resultado;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /* ── API pública ────────────────────────────────────────── */
  return {
    SCORE_COLORS,
    renderPageHeader,
    setToday,
    renderDniBusqueda,
    renderItemCards,
    updateItemBorder,
    calcPercentage,
    applyResultColor,
    validate,
    formatAlert,
    enviarAlSheet,
    getTrabajadores,
    buscarPorDni,
    prefijoEspecialidad,
    // Exponer para llamadas desde HTML inline
    _abrirModalNuevo,
    _abrirModalEditar,
    _cerrarModal,
    _guardarModal,
    _eliminarDesdeModal
  };

})();
