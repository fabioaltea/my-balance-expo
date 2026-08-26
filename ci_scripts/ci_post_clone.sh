#!/bin/bash

set -e

echo "==> Node"
node --version

echo "==> Corepack"
corepack enable

echo "==> pnpm"
corepack prepare pnpm@9.4.0 --activate
pnpm --version

echo "==> Install JS dependencies"
pnpm install --frozen-lockfile

echo "==> Generate iOS project"
pnpm exec expo prebuild --platform ios

echo "==> Install CocoaPods dependencies"
cd ios
pod install --repo-update

echo "==> iOS dependencies ready"