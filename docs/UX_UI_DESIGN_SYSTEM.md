# 🎨 Sistema de Diseño UX/UI y Auditoría de Accesibilidad (WCAG 2.2 AA)

> Construido siguiendo el flujo de trabajo y heurísticas de la skill **`frontend-ux-ui`**.

---

## 1. Definición del Problema UX (Framing)

* **Usuarios y Contexto:**
  1. **Dirección / Gerencia (Sofía Gonzalez Grenat):** Consulta el sistema en escritorio para analizar márgenes unitarios ($\text{\$/kg}$ y $\text{\$/lechón}$), filtrar por establecimiento (`Tandil`, `San Lorenzo`, `Porcap`) o etapa (`Maternidad`, `Recría`, `Engorde`) y comparar cierres mensuales.
  2. **Administración / Contabilidad:** Sube exportaciones Excel de Nuvix, audita discrepancias de stock durante el mes, exporta asientos contables y ejecuta el **Cierre Mensual**.
  3. **Jefes de Planta (SCADA) y Producción (Agriness):** Consultan controles operativos diarios/semanales (cuadratura de balanzas `Control kg == 0`, mermas de silos y conversión alimenticia).
* **Acción Primaria por Pantalla:**
  * *Torre de Control:* Filtrar/Agrupar (Roll-up / Drill-down) costos y abrir trazabilidad por fila.
  * *Ingesta Excel:* Subir o seleccionar un archivo `.xlsx`, validar el mapeo de columnas e integrarlo.
  * *Farmacia:* Conciliar diferencias e impactar el asiento contable en Nuvix con 1 clic.
  * *Contabilidad:* Verificar el checklist de pre-cierre y ejecutar el **Cierre Mensual**.

---

## 2. Tokens de Color y Verificación de Contraste WCAG 2.2 AA

Se aplicó la paleta institucional solicitada combinada con el verde forestal del isologo porcino SIPA, verificada mediante `scripts/contrast_check.py`:

| Token CSS | Rol Semántico | Hex | Contraste sobre `#EEE8DF` (Cream) | Contraste sobre `#FFFFFF` | Nivel WCAG |
|---|---|---|---|---|---|
| `--color-bg` | Lienzo principal (Cream) | `#EEE8DF` | — | — | Base |
| `--color-surface` | Paneles y cabeceras de tabla | `#F7F4EF` | — | — | Base |
| `--color-surface-raised` | Tarjetas elevadas y grillas | `#FFFFFF` | — | — | Base |
| `--color-border` | Divisores estructurales (Beige) | `#C4BCB0` | — | — | Decorativo |
| `--color-text` | Texto principal | `#182038` | **13.23 : 1** | **16.12 : 1** | **AAA** |
| `--color-primary` | Acción primaria (Deep Ocean) | `#2C365A` | **9.67 : 1** | **11.78 : 1** | **AAA** |
| `--color-accent` | Acento biológico (Forest Pig) | `#1E4D3B` | **7.91 : 1** | **9.63 : 1** | **AAA** |
| `--color-text-subtle` | Metadatos y subtítulos | `#444F6E` | **6.65 : 1** | **8.10 : 1** | **AA+** |

---

## 3. Reglas de Tablas, Gráficos y Estados Aplicadas

1. **Alineación y Tipografía Numérica:**
   * Todos los importes monetarios ($\text{ARS}$, $\text{USD}$), pesos ($\text{kg}$) y ratios ($\text{FCR}$) utilizan `font-variant-numeric: tabular-nums` y alineación a la derecha para que los separadores de miles y decimales coincidan verticalmente.
   * Formateo local `es-AR` (`$ 4.410.000`, `$ 183,75`, `2,75`).
2. **Señalización No Dependiente Solo del Color:**
   * Cada estado semántico (Sincronizado, Advertencia, Discrepancia, Cerrado) combina **color + ícono + etiqueta textual** (`✓ 0 kg (Exacto)`, `⚠ 2 discrepancias detectadas`).
3. **Teclado y Foco Visible:**
   * Enlace `Saltar al contenido principal` (`skip-link`) al inicio del DOM.
   * Anillo `:focus-visible` de `3px solid #1E4D3B` con `outline-offset: 2px`.
   * Respeto de `prefers-reduced-motion: reduce`.
