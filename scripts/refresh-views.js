#!/usr/bin/env node
/**
 * Refresh Materialized Views
 * 
 * This script refreshes all materialized views in the database.
 * It should be run periodically (e.g., via a cron job) to keep the views up-to-date.
 * 
 * For Vercel deployment, set up a cron job using Vercel Cron Jobs:
 * https://vercel.com/docs/cron-jobs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Main function
async function main() {
  console.log('🔄 Refreshing materialized views...');
  
  try {
    // Get database connection string
    const dbUrl = readEnvVar('DATABASE_URL_UNPOOLED') || readEnvVar('DATABASE_URL') || 
                  readEnvVar('POSTGRES_URL_NON_POOLING') || readEnvVar('POSTGRES_URL');
    
    if (!dbUrl) {
      throw new Error('No DATABASE_URL found in environment or .env file');
    }
    
    console.log(`Using database URL: ${dbUrl.substring(0, 20)}...`);
    
    // Create SQL to refresh views
    const sql = `
      -- Refresh all materialized views via the refresh_all_views function
      SELECT refresh_all_views();
      
      -- Also explicitly refresh the dashboard view
      -- This is a fallback in case the function doesn't exist
      SELECT CASE 
        WHEN EXISTS(
          SELECT 1 FROM pg_proc WHERE proname = 'refresh_dashboard_view'
        ) 
        THEN (SELECT refresh_dashboard_view())
        ELSE NULL
      END;
    `;
    
    // Write SQL to temporary file
    const tmpFile = path.join(__dirname, 'temp-refresh.sql');
    fs.writeFileSync(tmpFile, sql);
    
    // Execute against the database
    console.log('Executing SQL to refresh views...');
    execSync(`psql "${dbUrl}" -f ${tmpFile}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(tmpFile);
    
    console.log('✅ Successfully refreshed all materialized views!');
  } catch (error) {
    console.error('❌ Error refreshing materialized views:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 