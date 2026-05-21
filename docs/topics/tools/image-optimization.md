---
summary: "Image compression tool choices and baseline commands for PNG, JPEG, GIF, WebP, AVIF, JPEG XL, and SVG."
read_when:
  - Need to compress or optimize image assets.
  - Need to choose an image optimizer or codec.
  - Need a safe default command for image size reduction.
---

# Image Optimization

Goal: pick the smallest safe optimizer for the image format before reaching for a broad converter.

## Tool Choice

- PNG lossless: `oxipng`
- PNG lossy/palette: `pngquant`, then `oxipng`
- Strongest PNG lossless: `zopflipng` for final assets; slower than `oxipng`
- JPEG lossless: `jpegoptim` or `jpegtran`
- JPEG encode: `mozjpeg` (`cjpeg`) for web output; `jpeg-turbo` for fast general JPEG work
- GIF: `gifsicle`
- SVG: `svgo`
- WebP: `cwebp`
- AVIF: `avifenc`
- JPEG XL: `cjxl`
- Batch resize/convert: `vips`
- Metadata inspect/strip: `exiftool`
- Broad fallback: `magick`
- GUI/bulk final pass on macOS: `ImageOptim`

## Baseline Commands

```bash
# PNG lossless
oxipng -o 4 --strip safe image.png

# PNG palette/lossy, then lossless pack
pngquant --quality 75-95 --ext .png --force image.png
oxipng -o 4 --strip safe image.png

# Strong PNG lossless final pass
zopflipng -y image.png image.png

# JPEG lossless + metadata strip
jpegoptim --strip-all image.jpg

# GIF
gifsicle -O3 --batch image.gif

# SVG
svgo image.svg

# WebP / AVIF / JPEG XL web encodes
cwebp -q 82 input.png -o output.webp
avifenc --min 20 --max 35 input.png output.avif
cjxl input.png output.jxl -q 85
```

## Notes

- Use lossless tools for source assets unless the task explicitly allows visual loss.
- Keep original source files when producing alternate delivery formats (`webp`, `avif`, `jxl`).
- For large batches, prefer `vips` over `magick` for resize/convert throughput.
