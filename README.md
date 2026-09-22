# Optimizador de Rutas Kielsa SPS

Aplicación en Python y Flask para visualizar las 52 sucursales activas de Kielsa en San Pedro Sula, agruparlas en bloques A, B y C, y construir circuitos hamiltonianos editables.

## Ejecutar en otra computadora con Windows

1. Instalar Python 3.11 o superior desde [python.org](https://www.python.org/downloads/). Durante la instalación, marcar **Add Python to PATH**.
2. Descargar o clonar este repositorio.
3. Abrir la carpeta `proyecto_Kielsa`.
4. Hacer doble clic en `iniciar.bat`, o ejecutar desde PowerShell:

   ```powershell
   .\iniciar.ps1
   ```

El primer inicio instala Flask. Después abrir `http://127.0.0.1:5000` en el navegador.

## Google Maps

El mapa requiere una clave propia de Google Maps. Crear un archivo llamado `.env` en la raíz del proyecto, copiando `.env.example`, y completar:

```text
VITE_GOOGLE_MAPS_BROWSER_KEY=TU_CLAVE_AQUI
```

En Google Cloud se deben habilitar **Maps JavaScript API** y **Routes API**. Para uso local, restringir la clave a estos referentes HTTP:

```text
http://localhost:5000/*
http://127.0.0.1:5000/*
```

## Prueba del algoritmo

```powershell
py -3 -m unittest discover -s tests
```

El inventario base está en `datos/sucursales_kielsa_sps_2026-09-18.csv`. Las coordenadas y bloques precisos se leen desde `datos/sucursales_sin_K604_K094_K303.csv`. La aplicación conserva K001 y K591 para completar las 52 sucursales activas.
