#!/bin/sh
# Regenerates public/ icons from the inline SVG below. Requires ImageMagick.
set -e
cd "$(dirname "$0")/.."
mkdir -p public

cat > /tmp/training-icon.svg <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a84ff"/>
  <g fill="#ffffff">
    <rect x="150" y="240" width="212" height="32" rx="16"/>
    <rect x="118" y="176" width="46" height="160" rx="20"/>
    <rect x="348" y="176" width="46" height="160" rx="20"/>
    <rect x="64"  y="208" width="38" height="96" rx="17"/>
    <rect x="410" y="208" width="38" height="96" rx="17"/>
  </g>
</svg>
SVG

magick -background none /tmp/training-icon.svg -resize 512x512 public/icon-512.png
magick -background none /tmp/training-icon.svg -resize 192x192 public/icon-192.png
magick -background none /tmp/training-icon.svg -resize 180x180 public/apple-touch-icon.png
echo "icons written to public/"
