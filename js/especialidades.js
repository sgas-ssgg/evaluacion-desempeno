/* ============================================================
   especialidades.js — Gestión de especialidades dinámicas
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  EvalApp.renderPageHeader('app-header', {
    title: 'Agregar Especialidad',
    backHref: 'index.html'
  });

  const inputNum   = document.getElementById('esp-num-items');
  const secItems   = document.getElementById('items-dinamicos-section');
  const contItems  = document.getElementById('items-dinamicos-container');
  const tituloSec  = document.getElementById('items-titulo');

  // Generar campos de ítems al cambiar el número
  inputNum.addEventListener('input', () => {
    const n = parseInt(inputNum.value);
    if (!n || n < 1 || n > 30) {
      secItems.style.display = 'none';
      contItems.innerHTML = '';
      return;
    }

    const nombreEsp = document.getElementById('esp-nombre').value.trim() || 'Especialidad';
    tituloSec.textContent = `Definir ${n} Ítems — ${nombreEsp}`;
    secItems.style.display = '';
    contItems.innerHTML = '';

    for (let i = 1; i <= n; i++) {
      const div = document.createElement('div');
      div.className = 'item-dinamico';
      div.innerHTML = `
        <span class="item-num-badge">${i}</span>
        <input type="text" id="item-desc-${i}" placeholder="Descripción del ítem ${i}...">`;
      contItems.appendChild(div);
    }
  });

  // Actualizar título al escribir nombre
  document.getElementById('esp-nombre').addEventListener('input', () => {
    const n = parseInt(inputNum.value);
    if (n > 0) {
      tituloSec.textContent = `Definir ${n} Ítems — ${document.getElementById('esp-nombre').value.trim() || 'Especialidad'}`;
    }
  });

  // Guardar especialidad
  document.getElementById('btn-guardar-esp').addEventListener('click', () => {
    const nombre = document.getElementById('esp-nombre').value.trim();
    const icono  = document.getElementById('esp-icono').value.trim() || '📋';
    const n      = parseInt(inputNum.value);

    if (!nombre) { alert('⚠️ Ingrese el nombre de la especialidad.'); return; }
    if (!n || n < 1) { alert('⚠️ Ingrese el número de ítems.'); return; }

    const items = [];
    for (let i = 1; i <= n; i++) {
      const desc = (document.getElementById(`item-desc-${i}`)?.value || '').trim();
      if (!desc) { alert(`⚠️ Ingrese la descripción del ítem ${i}.`); return; }
      items.push({ numero: i, descripcion: desc });
    }

    // Verificar nombre duplicado
    const guardadas = JSON.parse(localStorage.getItem('especialidades') || '[]');
    if (guardadas.find(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
      alert('⚠️ Ya existe una especialidad con ese nombre.'); return;
    }

    guardadas.push({ nombre, icono, items, divisor: n });
    localStorage.setItem('especialidades', JSON.stringify(guardadas));

    alert(`✔ Especialidad "${nombre}" guardada con ${n} ítems.\n\nAparece en el menú principal.`);

    // Limpiar formulario
    document.getElementById('esp-nombre').value  = '';
    document.getElementById('esp-icono').value   = '';
    inputNum.value = '';
    secItems.style.display = 'none';
    contItems.innerHTML = '';

    renderListaEspecialidades();
  });

  // Renderizar lista de especialidades guardadas
  function renderListaEspecialidades() {
    const lista    = document.getElementById('esp-lista');
    const guardadas = JSON.parse(localStorage.getItem('especialidades') || '[]');

    if (!guardadas.length) {
      lista.innerHTML = '<div style="color:var(--texto-apagado);font-size:0.85rem;">No hay especialidades creadas aún.</div>';
      return;
    }

    lista.innerHTML = guardadas.map((esp, idx) => `
      <div class="esp-item">
        <span style="font-size:1.3rem;">${esp.icono}</span>
        <div class="esp-item-info">
          <div class="esp-item-nombre">${esp.nombre}</div>
          <div class="esp-item-meta">${esp.items.length} ítems</div>
        </div>
        <button class="btn-sm peligro" onclick="eliminarEspecialidad(${idx})">Eliminar</button>
      </div>`).join('');
  }

  renderListaEspecialidades();
});

function eliminarEspecialidad(idx) {
  if (!confirm('¿Eliminar esta especialidad?')) return;
  const guardadas = JSON.parse(localStorage.getItem('especialidades') || '[]');
  guardadas.splice(idx, 1);
  localStorage.setItem('especialidades', JSON.stringify(guardadas));
  location.reload();
}
