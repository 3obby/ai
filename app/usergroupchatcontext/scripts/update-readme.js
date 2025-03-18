#!/usr/bin/env node

// This script runs the generateReadme.js utility to update the README file
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const utilityPath = path.resolve(__dirname, '../utils/generateReadme.js');
const readmePath = path.resolve(__dirname, '../llm_copilot_overview_and_todo.md');
const part1Path = path.resolve(__dirname, '../utils/llm_copilot_part1.md');

console.log('Updating README...');

// Verify that the part1 file exists
if (!fs.existsSync(part1Path)) {
  console.error(`Error: Static content file not found at ${part1Path}`);
  process.exit(1);
}

try {
  // Create a backup of the existing README
  if (fs.existsSync(readmePath)) {
    const backupPath = `${readmePath}.bak`;
    fs.copyFileSync(readmePath, backupPath);
    console.log(`Backup created at ${backupPath}`);
  }

  // Run the JavaScript utility
  execSync(`node ${utilityPath}`, { stdio: 'inherit' });
  console.log('README update complete!');
  
  // Verify the update worked
  if (!fs.existsSync(readmePath)) {
    console.error('Error: README file was not created');
    process.exit(1);
  }
  
  const stats = fs.statSync(readmePath);
  if (stats.size < 1000) {
    console.error('Warning: README appears too small, may be incomplete');
  } else {
    console.log(`README updated successfully (${Math.round(stats.size / 1024)} KB)`);
  }
} catch (error) {
  console.error('Error updating README:', error.message);
  
  // Restore backup if something went wrong
  const backupPath = `${readmePath}.bak`;
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, readmePath);
    console.log('Previous README restored from backup');
  }
  
  process.exit(1);
} 