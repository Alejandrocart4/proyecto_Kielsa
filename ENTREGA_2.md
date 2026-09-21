# Entrega 2 — Circuitos Hamiltonianos

## Requisito del PDF

Seleccionar subdivisiones, justificar los criterios, verificar condiciones hamiltonianas y programar un algoritmo de búsqueda. El check-in de construir circuitos para una sede es opcional y no forma parte de esta etapa.

## Evidencia reutilizada del Avance 1

Se usan tres bloques provisionales de cuatro nodos: norte, centro y sur. Sus aristas y pesos proceden de `datos/distancias_google_maps_2026-09-18.csv`, donde se registraron rutas viales de Google Maps.

## Criterio de subdivisión

Cada bloque agrupa sucursales cercanas geográficamente y con conexiones viales cortas registradas. Cuatro nodos por bloque permiten documentar y verificar cada circuito con claridad. Es una subdivisión de trabajo del Avance 1; no afirma cubrir las 55 sucursales del inventario completo.

## Verificación

La aplicación revisa conexión, grado mínimo 2, Dirac y Ore. Dirac y Ore son suficientes: si no se cumplen, se ejecuta de todos modos la búsqueda por retroceso.

## Pesos viales actualizables

El mapa consulta Google Maps Routes para dibujar los tramos por carretera del circuito encontrado. Cuando el usuario usa esa opción, la distancia retornada en kilómetros reemplaza el peso de cada arista consultada. Así el algoritmo vuelve a trabajar con pesos viales y no con estimaciones en línea recta.

## Implementación en Python

`app.py` contiene el servidor Flask y la API local. `hamiltonian.py` contiene la construcción del grafo, la conectividad, los criterios de Dirac y Ore y la búsqueda por retroceso. El navegador solo usa JavaScript para representar el mapa y solicitar los caminos a Google Maps.

## Uso

Ejecutar `python app.py` dentro de `proyecto_Kielsa` y abrir `http://127.0.0.1:5000`. Se pueden cambiar nodos, conexiones y pesos desde la interfaz; al hacerlo, Python vuelve a calcular el resultado sobre el grafo actual, sin circuitos fijos.
