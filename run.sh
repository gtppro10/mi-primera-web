#!/usr/bin/env bash
set -euo pipefail

# Servir siempre esta carpeta, aunque el comando se ejecute desde otra.
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 -m http.server 8000 --bind 0.0.0.0 --directory "$project_dir"
