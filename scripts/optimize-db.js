#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Running database optimizations...');

// Get the SQL file
const sqlFile = path.join(__dirname, 'add-performance-indexes.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Helper function to read environment variables from .env file
function readEnvVar(varName) {
  try {
    // Read .env file
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Find the variable
    const regex = new RegExp(`${varName}=["']?(.*?)["']?$`, 'm');
    const match = envContent.match(regex);
    
    // Return the value if found
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Check if it's in process.env
    if (process.env[varName]) {
      return process.env[varName];
    }
    
    return null;
  } catch (err) {
    console.error(`Error reading ${varName} from .env:`, err.message);
    return process.env[varName] || null;
  }
}

// Run against the database using environment variables
try {
  // Get database connection details from environment
  const dbUrl = readEnvVar('DATABASE_URL_UNPOOLED') || readEnvVar('DATABASE_URL') || 
                readEnvVar('POSTGRES_URL_NON_POOLING') || readEnvVar('POSTGRES_URL');
  
  if (!dbUrl) {
    console.error('❌ No DATABASE_URL found in environment or .env file');
    process.exit(1);
  }
  
  console.log(`Using database URL: ${dbUrl.substring(0, 20)}...`);
  
  // Run the SQL against the database
  console.log('🔧 Adding performance indexes and materialized views...');
  
  // Create a temporary file with the SQL
  const tmpFile = path.join(__dirname, 'temp-optimize.sql');
  fs.writeFileSync(tmpFile, sql);
  
  // Execute using psql
  execSync(`psql "${dbUrl}" -f ${tmpFile}`, { stdio: 'inherit' });
  
  // Clean up the temporary file
  fs.unlinkSync(tmpFile);
  
  console.log('✅ Database optimizations complete!');
  console.log('');
  console.log('IMPORTANT: You should refresh the materialized views regularly.');
  console.log('To do this, run the following SQL command:');
  console.log('    SELECT refresh_dashboard_view();');
  console.log('');
  console.log('Consider setting up a scheduled task to refresh these views daily.');
} catch (error) {
  console.error('❌ Error optimizing database:', error.message);
  process.exit(1);
} 