const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Background color matching the deep royal burgundy corners of the official logo
const BRAND_BURGUNDY = "#4B030E";

async function generateBrandIcons() {
  const rootDir = path.join(__dirname, "..");
  const publicDir = path.join(rootDir, "public");
  const iconsDir = path.join(publicDir, "icons");

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Determine master source image
  let masterSource = path.join(publicDir, "images", "tareq-logo.png");
  if (!fs.existsSync(masterSource)) {
    masterSource = path.join(rootDir, "Logo.png.jpeg");
  }

  console.log("Using master source image:", masterSource);

  // 1. Export official high-res logo to public/logo.png and root logo.png
  await sharp(masterSource)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, "logo.png"));

  await sharp(masterSource)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(rootDir, "logo.png"));

  console.log("✓ Saved public/logo.png and root logo.png");

  // 2. Generate Standard PWA Icons (Purpose: "any")
  // 192x192 and 512x512
  const icon192Buffer = await sharp(masterSource)
    .resize(192, 192, { fit: "contain", background: { r: 75, g: 3, b: 14, alpha: 1 } })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, "icon-192x192.png"), icon192Buffer);

  const icon512Buffer = await sharp(masterSource)
    .resize(512, 512, { fit: "contain", background: { r: 75, g: 3, b: 14, alpha: 1 } })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, "icon-512x512.png"), icon512Buffer);
  console.log("✓ Generated standard icons: icon-192x192.png, icon-512x512.png");

  // 3. Generate Maskable Icons with 15% Safe Zone padding for Android
  // In maskable icons, the outer 20% can be cropped by adaptive icon shapes.
  // We scale the logo to ~80% of canvas and center on solid brand burgundy canvas.
  async function createMaskableIcon(size) {
    const contentSize = Math.round(size * 0.80);
    const resizedLogo = await sharp(masterSource)
      .resize(contentSize, contentSize, { fit: "contain" })
      .png()
      .toBuffer();

    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BRAND_BURGUNDY,
      },
    })
      .composite([
        {
          input: resizedLogo,
          gravity: "center",
        },
      ])
      .png({ quality: 95, compressionLevel: 9 })
      .toBuffer();
  }

  const maskable512Buffer = await createMaskableIcon(512);
  fs.writeFileSync(path.join(iconsDir, "maskable-icon-512x512.png"), maskable512Buffer);
  fs.writeFileSync(path.join(iconsDir, "icon-maskable-512x512.png"), maskable512Buffer);

  const maskable192Buffer = await createMaskableIcon(192);
  fs.writeFileSync(path.join(iconsDir, "icon-maskable-192x192.png"), maskable192Buffer);
  console.log("✓ Generated maskable icons with safe zone margins");

  // 4. Generate Apple Touch Icon (180x180 for iOS Safari & Home Screen)
  const appleTouchBuffer = await sharp(masterSource)
    .resize(180, 180, { fit: "contain", background: { r: 75, g: 3, b: 14, alpha: 1 } })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleTouchBuffer);
  fs.writeFileSync(path.join(iconsDir, "apple-touch-icon.png"), appleTouchBuffer);
  console.log("✓ Generated apple-touch-icon.png (180x180)");

  // 5. Generate Favicons (PNG: 48x48, 32x32, 16x16 and Multi-res ICO)
  const fav48Buffer = await sharp(masterSource)
    .resize(48, 48, { fit: "contain", background: { r: 75, g: 3, b: 14, alpha: 1 } })
    .png()
    .toBuffer();

  const fav32Buffer = await sharp(masterSource)
    .resize(32, 32, { fit: "contain", background: { r: 75, g: 3, b: 14, alpha: 1 } })
    .png()
    .toBuffer();

  const fav16Buffer = await sharp(masterSource)
    .resize(16, 16, { fit: "contain", background: { r: 75, g: 3, b: 14, alpha: 1 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, "favicon.png"), fav48Buffer);
  fs.writeFileSync(path.join(iconsDir, "favicon.png"), fav48Buffer);

  // Build standard multi-resolution ICO file (16x16, 32x32, 48x48)
  const images = [
    { size: 16, buf: fav16Buffer },
    { size: 32, buf: fav32Buffer },
    { size: 48, buf: fav48Buffer },
  ];

  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * images.length;

  const icoHeader = Buffer.alloc(headerSize);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // icon type
  icoHeader.writeUInt16LE(images.length, 4); // number of images

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(img.size, 0); // width
    entry.writeUInt8(img.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buf.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += img.buf.length;
  }

  const icoBuffer = Buffer.concat([
    icoHeader,
    ...entries,
    ...images.map((img) => img.buf),
  ]);

  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(rootDir, "app", "favicon.ico"), icoBuffer);
  console.log("✓ Generated multi-size favicon.ico and favicon.png");

  console.log("\n🎉 All PWA icons generated successfully from official Tareq Center logo!");
}

generateBrandIcons().catch((err) => {
  console.error("Error generating brand icons:", err);
  process.exit(1);
});
