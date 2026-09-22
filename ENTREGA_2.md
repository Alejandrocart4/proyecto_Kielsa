# Entrega 2 - Circuitos Hamiltonianos

## Requisito del PDF

Seleccionar subdivisiones, justificar los criterios, verificar condiciones hamiltonianas y programar un algoritmo de búsqueda. El check-in de construir circuitos para una sede es opcional y no forma parte de esta etapa.

## Bloques actuales

La aplicación usa las 50 sucursales activas y la división geográfica entregada por el equipo:

| Bloque | Zona | Sucursales |
| --- | --- | ---: |
| A | Oeste / Noroeste | 18 |
| B | Centro / Norte | 18 |
| C | Sur / Este | 14 |

Cada bloque inicia con un ciclo editable que conecta a cada sucursal con dos vecinos cercanos. Esta conexión inicial permite que el algoritmo de Python compruebe un circuito de partida. No se presenta como distancia final de carretera.

## Pesos reales de carretera

Al pulsar **Actualizar pesos reales con Google Maps**, la aplicación consulta Google Maps Routes para cada arista del circuito y sustituye el valor inicial por kilómetros de carretera. El dibujo se conserva en línea recta para que sea legible cuando una farmacia está dentro de un centro comercial, pero el peso usado por Python corresponde a la distancia real de Google Maps.

## Verificación

La aplicación revisa conexión, grado mínimo 2, Dirac y Ore. Dirac y Ore son condiciones suficientes. Si no se cumplen, Python ejecuta de todos modos la búsqueda por retroceso para comprobar el circuito existente en el grafo.

## Implementación en Python

`branches.py` construye los bloques reales y sus conexiones iniciales. `app.py` expone la API Flask. `hamiltonian.py` construye el grafo, verifica conectividad y criterios, y busca el circuito mediante retroceso. El navegador solo representa el mapa y solicita los kilómetros a Google Maps.

## Uso

Ejecutar `iniciar.bat`, abrir `http://127.0.0.1:5000` y pulsar **Abrir constructor de circuitos**. Seleccionar A, B o C, revisar el circuito y actualizar sus pesos con Google Maps antes de usar la distancia total como resultado final.
