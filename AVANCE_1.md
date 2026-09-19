# Avance 1 — Red Kielsa en San Pedro Sula

**Asignatura:** Matemática Discreta · Proyecto G.R.A.S.P.S.

**Cadena asignada:** Farmacias Kielsa (Grupo 1)

**Fecha de consulta:** 18 de septiembre de 2026

**Equipo/sección:** completar antes de entregar

## 1. Objetivo y alcance

Para el caso de NetGuard Solutions, levanté un inventario de sucursales Kielsa del municipio de San Pedro Sula y una muestra de conexiones viales que servirán para construir el grafo de visitas IoT. Este avance cubre la identificación de nodos, las distancias iniciales por carretera y tres zonas candidatas para la sede técnica. Los circuitos hamiltonianos se desarrollarán en la Entrega 2 y en la entrega final, según el enunciado local “Ap10_Q3_2026_MAT303_Proyecto_V2(1).pdf”.

## 2. Fuentes y método

1. Consulté el [localizador oficial de Kielsa](https://kielsa.com/branchOffices) el 18 de septiembre de 2026. Conservé registros activos asociados a la ciudad San Pedro Sula cuyo municipio oficial figura como **SAN PEDRO SULA**. El resultado fue **55 sucursales**. El inventario íntegro, con nombres, direcciones y enlaces, está en [datos/sucursales_kielsa_sps_2026-09-18.csv](datos/sucursales_kielsa_sps_2026-09-18.csv).
2. **51** registros tienen coordenadas dentro del área urbana usada para revisión. **K052, K053 y K171** tienen coordenadas 0,0; **K207** tiene coordenadas fuera de SPS pese a tener dirección de SPS. Se conservan en el inventario con estado **coordenada por verificar**, sin colocarlos como puntos exactos del mapa.
3. Seleccioné **12 nodos de trabajo** repartidos en norte, centro y sur. Para cada conexión propuesta abrí la ruta de automóvil en Google Maps entre las coordenadas oficiales y registré la **primera ruta mostrada**, su distancia, tiempo y enlace verificable. Las 23 consultas están en [datos/distancias_google_maps_2026-09-18.csv](datos/distancias_google_maps_2026-09-18.csv). Los tiempos son una captura y pueden cambiar con el tráfico; la distancia y la ruta también deben revisarse antes de la versión final.

## 3. Nodos seleccionados para el levantamiento vial

| Zona provisional | Código | Sucursal | Dirección publicada por Kielsa |
|---|---|---|---|
| Norte | K142 | Altara | ALTARA N.O AMPLIACIONES URBANAS SECTOR RIO BLANCO, CENTRO COMERCIAL ALTARA., MUNIC: S.P.S:  CORTES |
| Norte | K194 | La Colonia #23 Álamos | COLONIA LOS ALAMOS URBANO COLVISULA INTERIOR SUPERMERCADOS LA COLONIA, MUNIC: S P S , DEPTO, CORTES. |
| Norte | K264 | Mega Plaza Palenque | MEGA PLAZA PALENQUE, CARRETERA EL PALENQUE , COMUNIDAD STIBYS, COL. TARA |
| Norte | K067 | Tara | DIRECCION: COL. TARA A 50 MTS GASOLINERA SHELL TARA, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |
| Centro | K003 | Los Andes | COL. LOS ANDES 6TA CALLE 17 AVENIDA, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |
| Centro | K049 | Policlínica | DIRECCION: FRENTE A LA POLICLINICA HONDUREÑA, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |
| Centro | K075 | Clínica Los Andes | B. LOS ANDRES CENTRO MEDICO LOS ANDES10 AVENIDA 12-13 CALLE, MUNIC: SAN PEDRO SULA, DEPTO: CORTES |
| Centro | K076 | Galenos | B. LOS ANDES CONT. ASYCOM CENTRO MEDICO GALENOS, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |
| Sur | K085 | Multiplaza | INTERIOR CENTRO COMERCIALMULTIPLAZA LOCAL 141, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |
| Sur | K017 | City Mall nivel I | CITY MALL1ER NIVEL, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |
| Sur | K091 | La Colonia #24 Prado Alto | SUR-OESTE URBANO LA GUARDIA INTERIOR DE SUPERMERCADOS LA COLONIA PRADO, MUNIC: SPS, DEPTO:CORTES |
| Sur | K008 | CEMESA | FRENTE A CEMESA SPS, MUNICIPIO: SAN PEDRO SULA, DEPARTAMENTO: CORTES |

La selección de 12 sucursales permite explorar tres zonas de cuatro nodos, tal como sugiere el PDF para los bloques. **No sustituye el inventario completo de 55**. Antes de fijar la subdivisión final, se debe aclarar con el docente cómo conciliar la instrucción de cubrir toda la red con el límite de 2–3 bloques de 4–6 nodos.

## 4. Conexiones viales iniciales

Cada fila tiene un enlace a la consulta de Google Maps en modo automóvil. La ruta se tomó en el sentido origen → destino; para el grafo no dirigido solicitado por el enunciado, usar el mismo peso en ambos sentidos será una simplificación que deberá justificarse o contrastarse con la vuelta.

| Zona | Ruta en Google Maps | Distancia mostrada | Tiempo mostrado | Vía principal |
|---|---|---:|---:|---|
| norte | [K142 → K194](https://www.google.com/maps/dir/?api=1&origin=15.5627%2C-88.02202222&destination=15.54703333%2C-88.01131667&travelmode=driving) | 2.6 km | 5 min | C. Hacia Armenta |
| norte | [K194 → K264](https://www.google.com/maps/dir/?api=1&origin=15.54703333%2C-88.01131667&destination=15.539455%2C-88.01686&travelmode=driving) | 1.2 km | 2 min | Bulevar del Nte./CA-5 |
| norte | [K264 → K067](https://www.google.com/maps/dir/?api=1&origin=15.539455%2C-88.01686&destination=15.54368333%2C-88.01453333&travelmode=driving) | 2.9 km | 6 min | Bulevar del Nte./CA-5 |
| norte | [K067 → K142](https://www.google.com/maps/dir/?api=1&origin=15.54368333%2C-88.01453333&destination=15.5627%2C-88.02202222&travelmode=driving) | 4.0 km | 8 min | Bulevar del Nte./CA-5 y C. Hacia Armenta |
| centro | [K003 → K049](https://www.google.com/maps/dir/?api=1&origin=15.51166389%2C-88.03683333&destination=15.51074167%2C-88.03042778&travelmode=driving) | 1.4 km | 4 min | 5 Calle NO |
| centro | [K049 → K075](https://www.google.com/maps/dir/?api=1&origin=15.51074167%2C-88.03042778&destination=15.51233889%2C-88.02931111&travelmode=driving) | 300 metros | 1 min | 6 Calle North-West y 10 Avenida NO |
| centro | [K075 → K076](https://www.google.com/maps/dir/?api=1&origin=15.51233889%2C-88.02931111&destination=15.515275%2C-88.02893889&travelmode=driving) | 350 metros | 1 min | 10 Avenida NO |
| centro | [K076 → K003](https://www.google.com/maps/dir/?api=1&origin=15.515275%2C-88.02893889&destination=15.51166389%2C-88.03683333&travelmode=driving) | 1.6 km | 5 min | Avenida Circunvalación/CA-5 |
| sur | [K085 → K017](https://www.google.com/maps/dir/?api=1&origin=15.49424444%2C-88.03430556&destination=15.4963777777778%2C-88.0361166666667&travelmode=driving) | 1.3 km | 5 min | Blvr. del Sur/CA-5 |
| sur | [K017 → K091](https://www.google.com/maps/dir/?api=1&origin=15.4963777777778%2C-88.0361166666667&destination=15.48541667%2C-88.03407222&travelmode=driving) | 1.9 km | 6 min | Blvr. del Sur/CA-5 y 10 Avenida S |
| sur | [K091 → K008](https://www.google.com/maps/dir/?api=1&origin=15.48541667%2C-88.03407222&destination=15.48851944%2C-88.03454722&travelmode=driving) | 400 metros | 1 min | Blvr. del Sur/CA-5 |
| sur | [K008 → K085](https://www.google.com/maps/dir/?api=1&origin=15.48851944%2C-88.03454722&destination=15.49424444%2C-88.03430556&travelmode=driving) | 700 metros | 3 min | Blvr. del Sur/CA-5 |
| entre zonas | [K194 → K076](https://www.google.com/maps/dir/?api=1&origin=15.54703333%2C-88.01131667&destination=15.515275%2C-88.02893889&travelmode=driving) | 4.6 km | 9 min | Bulevar del Nte./CA-5 |
| entre zonas | [K003 → K017](https://www.google.com/maps/dir/?api=1&origin=15.51166389%2C-88.03683333&destination=15.4963777777778%2C-88.0361166666667&travelmode=driving) | 2.0 km | 6 min | Avenida Circunvalación/CA-5 |

Los cuatro nodos de cada zona quedan conectados entre sí. Las conexiones **K194–K076** y **K003–K017** enlazan norte, centro y sur, por lo que el grafo de 12 nodos es conexo. Estas aristas son una propuesta inicial respaldada por rutas viales consultables; la selección definitiva y el circuito hamiltoniano corresponden a la siguiente entrega.

## 5. Tres ubicaciones candidatas para la sede técnica

Cada candidato es una **zona de búsqueda**, con un punto de referencia reproducible tomado de una ubicación conocida. Esto **no afirma** que el local de la farmacia esté disponible para alquilar como sede. Los puntos permiten comparar la conectividad; después habrá que validar inmuebles, acceso, tráfico y costo de arriendo.

| Candidato | Zona de referencia | Coordenada de referencia | Mapa |
|---|---|---|---|
| A | Blvd. del Norte / Plaza Universal | 15.532625, -88.01909 | [Abrir referencia](https://www.google.com/maps/search/?api=1&query=15.532625%2C-88.01909) |
| B | Barrio El Centro / 4.ª calle y 5.ª avenida | 15.50370278, -88.026075 | [Abrir referencia](https://www.google.com/maps/search/?api=1&query=15.50370278%2C-88.026075) |
| C | Barrio Las Palmas / 20 calle | 15.48606667, -88.01671111 | [Abrir referencia](https://www.google.com/maps/search/?api=1&query=15.48606667%2C-88.01671111) |

Se midió la ruta desde cada punto de referencia a una sucursal representativa de cada zona: **K142 Altara (norte), K003 Los Andes (centro) y K085 Multiplaza (sur)**.

| Candidato | Zona y sucursal representativa | Distancia y tiempo, con ruta verificable |
|---|---|---|
| A | norte (Altara) | [4.9 km; 9 min](https://www.google.com/maps/dir/?api=1&origin=15.532625%2C-88.01909&destination=15.5627%2C-88.02202222&travelmode=driving) |
| A | centro (Los Andes) | [4.2 km; 9 min](https://www.google.com/maps/dir/?api=1&origin=15.532625%2C-88.01909&destination=15.51166389%2C-88.03683333&travelmode=driving) |
| A | sur (Multiplaza) | [6.6 km; 17 min](https://www.google.com/maps/dir/?api=1&origin=15.532625%2C-88.01909&destination=15.49424444%2C-88.03430556&travelmode=driving) |
| B | norte (Altara) | [8.6 km; 19 min](https://www.google.com/maps/dir/?api=1&origin=15.50370278%2C-88.026075&destination=15.5627%2C-88.02202222&travelmode=driving) |
| B | centro (Los Andes) | [3.5 km; 11 min](https://www.google.com/maps/dir/?api=1&origin=15.50370278%2C-88.026075&destination=15.51166389%2C-88.03683333&travelmode=driving) |
| B | sur (Multiplaza) | [2.2 km; 8 min](https://www.google.com/maps/dir/?api=1&origin=15.50370278%2C-88.026075&destination=15.49424444%2C-88.03430556&travelmode=driving) |
| C | norte (Altara) | [12.5 km; 22 min](https://www.google.com/maps/dir/?api=1&origin=15.48606667%2C-88.01671111&destination=15.5627%2C-88.02202222&travelmode=driving) |
| C | centro (Los Andes) | [5.9 km; 16 min](https://www.google.com/maps/dir/?api=1&origin=15.48606667%2C-88.01671111&destination=15.51166389%2C-88.03683333&travelmode=driving) |
| C | sur (Multiplaza) | [3.5 km; 11 min](https://www.google.com/maps/dir/?api=1&origin=15.48606667%2C-88.01671111&destination=15.49424444%2C-88.03430556&travelmode=driving) |

**Comparación preliminar** (suma de las tres rutas de referencia, no recorridos reales de despacho):

| Candidato | Distancia acumulada | Suma de tiempos mostrados |
|---|---:|---:|
| A | 15.7 km | 35 min |
| B | 14.3 km | 38 min |
| C | 21.9 km | 49 min |

El candidato **B** tiene la menor suma de kilómetros de esta muestra, mientras que **A** tiene la menor suma de tiempos mostrados. Son indicadores iniciales, no una recomendación final: cada zona necesita evaluación de inmueble, vías de acceso y conectividad con todos los bloques.

## 6. Límites y siguiente etapa

- El localizador de Kielsa contiene cuatro registros de SPS sin coordenadas utilizables; requieren validación manual en Google Maps o visita de campo.
- El enunciado pide un grafo completo de la red, pero limita la subdivisión a 2–3 bloques de 4–6 sucursales; con 55 registros nominales esa combinación no cubre toda la red. La muestra de 12 nodos es provisional para el Avance 1.
- La distancia por carretera puede ser diferente al invertir origen y destino debido a vías de un solo sentido. El modelo no dirigido del enunciado debe declarar la convención de pesos antes de calcular circuitos.
- Para la Entrega 2 se debe justificar la partición definitiva, revisar conexiones reales y programar la búsqueda de circuitos hamiltonianos. **Dijkstra no resuelve ese requisito**.

**Fuentes principales:** [localizador oficial Kielsa](https://kielsa.com/branchOffices); enlaces de Google Maps en cada fila y en el CSV de distancias; enunciado local del proyecto “Ap10_Q3_2026_MAT303_Proyecto_V2(1).pdf”.
