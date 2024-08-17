const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const BASE_PATH= "./src/json-schema";
const OUT_PATH= `${BASE_PATH}/out`;

// Function to get all TypeScript files in a directory
function getTsFiles(dir) {
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.ts'))
    .map(file => [path.join(dir, file), file.replace(/\.ts$/, '')]);
}

// Function to run a command on a file
async function runCommandOnFile(filePath, fileName) {
  try {
    const outPath = `${OUT_PATH}/${fileName}.json`;
    const op = await execPromise(`npx typescript-json-schema -o "${outPath}" --required "${filePath}" "*"`);
    console.log(`Gen ${filePath} -> ${outPath}`);
    if (op.stdout) console.log(op.stdout);
    if (op.stderr) console.error(op.stderr);
  } catch (error) {
    console.error(`Error gen json schema for file ${fileName}:`, error);
  }
}

// Main function
(async function () {
  const directory = BASE_PATH + "/"; 

  const tsFiles = getTsFiles(directory);

  // Delete out directory if it exists
  if (fs.existsSync(OUT_PATH)) {
    fs.rmSync(OUT_PATH, { recursive: true, force: true });
    console.log(`Deleted existing directory: ${OUT_PATH}`);
  }
  // Create out directory
  fs.mkdirSync(OUT_PATH, { recursive: true });
  console.log(`Created directory: ${OUT_PATH}`);

  for (const [filePath, fileName] of tsFiles) {
    await runCommandOnFile(filePath, fileName);
  }
})();
