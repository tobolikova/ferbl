#!/bin/bash
# Použití: ./bump.sh [patch|minor|major]  (výchozí: patch)
TYPE=${1:-patch}
CURRENT=$(grep "^const VERSION" game.js | grep -oP "\d+\.\d+\.\d+")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case $TYPE in
  major) MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR+1)); PATCH=0 ;;
  *)     PATCH=$((PATCH+1)) ;;
esac
NEW="$MAJOR.$MINOR.$PATCH"
sed -i "s/const VERSION = '$CURRENT'/const VERSION = '$NEW'/" game.js
git add game.js
git commit -m "v$NEW"
git tag "v$NEW"
echo "Verze zvýšena: $CURRENT → $NEW"
