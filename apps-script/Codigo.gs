// ============================================================
// EVALUACIÓN SSOMA/QC — SERVICIOS GENERALES APTIM PISCO
// Google Apps Script — Codigo.gs
// ============================================================

const SHEET_ID = '17Eb0AebdbtU15C-ckMNHQUCxpJ2sVIZoAiC1KK4Sx40';

// ============================================================
// 1. doGet — responde consultas GET de la web app
// ============================================================
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'buscarDni') {
    var dni = (e.parameter.dni || '').toString().trim();
    var t   = buscarPorDni(dni);
    return ContentService
      .createTextOutput(JSON.stringify(t ? { success: true, trabajador: t } : { success: false }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.action === 'getTrabajadores') {
    var lista = getTrabajadores(e.parameter.especialidad || '');
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, trabajadores: lista }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutput(
    '<h2 style="font-family:sans-serif;color:#1a73e8;">✅ API Evaluación SSOMA activa</h2>'
  ).setTitle('API SSOMA');
}

// ============================================================
// 2. doPost — recibe evaluación o registro de trabajador
// ============================================================
function doPost(e) {
  try {
    var datos  = JSON.parse(e.postData.contents);
    var ss     = SpreadsheetApp.openById(SHEET_ID);
    var accion = (datos.accion || 'evaluacion').trim();

    // Registrar nuevo trabajador
    if (accion === 'registrarTrabajador') {
      var id   = _generarIdTrabajador(datos.especialidad, ss);
      var hoja = ss.getSheetByName('Maestro_Personal');
      hoja.appendRow([id, datos.dni, datos.nombre, datos.especialidad,
                      datos.estado || 'Activo',
                      new Date().toISOString().split('T')[0]]);
      // Crear fila en Resumen_Anual
      _inicializarFilaResumen(ss, id, datos.nombre, datos.especialidad);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Guardar evaluación
    var area = (datos.area || '').trim();
    if (area === 'Pintura') {
      guardarEvaluacionPintura(datos, ss);
    } else if (area === 'Andamios') {
      guardarEvaluacionAndamios(datos, ss);
    } else {
      guardarEvaluacionDinamica(datos, ss, area);
    }

    // Recalcular resumen anual del trabajador
    actualizarResumenAnual(datos.trabajadorId, ss);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, mensaje: 'Evaluación guardada' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 3. getTrabajadores — filtra por especialidad
// ============================================================
function getTrabajadores(especialidad) {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName('Maestro_Personal');
  if (!hoja) return [];
  var datos = hoja.getDataRange().getValues();
  var res   = [];
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    if (!f[0]) continue;
    var esp = (f[3] || '').toString().trim();
    if (especialidad && esp !== especialidad) continue;
    res.push({ id: f[0], dni: f[1], nombre: f[2], especialidad: esp, estado: f[4] });
  }
  return res;
}

// ============================================================
// 3b. buscarPorDni
// ============================================================
function buscarPorDni(dni) {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName('Maestro_Personal');
  if (!hoja) return null;
  var datos     = hoja.getDataRange().getValues();
  var dniBuscar = (dni || '').toString().trim();
  for (var i = 1; i < datos.length; i++) {
    var f = datos[i];
    if (!f[0] && !f[1]) continue;
    var dniHoja = (f[1] != null ? f[1] : '').toString().trim();
    if (dniHoja === dniBuscar) {
      return {
        id:           (f[0] != null ? f[0] : '').toString(),
        dni:          dniHoja,
        nombre:       (f[2] != null ? f[2] : '').toString(),
        especialidad: (f[3] != null ? f[3] : '').toString().trim(),
        estado:       (f[4] != null ? f[4] : '').toString()
      };
    }
  }
  return null;
}

// ============================================================
// 4. getEspecialidades
// ============================================================
function getEspecialidades() {
  return ['Pintura', 'Andamios'];
}

// ============================================================
// 5. inicializarSheet — crea hojas con cabeceras vacías
// ============================================================
function inicializarSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Maestro_Personal
  var hojaMP = ss.getSheetByName('Maestro_Personal') || ss.insertSheet('Maestro_Personal');
  _asegurarCabecera(hojaMP, ['ID_Trabajador','DNI','Apellidos_Nombres','Especialidad','Estado','Fecha_Ingreso']);

  // Evaluacion_Pintura
  var hojaEP = ss.getSheetByName('Evaluacion_Pintura') || ss.insertSheet('Evaluacion_Pintura');
  var cabEP  = ['ID_Evaluacion','Fecha','ID_Trabajador','Apellidos_Nombres','Especialidad','Supervisor'];
  for (var p = 1; p <= 16; p++) { cabEP.push('Item_P'+p); cabEP.push('Obs_P'+p); }
  cabEP.push('Porcentaje_Tecnico','Faltas_Leves_Dia','Sanciones_Graves_Dia');
  _asegurarCabecera(hojaEP, cabEP);

  // Evaluacion_Andamios
  var hojaEA = ss.getSheetByName('Evaluacion_Andamios') || ss.insertSheet('Evaluacion_Andamios');
  var cabEA  = ['ID_Evaluacion','Fecha','ID_Trabajador','Apellidos_Nombres','Especialidad','Supervisor'];
  for (var a = 1; a <= 18; a++) { cabEA.push('Item_A'+a); cabEA.push('Obs_A'+a); }
  cabEA.push('Porcentaje_Tecnico','Faltas_Leves_Dia','Sanciones_Graves_Dia');
  _asegurarCabecera(hojaEA, cabEA);

  // Resumen_Anual — con nuevas columnas
  var hojaRA = ss.getSheetByName('Resumen_Anual') || ss.insertSheet('Resumen_Anual');
  _asegurarCabecera(hojaRA, [
    'ID_Trabajador','Apellidos_Nombres','Especialidad',
    'Total_Evaluaciones','Promedio_Tecnico_Anual',
    'Acum_Faltas_Leves','Acum_Sanciones_Graves',
    'Amonestaciones','Sanciones',
    'Record_Anual','Semaforo','Accion_Operativa'
  ]);

  Logger.log('inicializarSheet completado — 4 hojas con cabeceras listas.');
}

// ============================================================
// 6. actualizarResumenAnual — recalcula UNA fila por trabajador
// ============================================================
function actualizarResumenAnual(trabajadorId, ss) {
  if (!ss) ss = SpreadsheetApp.openById(SHEET_ID);

  // Buscar datos del trabajador
  var hojaMP  = ss.getSheetByName('Maestro_Personal');
  var datosMP = hojaMP.getDataRange().getValues();
  var nombre  = '', especialidad = '';
  for (var i = 1; i < datosMP.length; i++) {
    if ((datosMP[i][0] || '').toString() === trabajadorId) {
      nombre       = (datosMP[i][2] || '').toString();
      especialidad = (datosMP[i][3] || '').toString().trim();
      break;
    }
  }
  if (!nombre) return;

  // Determinar hoja de evaluaciones según prefijo del ID
  var prefijo    = trabajadorId.split('-')[0].toUpperCase();
  var nombreHoja = prefijo === 'PIN' ? 'Evaluacion_Pintura'
                 : prefijo === 'AND' ? 'Evaluacion_Andamios'
                 : 'Evaluacion_' + prefijo;

  var hojaEval = ss.getSheetByName(nombreHoja);
  if (!hojaEval) return;

  var datosEval  = hojaEval.getDataRange().getValues();
  var totalCols  = datosEval[0].length;
  var colPct     = totalCols - 3; // Porcentaje_Tecnico
  var colFL      = totalCols - 2; // Faltas_Leves_Dia
  var colFG      = totalCols - 1; // Sanciones_Graves_Dia

  var totalEval   = 0;
  var sumaPct     = 0;
  var accumFL     = 0; // Faltas leves acumuladas en el año
  var accumFG     = 0; // Sanciones graves acumuladas en el año

  for (var j = 1; j < datosEval.length; j++) {
    if ((datosEval[j][2] || '').toString() !== trabajadorId) continue;
    totalEval++;
    sumaPct   += parseFloat(datosEval[j][colPct]) || 0;
    accumFL   += parseInt(datosEval[j][colFL])    || 0;
    accumFG   += parseInt(datosEval[j][colFG])    || 0;
  }

  var promedioTecnico = totalEval > 0 ? sumaPct / totalEval : 0;

  // ── CÁLCULO DEL RÉCORD ANUAL ──────────────────────────────
  // Amonestaciones: cada 3 FL acumuladas = 1 amonestación (-5%)
  // Sanciones por FL: cada 6 FL acumuladas = 1 sanción (-30%)
  // Sanciones graves: cada FG = 1 sanción (-30%)
  // La amonestación (3 FL) ya está incluida en la sanción (6 FL),
  // por eso el -5% solo aplica al primer bloque de 3 (no al segundo que es -30%)

  var amonestaciones = 0; // bloques de 3 FL que NO llegan a 6
  var sancionesFL    = Math.floor(accumFL / 6); // cada 6 FL = sanción
  var primerBloque   = Math.min(Math.floor(accumFL / 3), 1); // solo 1 amonestación posible antes de sanción

  // Si ya hay sanción por FL, la amonestación fue superada (no suma -5% extra)
  if (sancionesFL > 0) {
    amonestaciones = 0; // ya pasó a sanción, el -5% queda absorbido por el -30%
  } else {
    amonestaciones = primerBloque; // puede ser 0 o 1
  }

  var descuento = 0;
  descuento += amonestaciones * 5;   // -5% por amonestación
  descuento += sancionesFL   * 30;   // -30% por cada sanción reincidente FL
  descuento += accumFG       * 30;   // -30% por cada sanción grave

  var recordAnual = Math.max(0, 100 - descuento);

  // Total de sanciones = sanciones por FL reincidente + sanciones graves
  var totalSanciones = sancionesFL + accumFG;

  // ── SEMÁFORO ──────────────────────────────────────────────
  var semaforo, accion;
  if (totalSanciones >= 3) {
    semaforo = 'ROJO';
    accion   = 'Tarjeta Roja — Despido o seguimiento según gravedad';
  } else if (totalSanciones >= 1) {
    semaforo = 'ROJO';
    accion   = 'Sanción — Suspensión y reinducción obligatoria';
  } else if (amonestaciones >= 1) {
    semaforo = 'ÁMBAR';
    accion   = 'Amonestación escrita — Reinducción requerida';
  } else {
    semaforo = 'VERDE';
    accion   = 'Sin observaciones — Habilitado productivo';
  }

  // ── ACTUALIZAR FILA EN RESUMEN_ANUAL ─────────────────────
  var hojaRA  = ss.getSheetByName('Resumen_Anual');
  var datosRA = hojaRA.getDataRange().getValues();
  var filaIdx = -1;

  for (var k = 1; k < datosRA.length; k++) {
    if ((datosRA[k][0] || '').toString() === trabajadorId) {
      filaIdx = k + 1; break;
    }
  }

  var nuevaFila = [
    trabajadorId,
    nombre,
    especialidad,
    totalEval,
    parseFloat(promedioTecnico.toFixed(2)),
    accumFL,
    accumFG,
    amonestaciones,
    totalSanciones,
    parseFloat(recordAnual.toFixed(2)),
    semaforo,
    accion
  ];

  if (filaIdx > 0) {
    hojaRA.getRange(filaIdx, 1, 1, 12).setValues([nuevaFila]);
  } else {
    hojaRA.appendRow(nuevaFila);
    filaIdx = hojaRA.getLastRow();
  }

  // Aplicar color semáforo
  _aplicarColorSemaforo(hojaRA, filaIdx, semaforo);
}

// ============================================================
// 7. guardarEvaluacionPintura (16 ítems, score 1/2/3)
// ============================================================
function guardarEvaluacionPintura(datos, ss) {
  var hoja = ss.getSheetByName('Evaluacion_Pintura');
  if (!hoja) throw new Error('Hoja Evaluacion_Pintura no encontrada. Ejecute inicializarSheet.');

  var items  = datos.items || [];
  var idEval = 'EVP-' + new Date().getTime();
  var divisor = 16;

  var flDia = 0, fgDia = 0, sumaDesc = 0;
  for (var i = 0; i < items.length; i++) {
    var s = parseInt(items[i].score) || 1;
    if (s === 2) { flDia++; sumaDesc++; }
    if (s === 3) { fgDia++;             }
  }

  // Si hay falta grave el día cae a 0%
  var pctDia = fgDia > 0 ? 0 : Math.max(0, (1 - sumaDesc / divisor) * 100);

  var fila = [idEval, datos.fecha||'', datos.trabajadorId||'',
              datos.trabajadorNombre||'', 'Pintura', datos.supervisor||''];
  for (var p = 0; p < divisor; p++) {
    var item = items[p] || {};
    fila.push(parseInt(item.score) || 1);
    fila.push((item.observacion || '').toString());
  }
  fila.push(parseFloat(pctDia.toFixed(2)), flDia, fgDia);
  hoja.appendRow(fila);
}

// ============================================================
// 8. guardarEvaluacionAndamios (18 ítems, score 1/2/3)
// ============================================================
function guardarEvaluacionAndamios(datos, ss) {
  var hoja = ss.getSheetByName('Evaluacion_Andamios');
  if (!hoja) throw new Error('Hoja Evaluacion_Andamios no encontrada. Ejecute inicializarSheet.');

  var items   = datos.items || [];
  var idEval  = 'EVA-' + new Date().getTime();
  var divisor = 18;

  var flDia = 0, fgDia = 0, sumaDesc = 0;
  for (var i = 0; i < items.length; i++) {
    var s = parseInt(items[i].score) || 1;
    if (s === 2) { flDia++; sumaDesc++; }
    if (s === 3) { fgDia++;             }
  }

  var pctDia = fgDia > 0 ? 0 : Math.max(0, (1 - sumaDesc / divisor) * 100);

  var fila = [idEval, datos.fecha||'', datos.trabajadorId||'',
              datos.trabajadorNombre||'', 'Andamios', datos.supervisor||''];
  for (var a = 0; a < divisor; a++) {
    var item = items[a] || {};
    fila.push(parseInt(item.score) || 1);
    fila.push((item.observacion || '').toString());
  }
  fila.push(parseFloat(pctDia.toFixed(2)), flDia, fgDia);
  hoja.appendRow(fila);
}

// ============================================================
// 9. guardarEvaluacionDinamica — especialidades nuevas
// ============================================================
function guardarEvaluacionDinamica(datos, ss, area) {
  var prefijo    = _prefijoEspecialidad(area);
  var nombreHoja = 'Evaluacion_' + prefijo;
  var hoja       = ss.getSheetByName(nombreHoja);

  var items   = datos.items || [];
  var divisor = items.length || 1;

  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
    var cab = ['ID_Evaluacion','Fecha','ID_Trabajador','Apellidos_Nombres','Especialidad','Supervisor'];
    for (var c = 0; c < divisor; c++) { cab.push('Item_'+(c+1)); cab.push('Obs_'+(c+1)); }
    cab.push('Porcentaje_Tecnico','Faltas_Leves_Dia','Sanciones_Graves_Dia');
    _asegurarCabecera(hoja, cab);
  }

  var idEval  = prefijo + '-' + new Date().getTime();
  var flDia   = 0, fgDia = 0, sumaDesc = 0;
  for (var i = 0; i < items.length; i++) {
    var s = parseInt(items[i].score) || 1;
    if (s === 2) { flDia++; sumaDesc++; }
    if (s === 3) { fgDia++;             }
  }
  var pctDia = fgDia > 0 ? 0 : Math.max(0, (1 - sumaDesc / divisor) * 100);

  var fila = [idEval, datos.fecha||'', datos.trabajadorId||'',
              datos.trabajadorNombre||'', area, datos.supervisor||''];
  for (var p = 0; p < divisor; p++) {
    var it = items[p] || {};
    fila.push(parseInt(it.score) || 1);
    fila.push((it.observacion || '').toString());
  }
  fila.push(parseFloat(pctDia.toFixed(2)), flDia, fgDia);
  hoja.appendRow(fila);
}

// ============================================================
// 10. aplicarSemaforoTodo — refresca colores en todo el resumen
// ============================================================
function aplicarSemaforoTodo() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var hoja  = ss.getSheetByName('Resumen_Anual');
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < datos.length; i++) {
    var id  = (datos[i][0] || '').toString().trim();
    var sem = (datos[i][10] || '').toString().trim(); // columna 11 = Semaforo
    if (!id || !sem) continue;
    _aplicarColorSemaforo(hoja, i + 1, sem);
    count++;
  }
  Logger.log('Semáforo aplicado a ' + count + ' filas.');
}

