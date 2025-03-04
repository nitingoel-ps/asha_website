const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing missing dependencies for AI Chat component...');

// Run npm install for the required packages
const packages = [
  'react-syntax-highlighter',
  'remark-gfm',
  'katex'
];

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Run npm install
const installProcess = spawn('npm', ['install', '--save', ...packages], { stdio: 'inherit' });

installProcess.on('close', (code) => {
  if (code === 0) {
    console.log('Dependencies installed successfully!');
    console.log('You can now restart your development server.');
  } else {
    console.error(`Failed to install dependencies (exit code: ${code})`);
    console.log('Please manually install these packages with:');
    console.log(`npm install --save ${packages.join(' ')}`);
  }
});
