# 📐 Manual de Fórmulas, Conciliaciones y Mapeo de Archivos Excel

## 1. Resolución de Casos Especiales de la Guía del Desafío 07

La guía oficial del Hackaton Agro 2026 plantea **4 desafíos de interpretación y conciliación** entre los archivos `00` al `09`. SIPA los resuelve explícitamente:

### Caso A: Diferencia de Kilos Producidos entre Archivo `01` (45.000 kg) y Archivo `03` (24.500 kg)
* **Observación:** En `01 - Informe de costos mensual`, Granja A produce `24.000 kg` y Granja B produce `21.000 kg` (Total = `45.000 kg`). Sin embargo, en `03 - Producción y consumos`, Granja A (Sitio 2) informa `10.500 kg` y Granja B (Sitio 3) informa `14.000 kg` (Total = `24.500 kg`).
* **Solución en SIPA:** El archivo `03` muestra únicamente **una etapa por granja** (Sitio 2 en Tandil y Sitio 3 en San Lorenzo), mientras que el archivo `01` muestra el **total acumulado de las 3 etapas** (Maternidad + Recría + Engorde) del establecimiento. En SIPA, al desglosar por etapa y permitir el *Roll-up* por establecimiento, ambos números quedan 100% conciliados.

### Caso B: Signos Opuestos en Diferencias de Farmacia entre Archivo `04` y Archivo `05`
* **Observación:** Para el `Producto sanitario A` en `Granja A (Tandil)`:
  * El archivo `04` calcula: $\text{Stock Nuvix (74)} - \text{Stock Teórico (75)} = -1$.
  * El archivo `05` calcula: $\text{Cantidad Agriness (75)} - \text{Cantidad Nuvix (74)} = +1$.
* **Solución en SIPA:** En la pestaña **5. Farmacia & Stock**, SIPA expone ambas columnas lado a lado (`Dif. [Nuvix - Teórico]` y `Dif. [Agriness - Nuvix]`) con alerta semántica, evitando que administración realice un ajuste de inventario con el signo invertido.

### Caso C: Omisión de "Otros kg" en la Hoja Valorización del Archivo `08`
* **Observación:** En `08 - Consumo de planta`, las dos fabricaciones suman `20.000 kg + 18.000 kg = 38.000 kg` (`24.000 kg Maíz` + `10.000 kg Harina de soja` + `4.000 kg Otros kg`). Sin embargo, la hoja `Valorizacion` solo multiplica Maíz y Soja, omitiendo el costo de los `4.000 kg` de `Otros kg` (núcleos vitamínicos y aminoácidos).
* **Solución en SIPA:** En la pestaña **4. Planta Alimento (SCADA)**, el usuario dispone de un interruptor interactivo para alternar entre el **"Modo Excel 08 Original (Solo Maíz + Soja)"** y el **"Costo Completo Real (Incluyendo Otros kg / Núcleos)"**, además de poder simular el tipo de cambio ($\text{ARS/USD}$) y el prorrateo de fletes.

### Caso D: Vinculación de Indicadores S4Farm (`09`) para el Costo por Lechón Destetado
* **Observación:** El PDF `09 - Agriness y S4Farm` reporta `420 madres activas`, `92 partos`, `1.380 nacidos vivos` y `1.190 destetados` sin especificar el cruce contable.
* **Solución en SIPA:** Se vinculan los indicadores de Maternidad de S4Farm con los costos directos de la etapa `Maternidad` (Alimento Lactancia + Sanidad Parto + Mano de Obra Maternidad), calculando en vivo el **Costo por Lechón Destetado ($\text{\$/lechón}$)** solicitado por Sofía.
