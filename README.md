# Proyecto Kielsa — Entrega 2

Aplicación editable para construir y verificar circuitos hamiltonianos en bloques de farmacias Kielsa de San Pedro Sula.

```powershell
npm run dev
npm test
```

Los datos iniciales provienen del Avance 1. Los cambios que hagas en la interfaz se guardan en el navegador y pueden restaurarse con **Restaurar Avance 1**.

## Google Maps

El mapa usa `VITE_GOOGLE_MAPS_BROWSER_KEY` del archivo `.env`. En el mismo proyecto de Google Cloud deben estar habilitadas **Maps JavaScript API** y **Routes API**. La clave debe restringirse por HTTP referrer; nunca se copia al repositorio.
