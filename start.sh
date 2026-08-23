#!/usr/bin/env bash
set -Eeuo pipefail

# Khipu - Start
# Levanta backend (FastAPI/Uvicorn) y frontend (Vite).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend/kiphu-frontend"
VENV_DIR="$ROOT_DIR/venv"

BACKEND_PORT="${BACKEND_PORT:-8000}"

log() {
    printf '\033[1;36m==> %s\033[0m\n' "$1"
}

error() {
    printf '\033[1;31mERROR: %s\033[0m\n' "$1" >&2
    exit 1
}

cleanup() {
    log "Deteniendo servicios..."
    if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

[ -d "$VENV_DIR" ] || error "No existe el entorno virtual. Ejecutá ./setup.sh primero."
[ -f "$ROOT_DIR/main.py" ] || error "No se encontró main.py."
[ -f "$FRONTEND_DIR/package.json" ] || error "No se encontró package.json del frontend."

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

command -v python >/dev/null 2>&1 || error "Python no está disponible dentro del entorno virtual."
command -v npm >/dev/null 2>&1 || error "npm no está instalado."
[ -d "$FRONTEND_DIR/node_modules" ] || error "No existe node_modules. Ejecutá ./setup.sh primero."

cd "$ROOT_DIR"

log "Iniciando backend en http://127.0.0.1:$BACKEND_PORT"
python -m uvicorn main:app --reload --host 127.0.0.1 --port "$BACKEND_PORT" &
BACKEND_PID=$!

# Le damos un momento al backend para iniciar.
sleep 1

if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    error "El backend no pudo iniciarse."
fi

log "Iniciando frontend"
cd "$FRONTEND_DIR"

# npm exec evita depender de una instalación global de Vite.
npm run dev

# Cuando Vite termina, cleanup() detiene Uvicorn.
