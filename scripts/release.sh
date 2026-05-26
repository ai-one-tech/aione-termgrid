#!/bin/bash

# TermGrid Local Release Script
# This script replicates the GitHub Actions release process locally.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it first.${NC}"
    exit 1
fi

VERSION=$(jq -r .version package.json)
ORIGINAL_PUBLISHER=$(jq -r .publisher package.json)

echo -e "${GREEN}Starting release process for version: $VERSION${NC}"

usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --package-only    Only create .vsix files (default)"
    echo "  --publish-vscode  Package and publish to VS Code Marketplace"
    echo "  --publish-ovsx    Package and publish to Open VSX"
    echo "  --publish-all     Package and publish to both"
    echo "  --help            Show this help message"
}

PACKAGE_ONLY=true
PUBLISH_VSCODE=false
PUBLISH_OVSX=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --package-only) PACKAGE_ONLY=true ;;
        --publish-vscode) PUBLISH_VSCODE=true; PACKAGE_ONLY=false ;;
        --publish-ovsx) PUBLISH_OVSX=true; PACKAGE_ONLY=false ;;
        --publish-all) PUBLISH_VSCODE=true; PUBLISH_OVSX=true; PACKAGE_ONLY=false ;;
        --help) usage; exit 0 ;;
        *) echo "Unknown parameter: $1"; usage; exit 1 ;;
    esac
    shift
done

# Cleanup
echo -e "${YELLOW}Cleaning up old build artifacts...${NC}"
rm -rf out dist *.vsix

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# 1. Package for VS Code (AiOne)
echo -e "${YELLOW}Packaging for VS Code (Publisher: $ORIGINAL_PUBLISHER)...${NC}"
npx vsce package --out termgrid-vsce-$VERSION.vsix

if [ "$PUBLISH_VSCODE" = true ]; then
    if [ -z "$VSCE_PAT" ]; then
        echo -e "${RED}Error: VSCE_PAT environment variable is not set.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Publishing to VS Code Marketplace...${NC}"
    npx vsce publish --packagePath termgrid-vsce-$VERSION.vsix -p "$VSCE_PAT"
fi

# 2. Package for Open VSX (AiOneTech)
echo -e "${YELLOW}Packaging for Open VSX (Publisher: AiOneTech)...${NC}"

# Backup package.json
cp package.json package.json.bak

# Change publisher
jq '.publisher = "AiOneTech"' package.json > package.json.tmp && mv package.json.tmp package.json

# Cleanup and package again for OVSX
rm -rf out dist
npx vsce package --out termgrid-ovsx-$VERSION.vsix

if [ "$PUBLISH_OVSX" = true ]; then
    if [ -z "$OVSX_PAT" ]; then
        echo -e "${RED}Error: OVSX_PAT environment variable is not set.${NC}"
        # Restore package.json before exiting
        mv package.json.bak package.json
        exit 1
    fi
    echo -e "${YELLOW}Publishing to Open VSX...${NC}"
    npx ovsx publish termgrid-ovsx-$VERSION.vsix -p "$OVSX_PAT"
fi

# Restore package.json
mv package.json.bak package.json

echo -e "${GREEN}Release process completed!${NC}"
echo -e "Artifacts created:"
ls -lh *.vsix
