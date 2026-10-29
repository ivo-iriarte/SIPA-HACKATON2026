---
name: frontend-ux-ui
description: >-
  Guía y estándares de diseño UX/UI, accesibilidad WCAG 2.2 AA y componentes para el prototipo frontend de SIPA (React, Tailwind CSS, Radix UI, Lucide). Usar al diseñar, implementar, refactorizar o auditar interfaces de usuario, tablas de datos densos, alineación numérica tabular, tokens de diseño institucional (Cream, Ocean, Forest Pig) y señalización semántica.
---

# 🎨 Skill: Frontend UX/UI & Sistema de Diseño SIPA

Esta skill establece las heurísticas, directrices de diseño y reglas de implementación para construir el prototipo frontend de **SIPA (Sistema Integral de Producción Agro-porcina — Uniporc Tandil)** con máxima fidelidad visual, alta densidad de datos y cumplimiento riguroso de accesibilidad **WCAG 2.2 AA / AAA**.

---

## 1. Heurísticas y Principios de Diseño para Agroindustria

1. **Claridad sobre Complejidad:** El usuario de planta o granja opera en entornos con luz variable y pantallas táctiles o monitores estándar. Priorizar contrastes elevados y tipografía legible.
2. **Densidad de Información sin Hacinamiento:** Utilizar grillas estructuradas con espaciados armónicos (`gap-4`, `p-6`), permitiendo al usuario directivo escanear rápidamente indicadores sin perder contexto visual.
3. **Señalización Multimodal (Color + Forma + Texto):** Nunca comunicar un estado (éxito, discrepancia, advertencia, bloqueo) exclusivamente mediante color. Siempre combinar:
   * **Color:** Verde (éxito), Ámbar (advertencia), Rojo/Coral (discrepancia), Azul (informativo).
   * **Ícono Lucide:** `CheckCircle2`, `AlertTriangle`, `AlertOctagon`, `Info`, `Lock`.
   * **Texto descriptivo:** Ej. `✓ 0 kg (Exacto)`, `⚠ Discrepancia detectada (-1 u.)`.
4. **Respeto a las Convenciones Contables y Métricas:**
   * Separadores locales de Argentina: Punto `.` para miles, Coma `,` para decimales.
   * Monedas: `ARS` como `$ 4.410.000` o `$ 183,75`; `USD` como `US$ 1,00`.
   * Peso: `kg` con separador de miles (`24.000 kg`).

---

## 2. Paleta Cromática y Tokens Semánticos

La paleta institucional está optimizada para reducir la fatiga visual en turnos prolongados de trabajo administrativo y de planta:

| Token Tailwind / CSS | Hex | Rol en la Interfaz | Ratio Contraste WCAG |
|---|---|---|---|
| `cream.DEFAULT` (`--color-bg`) | `#EEE8DF` | Lienzo principal cálido de fondo | Base |
| `cream.light` (`--color-surface`) | `#F7F4EF` | Paneles, filtros superiores, cabeceras | Base |
| `surface-raised` | `#FFFFFF` | Tarjetas de KPI, modales, celdas de tabla | Base |
| `beige.DEFAULT` (`--color-border`) | `#C4BCB0` | Bordes estructurales sutiles y divisores | 1.4:1 (Decorativo) |
| `ocean.DEFAULT` (`--color-primary`) | `#2C365A` | Marca principal, títulos ejecutivos, botones | **9.67:1 (AAA)** |
| `forest.DEFAULT` (`--color-accent`) | `#1E4D3B` | Acento zootécnico SIPA, focos activos, KPIs vivos | **7.91:1 (AAA)** |
| `foreground` (`--color-text`) | `#182038` | Texto principal | **13.23:1 (AAA)** |
| `subtle` (`--color-text-subtle`) | `#444F6E` | Metadatos, subtítulos y rótulos de ejes | **6.65:1 (AA+)** |

> **Auditoría de Contraste Automática:**
> Para verificar los ratios de contraste de nuevos componentes o paletas, ejecutar el script:
> `python3 .agents/skills/frontend-ux-ui/scripts/contrast_check.py`

---

## 3. Reglas de Tablas y Formateo Numérico

En cualquier tabla o tarjeta con valores numéricos:
1. **Alineación:**
   * Textos y nombres de producto: alineados a la **izquierda** (`text-left`).
   * Fechas, códigos cortos y estados: centrados (`text-center`).
   * Importes monetarios, cantidades en kg, cabezas y ratios: alineados a la **derecha** (`text-right`).
2. **Tipografía Numérica:**
   * Siempre aplicar `tabular-nums` (o `font-mono`) en valores numéricos para asegurar que los dígitos se alineen verticalmente columna por columna:
     ```tsx
     <td className="text-right tabular-nums font-medium text-ocean">
       {formatArs(record.totalCostArs)}
     </td>
     ```
3. **Formateadores estándar:** Utilizar los métodos de `src/services/sipaEngine.ts`:
   * `formatArs(val, withDecimals?)`
   * `formatUsd(val)`
   * `formatNum(val, decimals?)`

---

## 4. Accesibilidad (WCAG 2.2 AA)

1. **Foco Visible de Teclado:**
   * Todo botón, enlace o control interactivo debe tener visible su anillo de foco:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2`
2. **Skip Link:**
   * Mantener el enlace de acceso directo al inicio del DOM: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Saltar al contenido principal</a>`.
3. **Preferencia de Movimiento Reducido:**
   * En animaciones de Framer Motion o Tailwind transitions, comprobar `prefers-reduced-motion` o usar variantes suaves con transiciones de opacidad sin saltos cinéticos bruscos.
4. **Estructura Semántica de Encabezados:**
   * Mantener un único `h1` por vista o dashboard, seguido de jerarquía lógica `h2` -> `h3` sin saltear niveles.

