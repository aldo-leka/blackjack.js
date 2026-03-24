#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/root/blackjack.js"
IMAGE_TAG="${1:-latest}"

if [[ "$IMAGE_TAG" != "latest" && "$IMAGE_TAG" != sha-* ]]; then
  IMAGE_TAG="sha-$IMAGE_TAG"
fi

cd "$REPO_DIR"
git pull --ff-only
BACK_IMAGE_TAG="$IMAGE_TAG" docker compose pull back
BACK_IMAGE_TAG="$IMAGE_TAG" docker compose run --rm back npm run migrate:deploy
BACK_IMAGE_TAG="$IMAGE_TAG" docker compose up -d back refill-worker