// ============================================================
// 10b. recalcularTodosTrabajadores
// Ejecutar manualmente después de borrar evaluaciones en el Sheet
// Recalcula el resumen de TODOS los trabajadores desde cero
// ============================================================
function recalcularTodosTrabajadores() {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var hojaMP  = ss.getSheetByName('Maestro_Personal');
  if (!hojaMP) { Logger.log('Maestro_Personal no encontrada.'); return; }

  var datos = hojaMP.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < datos.length; i++) {
    var id = (datos[i][0] || '').toString().trim();
    if (!id) continue;
    actualizarResumenAnual(id, ss);
    count++;
  }
  Logger.log('Recalculados ' + count + ' trabajadores.');
  SpreadsheetApp.getUi().alert('✅ Récord anual recalculado para ' + count + ' trabajadores.');
}

// ============================================================
// 11. resetearAnual — resetea récord al inicio del año
// ============================================================
function resetearAnual() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var hoja  = ss.getSheetByName('Resumen_Anual');
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    var id = (datos[i][0] || '').toString().trim();
    if (!id) continue;
    // Resetear columnas numéricas: Total_Eval, Promedio, FL, FG, Amon, Sanc, Record, Semaforo, Accion
    hoja.getRange(i+1, 4, 1, 9).setValues([[0, 0, 0, 0, 0, 0, 100, 'VERDE', 'Sin observaciones — Habilitado productivo']]);
    _aplicarColorSemaforo(hoja, i+1, 'VERDE');
  }
  Logger.log('Reset anual completado.');
}

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

