#!/usr/bin/env bash

# Build and package the Stash Downloader plugin for manual installation.
# Cleans previous artifacts, runs pnpm build, and prepares export assets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PACKAGE_NAME="stash-downloader"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/build/export}"
PACKAGE_DIR="$OUTPUT_DIR/$PACKAGE_NAME"
ZIP_PATH="$OUTPUT_DIR/$PACKAGE_NAME.zip"

echo "[export] Cleaning previous artifacts..."
rm -rf "$ROOT_DIR/dist" "$PACKAGE_DIR" "$ZIP_PATH"
mkdir -p "$OUTPUT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[export] pnpm is required but was not found on PATH." >&2
  exit 1
fi

echo "[export] Installing dependencies..."
pnpm install

echo "[export] Building plugin..."
pnpm build

echo "[export] Preparing export directory..."
mkdir -p "$PACKAGE_DIR"
cp "$ROOT_DIR/stash-downloader.yml" "$PACKAGE_DIR/"
cp "$ROOT_DIR/README.md" "$PACKAGE_DIR/"
cp "$ROOT_DIR/LICENSE" "$PACKAGE_DIR/"
cp -R "$ROOT_DIR/dist" "$PACKAGE_DIR/"

if ! command -v zip >/dev/null 2>&1; then
  echo "[export] zip not found; skipping archive creation. Files available in $PACKAGE_DIR"
  exit 0
fi

echo "[export] Creating archive..."
(cd "$OUTPUT_DIR" && zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" >/dev/null)

echo "[export] Done. Folder: $PACKAGE_DIR"
echo "[export] Archive: $ZIP_PATH"

