const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourcePath = 'C:/Users/ThinkPad X280/.gemini/antigravity-ide/brain/3576e2ba-c4f0-4624-b524-fb3f0b531c8e/.user_uploaded/media_1793218206982.jpg';
const publicDir = path.resolve(__dirname, '../apps/web/public');
const iconsDir = path.resolve(publicDir, 'icons');

async function generate() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error('Source file not found at ' + sourcePath);
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Generating app icons from:', sourcePath);

  // 1. 512x512 PNG
  const p512 = await sharp(sourcePath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), p512);
  fs.writeFileSync(path.join(iconsDir, 'app-icon.png'), p512);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), p512);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), p512);
  console.log('Created 512x512 icons (app-icon.png, icon-512.png, icon-maskable-512.png)');

  // 2. 192x192 PNG
  const p192 = await sharp(sourcePath)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 95 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), p192);
  console.log('Created 192x192 icon (icon-192.png)');

  // 3. 180x180 Apple Touch Icon
  const p180 = await sharp(sourcePath)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 95 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), p180);
  console.log('Created 180x180 icon (apple-touch-icon.png)');

  // 4. Create multi-resolution favicon.ico (16, 32, 48)
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(sourcePath)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer()
    )
  );

  // Pack PNGs into ICO container
  const numImages = sizes.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * numImages;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO Type
  header.writeUInt16LE(numImages, 4); // Number of images

  const dirEntries = [];
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const data = pngBuffers[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size < 256 ? size : 0, 0); // width
    entry.writeUInt8(size < 256 ? size : 0, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += data.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico with 16x16, 32x32, 48x48 frames');

  console.log('Successfully updated all app icons!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
