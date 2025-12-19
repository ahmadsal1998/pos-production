const esbuild = require('esbuild');
const { glob } = require('glob');
const path = require('path');
const fs = require('fs');

async function build() {
  // Find all TypeScript files in src
  const files = await glob('src/**/*.ts', { ignore: ['node_modules/**'] });
  
  // Debug: Check if trialAccountModels is found
  const trialFile = files.find(f => f.includes('trialAccountModels'));
  if (trialFile) {
    console.log(`✓ Found trialAccountModels.ts: ${trialFile}`);
  } else {
    console.error(`❌ trialAccountModels.ts NOT FOUND in glob results!`);
    console.error(`Total files found: ${files.length}`);
    console.error(`Sample files: ${files.slice(0, 5).join(', ')}`);
  }
  
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
      
      // Verify file was actually created
      if (!fs.existsSync(outPath)) {
        throw new Error(`Build succeeded but output file not found: ${outPath}`);
      }
    } catch (error) {
      console.error(`✗ Failed to build ${file}:`, error.message);
      throw error;
    }
  });

  await Promise.all(buildPromises);
  
  // Debug: List all built files in dist/utils
  const distUtilsDir = path.join(process.cwd(), 'dist', 'utils');
  if (fs.existsSync(distUtilsDir)) {
    const builtFiles = fs.readdirSync(distUtilsDir).filter(f => f.endsWith('.js'));
    console.log(`\n📁 Built files in dist/utils: ${builtFiles.join(', ')}`);
  }
  
  // Small delay to ensure all file system writes are complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify critical files were built
  const criticalFiles = [
    'dist/utils/trialAccountModels.js',
    'dist/utils/productModel.js',
    'dist/utils/saleModel.js',
    'dist/utils/customerModel.js',
    'dist/index.js',
    'dist/server.js'
  ];
  
  const cwd = process.cwd();
  console.log(`\n🔍 Verifying files in: ${cwd}`);
  
  let allFilesExist = true;
  const missingFiles = [];
  
  for (const file of criticalFiles) {
    const filePath = path.join(cwd, file);
    const exists = fs.existsSync(filePath);
    
    if (!exists) {
      console.error(`❌ Critical file missing: ${file}`);
      console.error(`   Expected at: ${filePath}`);
      console.error(`   Directory exists: ${fs.existsSync(path.dirname(filePath))}`);
      allFilesExist = false;
      missingFiles.push(file);
    } else {
      console.log(`✓ Verified: ${file}`);
    }
  }
  
  if (!allFilesExist) {
    console.error(`\n❌ Build verification failed - ${missingFiles.length} critical file(s) missing!`);
    console.error(`Missing files: ${missingFiles.join(', ')}`);
    
    // Try to find similar files (case sensitivity check)
    if (missingFiles.includes('dist/utils/trialAccountModels.js')) {
      const utilsDir = path.join(cwd, 'dist', 'utils');
      if (fs.existsSync(utilsDir)) {
        const allUtilsFiles = fs.readdirSync(utilsDir);
        const similarFiles = allUtilsFiles.filter(f => 
          f.toLowerCase().includes('trial') || f.toLowerCase().includes('account')
        );
        if (similarFiles.length > 0) {
          console.error(`   Found similar files: ${similarFiles.join(', ')}`);
        }
      }
    }
    
    process.exit(1);
  }
  
  console.log('\n✅ Build completed successfully!');
  console.log('✅ All critical files verified');
}

build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

