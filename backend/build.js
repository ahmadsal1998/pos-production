const esbuild = require('esbuild');
const { glob } = require('glob');
const path = require('path');
const fs = require('fs');

async function build() {
  // Find all TypeScript files in src
  const files = await glob('src/**/*.ts', { ignore: ['node_modules/**'] });
  
  // Create dist directory structure
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Build each file
  const buildPromises = files.map(async (file) => {
    const relativePath = path.relative('src', file);
    const outPath = path.join('dist', relativePath.replace(/\.ts$/, '.js'));
    const outDir = path.dirname(outPath);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    try {
      await esbuild.build({
        entryPoints: [file],
        outfile: outPath,
        platform: 'node',
        target: 'node20',
        format: 'cjs',
        bundle: false,
        sourcemap: false,
        minify: false,
      });
      console.log(`✓ Built ${file} -> ${outPath}`);
    } catch (error) {
      console.error(`✗ Failed to build ${file}:`, error.message);
      throw error;
    }
  });

  await Promise.all(buildPromises);
  
  // Verify critical files were built
  const criticalFiles = [
    'dist/utils/trialAccountModels.js',
    'dist/utils/productModel.js',
    'dist/utils/saleModel.js',
    'dist/utils/customerModel.js',
    'dist/index.js',
    'dist/server.js'
  ];
  
  let allFilesExist = true;
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Critical file missing: ${file}`);
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    console.error('\n❌ Build verification failed - some critical files are missing!');
    process.exit(1);
  }
  
  console.log('\n✅ Build completed successfully!');
  console.log('✅ All critical files verified');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

