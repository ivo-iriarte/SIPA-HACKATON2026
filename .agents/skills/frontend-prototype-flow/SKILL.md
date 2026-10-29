---
name: frontend-prototype-flow
description: >-
  Flujo de demostración, orquestación de datos simulados y recorrido interactivo para el prototipo frontend de SIPA. Usar al preparar demos ejecutivas, simular ingesta de archivos Excel, configurar escenarios de prueba para el jurado y validar la experiencia de usuario extremo a extremo en React y Vite.
---

# 🚀 Skill: Frontend Prototype Flow & Demo Orchestration

Esta skill guía la construcción, refinamiento y presentación del prototipo frontend interactivo de **SIPA**, permitiendo validar todas las historias de usuario del Hackaton Agro 2026 frente al jurado y los referentes de Uniporc Tandil sin requerir una base de datos activa en esta primera fase.

---

## 1. Arquitectura de Estado en Memoria y Simulación

En una primera instancia de prototipo:
* **Seed de Datos (`src/data/initialUniporcData.ts`):** Proporciona los registros base idénticos a las planillas reales del desafío (`00` al `09`), cubriendo los tres establecimientos (`Tandil`, `San Lorenzo`, `Porcap`).
* **Estado React en el Shell (`src/App.tsx`):**
  * Controla el período activo (`2026-09`, `2026-08`, etc.) y su estado (`ABIERTO` / `CERRADO`).
  * Almacena registros actualizables de costos por etapa, inventario de farmacia, molienda SCADA y logs de ingesta.
* **Reactividad Pura:** Cualquier cambio en una vista (ej. impactar un asiento de farmacia o cambiar filtros) se propaga instantáneamente a la Torre de Control mediante funciones puras de `sipaEngine.ts`.

---

## 2. Flujo de Demostración para el Jurado (Walkthrough de 5 Pasos)

Para demostrar el valor de SIPA de manera contundente durante una presentación:

1. **Paso 1: Torre de Control Gerencial (Visión Sofía Gonzalez Grenat)**
   * Mostrar el KPI central: **Costo por kg producido ($ 182,44)** y **Costo por lechón destetado ($ 840,34)**.
   * Alternar el filtro de establecimiento entre *Consolidado*, *Tandil* y *San Lorenzo*.
   * Abrir el Drawer de desglose de costos por etapa para mostrar la trazabilidad de cada centavo.
2. **Paso 2: Ingesta en Vivo de Archivos Excel (`SheetJS`)**
   * Navegar a la pestaña **2. Ingesta & Mapeo**.
   * Seleccionar o arrastrar uno de los 9 archivos `.xlsx` oficiales (o usar el selector de carga rápida precargado).
   * Visualizar la tabla de previsualización, la correspondencia de columnas canónicas y la detección de duplicados.
3. **Paso 3: Detección Operativa en Planta SCADA (Cuadratura de Balanzas)**
   * Navegar a **4. Planta Alimento (SCADA)**.
   * Mostrar la cuadratura física de la tolva (`Control kg = 0`).
   * Activar el interruptor **"Modo Real con Núcleos/Otros kg"** para evidenciar la resolución de la discrepancia del archivo `08`.
4. **Paso 4: Auditoría Dual y Resolución de Conflicto en Farmacia**
   * Navegar a **5. Farmacia & Stock**.
   * Explicar el conflicto de signos entre `04` y `05` resuelto con las dos columnas de auditoría.
   * Hacer clic en **"Generar Asiento de Ajuste en Nuvix"** y mostrar cómo se crea el asiento contable en borrador.
5. **Paso 5: Contabilidad y Cierre Mensual Seguro**
   * Navegar a **6. Contabilidad & Cierre**.
   * Repasar el checklist de pre-cierre durante el mes.
   * Ejecutar la acción **"Ejecutar Cierre Mensual"**, observar cómo el período cambia de `ABIERTO` a `CERRADO` (bloqueando ediciones) y exportar el libro contable a CSV.

