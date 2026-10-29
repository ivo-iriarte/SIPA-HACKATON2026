---
name: sipa-domain-engine
description: >-
  Reglas de negocio, lógica zootécnica y contable del proyecto SIPA (Uniporc Tandil - Hackaton Agro 2026). Usar al implementar o auditar cálculos de costos, consolidaciones de granjas, conciliaciones entre Agriness, SCADA y Nuvix ERP, resolución de los 4 casos especiales del desafío y normalización de alias para ingesta de planillas Excel.
---

# 🐖 Skill: SIPA Domain Engine (Uniporc Tandil)

Esta skill contiene el conocimiento especializado del negocio porcino intensivo de **Uniporc Tandil**, los esquemas canónicos de datos y la implementación rigurosa de las **9 fórmulas de negocio** y los **4 casos especiales** del Desafío 07 del Hackaton Agro 2026.

---

## 1. Mapeo Canónico de Entidades y Claves Relacionales

Para unificar los 3 softwares no integrados (**Agriness/S4Farm**, **SCADA**, **Nuvix ERP**), SIPA utiliza 4 claves canónicas:

1. **`establishmentId` (Establecimiento):**
   * Canónicos: `tandil` | `san_lorenzo` | `porcap`
   * Alias en Agriness: `Granja A` (Tandil), `Granja B` (San Lorenzo), `Granja C` (Porcap)
   * Alias en SCADA: `Planta A` (Tandil), `Planta B` (San Lorenzo), `Planta C` (Porcap)
   * Alias en Nuvix: `Centro ficticio` / `Centro` (`Tandil`, `San Lorenzo`, `Porcap`)
2. **`stage` (Etapa Productiva):**
   * Canónicos: `Maternidad` (Sitio 1) | `Recría` (Sitio 2) | `Engorde` (Sitio 3)
   * Dietas SCADA: `Iniciador` (Sitio 2), `Crecimiento` / `Terminador` (Sitio 3)
3. **`productCode` (Código de Producto / Insumo):**
   * Sanidad / Farmacia: `P-001`, `P-002`, `P-003`...
   * Materias Primas Planta: `MP-01` (Maíz), `MP-02` (Harina de Soja), etc.
4. **`period` (Período Contable):**
   * Formato ISO: `YYYY-MM` (ej. `2026-09`)
   * Estados: `ABIERTO` (permite ingesta y controles continuos) | `CERRADO` (bloqueado para edición tras Cierre Mensual).

---

## 2. Las 9 Fórmulas de Negocio (Catálogo Formal)

Implementadas de forma pura en `src/services/sipaEngine.ts`:

1. **Costo Total por Centro / Etapa ($):**
   $$\text{Total \$} = \text{Alimento \$} + \text{Sanidad \$} + \text{Mano de Obra \$} + \text{Otros \$}$$
2. **Costo por Kg Producido (\$/kg) — KPI Rey:**
   $$\text{Costo por kg} = \frac{\text{Costo Total \$ (Nuvix + SCADA)}}{\text{Kg Producidos (Agriness)}}$$
   *Valores de control (Septiembre):* Tandil $\$183,75/\text{kg}$ | San Lorenzo $\$180,95/\text{kg}$ | Consolidado $\$182,44/\text{kg}$.
3. **Costo por Lechón Destetado (\$/lechón) — Pedido explícito de Sofía Gonzalez Grenat:**
   $$\text{Costo por lechón} = \frac{\text{Costos Directos Etapa Maternidad \$}}{\text{Lechones Destetados (S4Farm 09)}}$$
4. **Conversión Alimenticia Aparente (FCR):**
   $$\text{FCR} = \frac{\text{Kg Alimento Consumido (SCADA)}}{\text{Kg Producidos (Agriness)}}$$
   *Valores de control (Septiembre):* Tandil Recría $1,57$ | San Lorenzo Engorde $2,75$.
5. **Existencia Final de Hacienda (Cabezas):**
   $$\text{Stock Final} = \text{Iniciales} + \text{Entradas} - \text{Salidas (Ventas + Muertes)}$$
6. **Stock Teórico de Farmacia:**
   $$\text{Stock Teórico} = \text{Stock Inicial} + \text{Compras (Nuvix)} - \text{Consumos (Agriness)}$$
7. **Auditoría Dual de Discrepancias en Farmacia:**
   * $\text{Diferencia Criterio [04]} = \text{Stock Nuvix} - \text{Stock Teórico}$
   * $\text{Diferencia Criterio [05]} = \text{Stock Agriness} - \text{Stock Nuvix}$
8. **Control de Cuadratura de Tolvas SCADA:**
   $$\text{Control kg} = \text{Kg Fabricados} - \sum \text{Ingredientes kg} = 0$$
9. **Valorización Bimonetaria y Balance de Silos:**
   $$\text{Costo USD} = \frac{(\text{Kg} \times \text{Precio \$/kg}) + \text{Flete Asignado \$}}{\text{Tipo de Cambio (\$/USD)}}$$

---

## 3. Resolución de los 4 Casos Especiales del Desafío 07

1. **Caso A (Diferencia de Kilos 01 vs 03):** El archivo `01` totaliza las 3 etapas (`45.000 kg`), mientras que el `03` solo reporta una etapa por granja (`24.500 kg`). SIPA concilia esto mediante vistas por etapa y consolidado *Roll-up*.
2. **Caso B (Signos Invertidos Farmacia 04 vs 05):** Presentar ambas columnas comparativas en la UI para evitar errores de imputación contable en Nuvix.
3. **Caso C (Omisión de "Otros kg" en Archivo 08):** Brindar selector interactivo para comparar costo original del Excel 08 vs costo integral real (con núcleos vitamínicos).
4. **Caso D (Indicadores S4Farm 09):** Vincular la planilla `09` (420 madres, 1.190 destetados) para calcular automáticamente el costo por lechón.

