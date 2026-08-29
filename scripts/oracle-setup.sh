#!/usr/bin/env bash
# Setup en una VM Ubuntu de Oracle Cloud Always Free.
set -euo pipefail

sudo apt-get update
sudo apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

sudo systemctl enable --now docker

REPO_DIR="${HOME}/webtimer"
if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Cloná tu repo en $REPO_DIR antes de continuar, o editá este script."
  echo "Ejemplo: git clone https://github.com/TU_USUARIO/timer.git $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"
sudo docker compose up -d --build

echo
echo "Listo. Abrí http://$(curl -4 -s ifconfig.me):8000/"
echo "Si no carga, abrí el puerto 8000 en Security List + iptables de Oracle."
