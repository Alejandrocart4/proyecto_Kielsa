# Proyecto Kielsa: grafo de sucursales en San Pedro Sula

Aplicación web que obtiene sucursales de Farmacias Kielsa desde Google Places, las muestra como nodos sobre Google Maps y conecta cada una con sus vecinas. Permite elegir origen y destino para hallar el camino más corto del grafo con el algoritmo de Dijkstra.

## Avance 1 de Matemática Discreta

El [informe editable](AVANCE_1.md) y el [PDF para entregar](output/pdf/Avance_1_Kielsa_SPS.pdf) reúnen el inventario oficial de 55 sucursales, una muestra de 12 nodos, 14 conexiones viales medidas en Google Maps y tres zonas candidatas para la sede técnica. Los CSV de [sucursales](datos/sucursales_kielsa_sps_2026-09-18.csv) y [distancias](datos/distancias_google_maps_2026-09-18.csv) conservan los datos y enlaces de verificación. Completa los integrantes y la sección antes de entregar.

## Preparación

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/) con facturación y habilita **Maps JavaScript API** y **Places API (New)**.
2. Crea dos claves: una para el navegador, restringida por referentes HTTP (`http://localhost:5173/*` y el dominio donde publiques la app) y por **Maps JavaScript API**; otra para el servidor, restringida a **Places API (New)**. Si el servidor tiene una IP de salida fija, restringe también la clave del servidor a esa IP.
3. Copia `.env.example` a `.env` y completa las dos claves. `.env` está excluido de Git.
4. Ejecuta:

   ```bash
   npm install
   npm run dev
   ```

5. Abre `http://localhost:5173`.

`npm test` verifica el filtrado de sucursales y el algoritmo del grafo. `npm run build` genera `dist/`; `npm start` sirve esa compilación junto con la API. Un sitio estático como GitHub Pages no puede ejecutar el servidor de Places por sí solo.

## Cómo funciona

- El servidor consulta hasta tres páginas de **Places Text Search (New)** dentro de un rectángulo alrededor de San Pedro Sula. Acepta únicamente resultados cuyo nombre incluya “Kielsa” y cuyo componente `locality` o `administrative_area_level_2` sea “San Pedro Sula”. Omite lugares permanentemente cerrados. La comprobación municipal evita mostrar sucursales de ciudades vecinas incluidas en el rectángulo.
- El mapa dibuja las sucursales recibidas al momento de la consulta. No conserva nombres ni coordenadas de Places en el repositorio o en una base de datos.
- El grafo une todas las sucursales mediante un árbol de expansión mínima y agrega conexiones con las dos sucursales más cercanas a cada nodo. El peso de cada arista es la distancia en línea recta calculada con Haversine. El camino resaltado es el más corto **dentro de ese grafo**, no una ruta por calles ni una indicación de manejo.

Google limita Text Search a 20 resultados por página y actualmente hasta 60 por consulta. Los resultados pueden no incluir todas las sucursales existentes. Puedes contrastarlos con el [localizador oficial de Kielsa](https://kielsa.com/). Cada carga puede generar cargos según el [precio actual de Google Maps Platform](https://developers.google.com/maps/billing-and-pricing/pricing).

En una consulta del 18 de septiembre de 2026, el localizador oficial tenía 55 registros cuyo municipio era San Pedro Sula. Cuatro de ellos carecían de coordenadas utilizables o tenían coordenadas fuera de la ciudad. La aplicación no inventa posiciones para esos casos y la búsqueda de Google puede devolver un número distinto de sucursales.

## Fuentes técnicas

- [Places Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [Seguridad de claves](https://developers.google.com/maps/api-security-best-practices)
- [Políticas de contenido de Places](https://developers.google.com/maps/documentation/places/web-service/policies)
