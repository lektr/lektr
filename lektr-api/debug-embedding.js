
const { pipeline, env } = require('@huggingface/transformers');
const fs = require('fs');
const path = require('path');

console.log('--- Debugging Embedding Generation ---');
console.log('Platform:', process.platform);
console.log('Arch:', process.arch);
console.log('Node Version:', process.version);

// Configure env
env.useBrowserCache = false;
env.allowRemoteModels = true;
env.allowLocalModels = true;

if (process.env.HF_HOME) {
  env.cacheDir = process.env.HF_HOME;
  console.log('HF_HOME env var:', process.env.HF_HOME);
} else {
  console.log('HF_HOME env var not set');
}

console.log('Effective Cache Dir:', env.cacheDir);

// Check if cache dir exists and is writable
try {
  if (!fs.existsSync(env.cacheDir)) {
    console.log(`Cache directory ${env.cacheDir} does not exist. Trying to create...`);
    fs.mkdirSync(env.cacheDir, { recursive: true });
    console.log('Created cache directory.');
  }
  fs.accessSync(env.cacheDir, fs.constants.W_OK);
  console.log('Cache directory is writable.');
} catch (err) {
  console.error('Cache directory issue:', err.message);
}

async function run() {
  try {
    console.log('Initializing pipeline...');
    // Try with default settings first
    const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        progress_callback: (p) => console.log('Progress:', p)
    });
    console.log('Pipeline initialized successfully.');

    console.log('Running inference...');
    const result = await pipe('This is a test sentence.', { pooling: 'mean', normalize: true });
    console.log('Inference successful. Output shape:', result.dims);
  } catch (err) {
    console.error('Pipeline failed:', err);
    console.error('Stack:', err.stack);
  }
}

run();
