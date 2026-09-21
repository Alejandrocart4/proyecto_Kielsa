// Datos iniciales del Avance 1. Son una plantilla; la interfaz permite cambiarlos.
const node = (id, name, lat, lng) => ({ id, name, lat, lng });
const edge = (from, to, weight) => ({ from, to, weight });

export const avance1Blocks = [
  {
    id: 'norte', name: 'Bloque Norte',
    criterion: 'Proximidad geográfica en el corredor norte y distancias viales de Google Maps.',
    nodes: [node('K142', 'K142 Altara', 15.5627, -88.02202222), node('K194', 'K194 La Colonia Álamos', 15.54703333, -88.01131667), node('K264', 'K264 Mega Plaza Palenque', 15.539455, -88.01686), node('K067', 'K067 Tara', 15.54368333, -88.01453333)],
    edges: [edge('K142', 'K194', 2.6), edge('K194', 'K264', 1.2), edge('K264', 'K067', 2.9), edge('K067', 'K142', 4.0)],
  },
  {
    id: 'centro', name: 'Bloque Centro',
    criterion: 'Sucursales cercanas de Los Andes, con rutas viales cortas verificadas en el Avance 1.',
    nodes: [node('K003', 'K003 Los Andes', 15.51166389, -88.03683333), node('K049', 'K049 Policlínica', 15.51074167, -88.03042778), node('K075', 'K075 Clínica Los Andes', 15.51233889, -88.02931111), node('K076', 'K076 Galenos', 15.515275, -88.02893889)],
    edges: [edge('K003', 'K049', 1.4), edge('K049', 'K075', 0.3), edge('K075', 'K076', 0.35), edge('K076', 'K003', 1.6)],
  },
  {
    id: 'sur', name: 'Bloque Sur',
    criterion: 'Proximidad en el sector sur y conexiones por Bulevar del Sur registradas en Google Maps.',
    nodes: [node('K085', 'K085 Multiplaza', 15.49424444, -88.03430556), node('K017', 'K017 City Mall nivel I', 15.4963777777778, -88.0361166666667), node('K091', 'K091 La Colonia Prado Alto', 15.48541667, -88.03407222), node('K008', 'K008 CEMESA', 15.48851944, -88.03454722)],
    edges: [edge('K085', 'K017', 1.3), edge('K017', 'K091', 1.9), edge('K091', 'K008', 0.4), edge('K008', 'K085', 0.7)],
  },
];
