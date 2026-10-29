# 🎬 Escenarios de Prueba y Casos de Demostración para Hackaton

## Escenario A: "Detección Temprana a Mitad de Mes" (Pain Point Central de Uniporc)
* **Objetivo:** Demostrar cómo SIPA rompe la limitación del cierre mensual tradicional al permitir auditorías continuas sin esperar a fin de mes.
* **Acción:**
  1. En **Farmacia & Stock**, mostrar que el `Producto sanitario A` tiene un faltante teórico de 1 unidad ($ 15.000).
  2. En lugar de descubrirlo 30 días después con el balance cerrado, el encargado detecta el desvío a mitad de mes.
  3. Hace clic en *Conciliar y generar asiento Nuvix*.
  4. El asiento queda registrado para que Administración lo audite antes del cierre formal.

## Escenario B: "Simulador de Impacto Cambiario en Planta de Alimentos"
* **Objetivo:** Mostrar cómo la variación del tipo de cambio o del precio del maíz impacta directamente en el Costo por Kg de carne.
* **Acción:**
  1. En **Planta Alimento (SCADA)**, modificar el tipo de cambio simulado (ej. de `$ 1.050` a `$ 1.200`).
  2. Observar el recálculo automático del costo en dólares de la ración de engorde.
  3. Regresar a la **Torre de Control** y verificar el nuevo margen proyectado.

