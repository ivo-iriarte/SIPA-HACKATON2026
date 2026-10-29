# 📖 Referencia Técnica: Fórmulas, Catálogos y Normalización de Alias

## 1. Tabla de Normalización de Encabezados (SheetJS)

Cuando un operador sube un archivo `.xlsx`, el motor heurístico de SIPA normaliza los encabezados de columnas mapeándolos a nombres de campo canónicos:

| Encabezado en Excel | Campo Canónico SIPA | Tipo de Dato | Observaciones |
|---|---|---|---|
| `Establecimiento`, `Granja`, `Centro ficticio`, `Centro`, `Planta` | `establishmentId` | string (`tandil`, `san_lorenzo`, `porcap`) | Se resuelve contra diccionario de alias |
| `Fase`, `Etapa`, `Etapa productiva`, `Sitio` | `stage` | string (`Maternidad`, `Recría`, `Engorde`) | Maternidad = Sitio 1, Recría = Sitio 2, Engorde = Sitio 3 |
| `Kilos producidos`, `Kg prod`, `Produccion kg` | `producedKg` | number (kg) | Dato biológico proveniente de pesadas Agriness |
| `Consumo alimento kg`, `Alimento kg`, `Kg consumidos` | `consumedFeedKg` | number (kg) | Dato SCADA / Agriness |
| `Costo alimento`, `Alimento $`, `Alimento ARS` | `feedCostArs` | number ($ ARS) | Costo valorizado de materia prima + flete |
| `Sanidad $`, `Sanidad ARS`, `Medicamentos` | `healthCostArs` | number ($ ARS) | Consumos valorizados de farmacia |
| `Mano de obra $`, `Mano de obra ARS`, `Sueldos` | `laborCostArs` | number ($ ARS) | Nuvix ERP imputado al centro de costo |
| `Otros $`, `Otros costos`, `Indirectos` | `otherCostArs` | number ($ ARS) | Gastos de estructura, energía, etc. |
| `Lechones destetados`, `Destetados`, `N° Destetados` | `weanedPiglets` | number (cabezas) | Indicador zootécnico clave de Sitio 1 |

## 2. Asientos Contables Modelo para Nuvix ERP (Partida Doble)

Cada vez que se concilia una diferencia de stock o se cierra el período:
1. **Diferencia de Inventario Farmacia (Faltante):**
   * **Debe:** Cuenta de Pérdida / Ajuste de Inventario Sanidad (`5.1.03.01`)
   * **Haber:** Activo / Stock Farmacia (`1.1.05.02`)
2. **Cierre de Costo de Alimento Balanceado Elaborado:**
   * **Debe:** Costo de Producción en Proceso — Alimentos (`5.1.01.01`)
   * **Haber:** Stock Materias Primas — Maíz / Soja (`1.1.05.01`)

