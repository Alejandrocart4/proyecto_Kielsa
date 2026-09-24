"""Servidor Flask del proyecto Kielsa.

La lógica matemática se ejecuta en Python. JavaScript se usa únicamente para
la interfaz del navegador y para dibujar Google Maps.
"""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory

from blocks import avance_1_blocks
from branches import BLOCKS, build_custom_route_block, build_real_route_blocks, load_active_branches, prepare_route_from_candidate
from hamiltonian import analyze_block


def load_local_environment() -> None:
    """Lee .env sin agregar una dependencia adicional ni exponer la clave."""
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_local_environment()
app = Flask(__name__)


@app.get("/")
def index():
    # La clave de navegador es pública por diseño; su seguridad depende de las
    # restricciones HTTP referrer configuradas en Google Cloud.
    return render_template("index.html", maps_key=os.getenv("VITE_GOOGLE_MAPS_BROWSER_KEY", ""))


@app.get("/imagenes/<path:filename>")
def image(filename: str):
    """Sirve fotografías locales de las sedes candidatas para la comparación."""
    return send_from_directory(Path(__file__).with_name("imagenes"), filename)


@app.get("/api/blocks")
def blocks():
    return jsonify(blocks=avance_1_blocks)


@app.get("/api/branches")
def branches():
    return jsonify(branches=load_active_branches(), block_info=BLOCKS)


@app.get("/api/route-blocks")
def route_blocks():
    return jsonify(blocks=build_real_route_blocks())


@app.post("/api/custom-block")
def custom_block():
    payload = request.get_json(silent=True) or {}
    branch_ids = payload.get("branch_ids")
    if not isinstance(branch_ids, list) or not all(isinstance(item, str) for item in branch_ids):
        return jsonify(error="Se requiere una lista de códigos de sucursales."), 400
    try:
        return jsonify(block=build_custom_route_block(branch_ids))
    except ValueError as error:
        return jsonify(error=str(error)), 400


@app.post("/api/prepare-route")
def prepare_route():
    payload = request.get_json(silent=True) or {}
    block, candidate = payload.get("block"), payload.get("candidate")
    if not isinstance(block, dict) or not isinstance(candidate, dict):
        return jsonify(error="Se requiere un bloque y una sede candidata."), 400
    try:
        return jsonify(block=prepare_route_from_candidate(block, candidate))
    except ValueError as error:
        return jsonify(error=str(error)), 400


@app.post("/api/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    block = payload.get("block")
    start_id = payload.get("start_id")
    if not isinstance(block, dict) or not isinstance(start_id, str):
        return jsonify(error="Se requiere un bloque y un nodo inicial."), 400
    try:
        return jsonify(analyze_block(block, start_id))
    except ValueError as error:
        return jsonify(error=str(error)), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
