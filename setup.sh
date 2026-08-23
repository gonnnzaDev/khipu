#!/usr/bin/env bash
set -Eeuo pipefail

# Khipu - Setup
# Instala las dependencias del backend y frontend.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR"
FRONTEND_DIR="$ROOT_DIR/frontend/kiphu-frontend"
VENV_DIR="$ROOT_DIR/venv"

log() {
    printf '\n\033[1;36m==> %s\033[0m\n' "$1"
}

error() {
    printf '\n\033[1;31mERROR: %s\033[0m\n' "$1" >&2
    exit 1
}

command -v python3 >/dev/null 2>&1 || error "Python 3 no está instalado."
command -v npm >/dev/null 2>&1 || error "npm no está instalado."

[ -f "$ROOT_DIR/requirements.txt" ] || error "No se encontró requirements.txt."
[ -f "$FRONTEND_DIR/package.json" ] || error "No se encontró frontend/kiphu-frontend/package.json."

cd "$ROOT_DIR"

log "Creando entorno virtual"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

log "Actualizando pip"
python -m pip install --upgrade pip

log "Instalando dependencias de Python"
python -m pip install -r "$ROOT_DIR/requirements.txt"

log "Instalando dependencias del frontend"
cd "$FRONTEND_DIR"

if [ -f package-lock.json ]; then
    npm ci
else
    npm install
fi

log "Setup completado"
printf '\nBackend:  http://127.0.0.1:8000\n'
printf 'Frontend: ejecutá ./start.sh para levantar el proyecto.\n'
