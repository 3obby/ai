/**
 * Optimization Executor
 * 
 * This script runs all performance optimizations in sequence.
 * Run this script to apply all the performance improvements.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import applyDatabaseOptimizations from './db-performance-fixes';
import { generateStaticCache } from './static-data-cache';
import refreshJob from './refresh-cron';

// Log helper
const log = {
  info: (message: string) => console.log(`ℹ️ ${message}`),
  success: (message: string) => console.log(`✅ ${message}`),
  warning: (message: string) => console.log(`⚠️ ${message}`),
  error: (message: string) => console.error(`❌ ${message}`)
};

// Execute a shell command and return its output
async function execute(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    log.info(`Executing: ${command}`);
    
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, { shell: true });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

// Copy a file with verification
async function copyFile(source: string, destination: string): Promise<boolean> {
  try {
    await fs.copyFile(source, destination);
    log.success(`Copied ${source} to ${destination}`);
    return true;
  } catch (error) {
    log.error(`Failed to copy ${source}: ${error}`);
    return false;
  }
}

// Main optimization function
async function runOptimizations(): Promise<void> {
  const startTime = Date.now();
  log.info('Starting performance optimizations...');
  
  try {
    // Step 1: Apply database optimizations
    log.info('Running database optimizations...');
    const dbResult = await applyDatabaseOptimizations();
    if (dbResult) {
      log.success('Database optimizations completed successfully');
    } else {
      log.warning('Database optimizations had some issues - see logs above');
    }
    
    // Step 2: Generate static cache
    log.info('Generating static cache for anonymous users...');
    const cacheResult = await generateStaticCache();
    if (cacheResult) {
      log.success('Static cache generated successfully');
    } else {
      log.warning('Static cache generation had issues - see logs above');
    }
    
    // Step 3: Replace the dashboard prefetch API
    log.info('Updating dashboard prefetch API implementation...');
    const sourcePath = path.join(process.cwd(), 'optimizations/optimized-dashboard-prefetch.ts');
    const destPath = path.join(process.cwd(), 'app/api/dashboard/prefetch/route.ts');
    
    // Create backup first
    await fs.copyFile(destPath, `${destPath}.bak`);
    log.success(`Created backup at ${destPath}.bak`);
    
    // Now copy the new implementation
    const apiResult = await copyFile(sourcePath, destPath);
    if (!apiResult) {
      throw new Error('Failed to update dashboard prefetch API');
    }
    
    // Step 4: Update Redis caching
    log.info('Updating Redis caching implementation...');
    const redisSrc = path.join(process.cwd(), 'optimizations/optimized-redis-cache.ts');
    const redisDest = path.join(process.cwd(), 'lib/redis-cache.ts');
    
    // Create backup
    await fs.copyFile(redisDest, `${redisDest}.bak`);
    log.success(`Created backup at ${redisDest}.bak`);
    
    // Copy new implementation
    const redisResult = await copyFile(redisSrc, redisDest);
    if (!redisResult) {
      throw new Error('Failed to update Redis caching implementation');
    }
    
    // Step 5: Set up cron job for Vercel
    log.info('Setting up cron job for materialized view refresh...');
    const vercelConfig = path.join(process.cwd(), 'vercel.json');
    
    try {
      // Check if vercel.json exists
      await fs.access(vercelConfig);
      
      // Read current config
      const configContent = await fs.readFile(vercelConfig, 'utf8');
      const config = JSON.parse(configContent);
      
      // Add or update cron configuration
      config.crons = config.crons || [];
      
      // Check if cron already exists
      const cronExists = config.crons.some((cron: any) => 
        cron.path === '/api/cron/refresh-views'
      );
      
      if (!cronExists) {
        config.crons.push({
          path: '/api/cron/refresh-views',
          schedule: '0 */6 * * *' // Every 6 hours
        });
        
        // Write updated config
        await fs.writeFile(vercelConfig, JSON.stringify(config, null, 2));
        log.success('Added cron job to vercel.json');
      } else {
        log.info('Cron job already exists in vercel.json');
      }
    } catch (error) {
      log.warning(`Could not update Vercel cron config: ${error}`);
      log.info('Please manually add a cron job for /api/cron/refresh-views');
    }
    
    // Step 6: Run an initial refresh
    log.info('Running initial refresh job...');
    await refreshJob();
    
    // Complete!
    const duration = (Date.now() - startTime) / 1000;
    log.success(`All optimizations completed in ${duration.toFixed(2)} seconds!`);
    
    log.info('Next steps:');
    log.info('1. Rebuild and deploy the application');
    log.info('2. Monitor performance after deployment');
    log.info('3. Check logs for any errors during initial load');
    
  } catch (error) {
    log.error(`Optimization process failed: ${error}`);
    log.info('Please check the logs above for specific issues');
    log.info('You may need to restore from backups if partial changes were applied');
    
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  runOptimizations().catch(error => {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  });
}

export default runOptimizations; 