// Prefijo de especialidad: 1 palabra→3 letras, 2+→1ra letra + 3 de la 2da
function _prefijoEspecialidad(especialidad) {
  var palabras = especialidad.trim().split(/\s+/).filter(function(p){ return p.length > 0; });
  if (palabras.length === 1) return palabras[0].substring(0,3).toUpperCase();
  return (palabras[0][0] + palabras[1].substring(0,3)).toUpperCase();
}

// Generar ID nuevo para un trabajador
function _generarIdTrabajador(especialidad, ss) {
  var prefijo = _prefijoEspecialidad(especialidad);
  var hoja    = ss.getSheetByName('Maestro_Personal');
  if (!hoja) return prefijo + '-001';
  var datos = hoja.getDataRange().getValues();
  var max   = 0;
  for (var i = 1; i < datos.length; i++) {
    var id = (datos[i][0] || '').toString().trim();
    if (id.startsWith(prefijo + '-')) {
      var num = parseInt(id.replace(prefijo + '-', '')) || 0;
      if (num > max) max = num;
    }
  }
  return prefijo + '-' + String(max + 1).padStart(3, '0');
}

// Inicializar fila en Resumen_Anual para trabajador nuevo
function _inicializarFilaResumen(ss, id, nombre, especialidad) {
  var hoja = ss.getSheetByName('Resumen_Anual');
  if (!hoja) return;
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if ((datos[i][0]||'').toString() === id) return; // ya existe
  }
  hoja.appendRow([id, nombre, especialidad, 0, 0, 0, 0, 0, 0, 100, 'VERDE', 'Sin observaciones — Habilitado productivo']);
  _aplicarColorSemaforo(hoja, hoja.getLastRow(), 'VERDE');
}

