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

if ! command -v node >/dev/null 2>&1; then
  brew install node@20
fi

export PATH="$(brew --prefix node@20)/bin:$PATH"

echo "Node:"
node --version

echo "npm:"
npm --version

echo "==> Enable Corepack"
corepack enable

echo "==> Activate pnpm 9.4.0"
corepack prepare pnpm@9.4.0 --activate

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