#!/bin/bash

set -euo pipefail

echo "========================================"
echo " Xcode Cloud - Post Clone"
echo "========================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$IOS_DIR/.." && pwd)"

echo "Project root: $PROJECT_ROOT"
echo "iOS directory: $IOS_DIR"

cd "$PROJECT_ROOT"

echo "==> Install Node.js"

NODE_VERSION="$(tr -d '[:space:]' < "$PROJECT_ROOT/.nvmrc")"
NODE_ARCH="$(uname -m)"
case "$NODE_ARCH" in
  arm64) ;;
  x86_64) NODE_ARCH="x64" ;;
  *) echo "Unsupported architecture: $NODE_ARCH"; exit 1 ;;
esac
NODE_ARCHIVE="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
NODE_HOME="$HOME/.mybalance-node"
DOWNLOAD_DIR="$(mktemp -d)"
trap 'rm -rf "$DOWNLOAD_DIR"' EXIT
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}"
curl --fail --location --retry 3 "$NODE_URL/$NODE_ARCHIVE" -o "$DOWNLOAD_DIR/$NODE_ARCHIVE"
curl --fail --location --retry 3 "$NODE_URL/SHASUMS256.txt" -o "$DOWNLOAD_DIR/SHASUMS256.txt"
pushd "$DOWNLOAD_DIR" >/dev/null
awk -v archive="$NODE_ARCHIVE" '$2 == archive { print; found = 1 } END { if (!found) exit 1 }' SHASUMS256.txt | shasum -a 256 --check
popd >/dev/null
mkdir -p "$NODE_HOME"
tar -xzf "$DOWNLOAD_DIR/$NODE_ARCHIVE" --strip-components=1 -C "$NODE_HOME"
export PATH="$NODE_HOME/bin:$PATH"
export NODE_BINARY="$NODE_HOME/bin/node"

echo "Node:"
node --version

echo "npm:"
npm --version

echo "==> Install pinned package manager"
PACKAGE_MANAGER="$(node -p "require('./package.json').packageManager")"
npm install --global "$PACKAGE_MANAGER"

echo "pnpm:"
pnpm --version

echo "==> Install JavaScript dependencies"
pnpm install --frozen-lockfile

echo "==> Install CocoaPods"

cd "$IOS_DIR"

if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

pod --version

pod install

echo "==> Verify CocoaPods"

XCCONFIG="Pods/Target Support Files/Pods-MyBalance/Pods-MyBalance.release.xcconfig"

if [ ! -f "$XCCONFIG" ]; then
  echo "ERROR: Missing CocoaPods configuration:"
  echo "$XCCONFIG"
  exit 1
fi

ls -lh "$XCCONFIG"

echo "========================================"
echo " Xcode Cloud dependencies ready"
echo "========================================"