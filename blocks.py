"""Bloques iniciales tomados de las rutas viales verificadas en el Avance 1."""

avance_1_blocks = [
    {
        "id": "norte",
        "name": "Bloque Norte",
        "criterion": "Proximidad geográfica en el corredor norte y distancias viales de Google Maps.",
        "nodes": [
            {"id": "K142", "name": "K142 Altara", "lat": 15.5627, "lng": -88.02202222},
            {"id": "K194", "name": "K194 La Colonia Álamos", "lat": 15.54703333, "lng": -88.01131667},
            {"id": "K264", "name": "K264 Mega Plaza Palenque", "lat": 15.539455, "lng": -88.01686},
            {"id": "K067", "name": "K067 Tara", "lat": 15.54368333, "lng": -88.01453333},
        ],
        "edges": [
            {"from": "K142", "to": "K194", "weight": 2.6},
            {"from": "K194", "to": "K264", "weight": 1.2},
            {"from": "K264", "to": "K067", "weight": 2.9},
            {"from": "K067", "to": "K142", "weight": 4.0},
        ],
    },
    {
        "id": "centro",
        "name": "Bloque Centro",
        "criterion": "Sucursales cercanas de Los Andes, con rutas viales cortas verificadas en el Avance 1.",
        "nodes": [
            {"id": "K003", "name": "K003 Los Andes", "lat": 15.51166389, "lng": -88.03683333},
            {"id": "K049", "name": "K049 Policlínica", "lat": 15.51074167, "lng": -88.03042778},
            {"id": "K075", "name": "K075 Clínica Los Andes", "lat": 15.51233889, "lng": -88.02931111},
            {"id": "K076", "name": "K076 Galenos", "lat": 15.515275, "lng": -88.02893889},
        ],
        "edges": [
            {"from": "K003", "to": "K049", "weight": 1.4},
            {"from": "K049", "to": "K075", "weight": 0.3},
            {"from": "K075", "to": "K076", "weight": 0.35},
            {"from": "K076", "to": "K003", "weight": 1.6},
        ],
    },
    {
        "id": "sur",
        "name": "Bloque Sur",
        "criterion": "Proximidad en el sector sur y conexiones por Bulevar del Sur registradas en Google Maps.",
        "nodes": [
            {"id": "K085", "name": "K085 Multiplaza", "lat": 15.49424444, "lng": -88.03430556},
            {"id": "K017", "name": "K017 City Mall nivel I", "lat": 15.4963777777778, "lng": -88.0361166666667},
            {"id": "K091", "name": "K091 La Colonia Prado Alto", "lat": 15.48541667, "lng": -88.03407222},
            {"id": "K008", "name": "K008 CEMESA", "lat": 15.48851944, "lng": -88.03454722},
        ],
        "edges": [
            {"from": "K085", "to": "K017", "weight": 1.3},
            {"from": "K017", "to": "K091", "weight": 1.9},
            {"from": "K091", "to": "K008", "weight": 0.4},
            {"from": "K008", "to": "K085", "weight": 0.7},
        ],
    },
]
