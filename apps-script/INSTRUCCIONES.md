# Instrucciones de despliegue — Evaluación SSOMA/QC
## Pintura & Andamios · Google Apps Script + Google Sheets

---

## PARTE 1: Configuración inicial del Apps Script

1. Abre el Google Sheet con el siguiente enlace directo:  
   [https://docs.google.com/spreadsheets/d/17Eb0AebdbtU15C-ckMNHQUCxpJ2sVIZoAiC1KK4Sx40](https://docs.google.com/spreadsheets/d/17Eb0AebdbtU15C-ckMNHQUCxpJ2sVIZoAiC1KK4Sx40)

2. En el menú superior, ve a **Extensiones > Apps Script**.  
   Se abrirá el editor de código en una pestaña nueva.

3. En el editor, borra todo el código existente en el archivo `Code.gs`  
   (selecciona todo con **Ctrl+A** y presiona **Supr**).

4. Abre el archivo `Codigo.gs` que se encuentra en esta carpeta y copia todo su contenido.  
   Pégalo en el editor de Apps Script.

5. Guarda el proyecto con **Ctrl+S**.  
   Cuando te pida un nombre, escribe: **Evaluacion SSOMA**

---

## PARTE 2: Inicializar las hojas de cálculo

1. En la barra superior del editor, despliega el selector de funciones  
   (muestra algo como `▶ miFuncion`).

2. Selecciona la función **`inicializarSheet`** en ese selector.

3. Haz clic en el botón **▶ Ejecutar**.

4. La primera vez pedirá **autorización de permisos**:
   - Haz clic en "Revisar permisos"
   - Selecciona tu cuenta de Google
   - Si aparece "Esta aplicación no está verificada", haz clic en "Avanzado" → "Ir a Evaluacion SSOMA (no seguro)"
   - Haz clic en "Permitir"

5. Vuelve al Google Sheet y verifica que se crearon **4 hojas**:
   - `Maestro_Personal` — con los 25 trabajadores cargados
   - `Evaluacion_Pintura` — con cabeceras (sin datos aún)
   - `Evaluacion_Andamios` — con cabeceras (sin datos aún)
   - `Resumen_Anual` — con los 25 trabajadores inicializados en cero

> ⚠️ Si alguna hoja ya existía con datos, la función **no borra ni duplica** los registros existentes.

---

## PARTE 3: Desplegar como Web App

1. En el editor de Apps Script, haz clic en **"Implementar"** (esquina superior derecha).

2. Selecciona **"Nueva implementación"**.

3. Haz clic en el ícono de engranaje ⚙️ junto a "Seleccionar tipo" y elige **"Aplicación web"**.

4. Rellena los campos:
   - **Descripción:** `Evaluacion SSOMA v1`
   - **Ejecutar como:** `Yo (tu-email@gmail.com)`
   - **Quién tiene acceso:** `Cualquier persona`

5. Haz clic en **"Implementar"**.

6. Autoriza los permisos nuevamente si se solicita (mismo proceso que en la Parte 2).

7. Al finalizar, aparecerá la **URL de la web app** con este formato:
   ```
   https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec
   ```

8. **Copia esa URL completa** — la necesitarás en la Parte 4.

> 💡 Guarda esta URL en un lugar seguro. Si vuelves a implementar, la URL nueva reemplaza a la anterior.

---

## PARTE 4: Conectar con la web app HTML

En el archivo `Index.html` de la web app (el que se sirve desde el Apps Script o el que usas como interfaz), busca la variable o constante donde está configurado el endpoint del backend. Generalmente se llama `APPS_SCRIPT_URL`.

Reemplaza el valor por la URL que copiaste en el paso anterior:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/TU_ID_AQUI/exec';
```

**Ejemplo completo en el HTML:**

```javascript
// Al inicio del bloque <script> en Index.html
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXX/exec';

// Ejemplo de envío de evaluación
async function enviarEvaluacion(payload) {
  const respuesta = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const resultado = await respuesta.json();
  return resultado;
}
```

> ⚠️ No agregues `mode: 'no-cors'` al fetch si necesitas leer la respuesta JSON.  
> `ContentService` en Apps Script ya maneja CORS automáticamente cuando el acceso es "Cualquier persona".

---

## PARTE 5: Probar la conexión

1. Abre la URL de la web app en el navegador para verificar que el `doGet` responde  
   (deberías ver el formulario HTML o la página de estado "API activa").

2. Desde la interfaz, completa una evaluación de prueba con cualquier trabajador.

3. Haz clic en "Guardar" / "Enviar evaluación".

4. Ve al Google Sheet y verifica:
   - En la hoja **`Evaluacion_Pintura`** o **`Evaluacion_Andamios`** apareció una nueva fila con el ID `EVP-...` o `EVA-...`
   - En la hoja **`Resumen_Anual`**, la fila del trabajador evaluado tiene los datos actualizados (Total_Evaluaciones ≥ 1, Promedio_Desempeno, Semáforo, etc.)

5. Si la respuesta del servidor es `{"success": false, "error": "..."}`, el mensaje de error te indicará qué salió mal.

---

## PARTE 6: Actualizar el código (cuando haya cambios)

Cada vez que modifiques el código en `Codigo.gs` y lo pegues en el editor, **debes crear una nueva versión de la implementación** para que los cambios tomen efecto en la URL pública.

**Método 1 — Nueva implementación (genera nueva URL):**
1. Clic en "Implementar" → "Nueva implementación"
2. Repite los pasos de la Parte 3
3. Actualiza la URL en el HTML

**Método 2 — Actualizar la implementación existente (mantiene la misma URL):**
1. Clic en "Implementar" → "Administrar implementaciones"
2. Junto a tu implementación activa, haz clic en el ícono de edición ✏️
3. En "Versión", selecciona **"Nueva versión"**
4. Haz clic en "Implementar"
5. La URL permanece igual, pero ahora ejecuta el código actualizado

> ✅ Recomendado: usa el **Método 2** para mantener siempre la misma URL en tu HTML.

---

## PARTE 7: Notas importantes

### CORS y modo de acceso
- Si la web app devuelve un error CORS (`Access-Control-Allow-Origin`), verifica que la configuración de **"Quién tiene acceso"** esté en **"Cualquier persona"** (no "Solo usuarios de la organización").
- `ContentService.createTextOutput(...).setMimeType(JSON)` en Apps Script ya incluye los headers CORS necesarios automáticamente.
- **No uses** `mode: 'no-cors'` en el `fetch` si necesitas leer la respuesta, porque en modo `no-cors` la respuesta es opaca y no puedes acceder al JSON.

### Nueva implementación obligatoria
- Cualquier cambio en el código `.gs` **no se refleja en la URL pública** hasta que crees una nueva versión de implementación.
- Puedes probar el código con "Ejecutar" en el editor, pero la web app pública sigue corriendo la versión anterior hasta que actualices.

### Seguridad de la URL
- La URL de la web app es pública. Cualquier persona con la URL puede enviar evaluaciones.
- Si necesitas restringir el acceso, cambia "Quién tiene acceso" a "Solo usuarios de mi organización" (requiere cuenta Google Workspace).

### Reglas de negocio implementadas
| Score del ítem | Clasificación |
|---|---|
| 0 | Cumple — no penaliza |
| 1 ó 2 | Falta leve |
| 3 | Sanción grave |

| Sanciones Graves | Semáforo | Acción Operativa |
|---|---|---|
| 0 ó 1 | 🟢 VERDE | Sin observaciones |
| 2 | 🟡 ÁMBAR | Seguimiento preventivo |
| ≥ 3 | 🔴 ROJO | Evaluación disciplinaria |

- **Porcentaje Pintura:** `max(0, (1 - sumaScores / 16)) × 100`
- **Porcentaje Andamios:** `max(0, (1 - sumaScores / 18)) × 100`
- **Récord Anual:** `max(0, 1 - (faltasLeves × 0.02) - (sancionesGraves / 3))`

### Estructura del JSON enviado al doPost
```json
{
  "area": "Pintura",
  "trabajadorId": "TRAB-001",
  "trabajadorNombre": "Pérez Gómez Juan",
  "trabajadorDni": "45123001",
  "fecha": "2026-10-22",
  "supervisor": "Nombre del Supervisor",
  "faltasLeves": 2,
  "sancionesGraves": 1,
  "items": [
    { "numero": 1, "descripcion": "Descripción del ítem", "score": 0, "observacion": "" },
    { "numero": 2, "descripcion": "Descripción del ítem", "score": 1, "observacion": "Detalle" }
  ],
  "porcentajeTecnico": 87.5
}
```

> ℹ️ El backend recalcula `faltasLeves`, `sancionesGraves` y `porcentajeTecnico` a partir de los `items` para garantizar consistencia, aunque también puedes enviarlos precalculados desde el frontend.
