#!/bin/bash

set -e

echo "==> Node"
node --version

echo "==> Corepack"
corepack enable

echo "==> pnpm"
corepack prepare pnpm@9.4.0 --activate
pnpm --version

echo "==> Install dependencies"
pnpm install --frozen-lockfile

echo "==> Expo prebuild"
pnpm exec expo prebuild --platform ios