#!/usr/bin/env node

import sharp from 'sharp';
import png2icons from 'png2icons';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const inputFile = path.join(projectRoot, 'assets', 'icons', 'icon.png');
const outputDir = path.join(projectRoot, 'build', 'icons');

const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

async function generatePNGs() {
  console.log('Generating PNG icons...');

  await ensureDirectoryExists(outputDir);
  await ensureDirectoryExists(path.join(outputDir, 'png'));

  for (const size of sizes) {
    const outputFile = path.join(outputDir, 'png', `${size}x${size}.png`);
    const flatOutputFile = path.join(outputDir, `${size}x${size}.png`);

    await sharp(inputFile).resize(size, size).toFile(outputFile);

    // Also save in flat structure for electron-builder
    await sharp(inputFile).resize(size, size).toFile(flatOutputFile);

    console.log(`  Generated ${size}x${size}.png`);
  }
}

async function generateICNS() {
  console.log('Generating macOS icon (.icns)...');

  const input = await fs.readFile(inputFile);
  const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0, false, true);

  if (icns) {
    await ensureDirectoryExists(path.join(outputDir, 'mac'));
    await fs.writeFile(path.join(outputDir, 'mac', 'icon.icns'), icns);
    // Also save in root for compatibility
    await fs.writeFile(path.join(outputDir, 'icon.icns'), icns);
    console.log('  Generated icon.icns');
  } else {
    console.error('  Failed to generate ICNS file');
  }
}

async function generateICO() {
  console.log('Generating Windows icon (.ico)...');

  const input = await fs.readFile(inputFile);
  const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, false, true);

  if (ico) {
    await ensureDirectoryExists(path.join(outputDir, 'win'));
    await fs.writeFile(path.join(outputDir, 'win', 'icon.ico'), ico);
    // Also save in root for compatibility
    await fs.writeFile(path.join(outputDir, 'icon.ico'), ico);
    console.log('  Generated icon.ico');
  } else {
    console.error('  Failed to generate ICO file');
  }
}

async function main() {
  try {
    console.log('Starting icon generation...');
    console.log(`Input file: ${inputFile}`);
    console.log(`Output directory: ${outputDir}`);

    // Check if input file exists
    try {
      await fs.access(inputFile);
    } catch (error) {
      console.error(`Input file not found: ${inputFile}`);
      process.exit(1);
    }

    // Generate all icon formats
    await generatePNGs();
    await generateICNS();
    await generateICO();

    console.log('Icon generation completed successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