// Aplicar color semáforo a una fila
function _aplicarColorSemaforo(hoja, filaIdx, semaforo) {
  if (!hoja || !filaIdx || filaIdx < 2) return;
  var colorFondo, colorTexto;
  if      (semaforo === 'ROJO')  { colorFondo = '#f4cccc'; colorTexto = '#990000'; }
  else if (semaforo === 'ÁMBAR') { colorFondo = '#fff2cc'; colorTexto = '#7d6608'; }
  else                           { colorFondo = '#d9ead3'; colorTexto = '#274e13'; }
  try {
    // Color en columna Semáforo (col 11) y Acción (col 12)
    hoja.getRange(filaIdx, 11, 1, 2).setBackground(colorFondo).setFontColor(colorTexto).setFontWeight('bold');
    // Borde izquierdo de toda la fila
    hoja.getRange(filaIdx, 1, 1, 12).setBorder(null, true, null, null, null, null, colorTexto, SpreadsheetApp.BorderStyle.SOLID_THICK);
  } catch(e) {
    Logger.log('_aplicarColorSemaforo error fila ' + filaIdx + ': ' + e.message);
  }
}

// Asegurar cabecera en fila 1
function _asegurarCabecera(hoja, cabecera) {
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(cabecera);
  } else {
    var primera = hoja.getRange(1, 1, 1, cabecera.length).getValues()[0];
    var igual   = cabecera.every(function(c, i){ return primera[i] === c; });
    if (!igual) { hoja.insertRowBefore(1); hoja.getRange(1,1,1,cabecera.length).setValues([cabecera]); }
  }
}
