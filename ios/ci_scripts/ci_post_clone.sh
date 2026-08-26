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

echo "==> Node"
node --version

echo "==> Enable Corepack"
corepack enable

echo "==> pnpm 9.4.0"
corepack prepare pnpm@9.4.0 --activate
pnpm --version

echo "==> Install JavaScript dependencies"
pnpm install --frozen-lockfile

echo "==> CocoaPods"
cd "$IOS_DIR"

pod --version

echo "==> Install Pods"
pod install

echo "==> Verify CocoaPods xcconfig"

XCCONFIG="Pods/Target Support Files/Pods-MyBalance/Pods-MyBalance.release.xcconfig"

if [ ! -f "$XCCONFIG" ]; then
  echo "ERROR: CocoaPods xcconfig was not generated:"
  echo "$XCCONFIG"
  exit 1
fi

ls -lh "$XCCONFIG"

echo "========================================"
echo " Post Clone completed successfully"
echo "========================================"