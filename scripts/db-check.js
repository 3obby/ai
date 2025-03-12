#!/usr/bin/env node
/**
 * Database Connectivity Checker
 * 
 * This script provides a comprehensive check of database connectivity
 * and diagnoses common issues with connection stability.
 */

const { PrismaClient } = require('@prisma/client');
const dns = require('dns');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Extract database connection details from DATABASE_URL
function extractDatabaseDetails() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error(`${colors.red}${colors.bold}Error:${colors.reset} .env.local file not found`);
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=["']?(.*?)["']?\s/);
  
  if (!dbUrlMatch) {
    console.error(`${colors.red}${colors.bold}Error:${colors.reset} DATABASE_URL not found in .env.local`);
    return null;
  }
  
  const url = dbUrlMatch[1];
  
  try {
    // Try to extract components from the connection string
    // Format could be: postgres://username:password@hostname:port/database?params
    // or postgresql://username:password@hostname:port/database?params
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const port = urlObj.port || '5432';
    const database = urlObj.pathname.replace(/^\//, '');
    const params = urlObj.search || '';
    const username = urlObj.username;
    const password = urlObj.password;
    
    console.log(`${colors.green}✓ Successfully parsed database connection string${colors.reset}`);
    
    return {
      username,
      password,
      hostname,
      port: parseInt(port),
      database,
      params,
      url
    };
  } catch (error) {
    console.error(`${colors.red}${colors.bold}Error:${colors.reset} Failed to parse connection string: ${error.message}`);
    console.error(`${colors.yellow}Attempting to continue with limited information${colors.reset}`);
    
    // Try to extract at least the hostname and port with regex as fallback
    const hostMatch = url.match(/@([^:@]+):(\d+)/);
    if (hostMatch) {
      const hostname = hostMatch[1];
      const port = parseInt(hostMatch[2]);
      
      return {
        username: 'unknown',
        password: 'unknown',
        hostname,
        port,
        database: 'unknown',
        params: '',
        url
      };
    }
    
    return null;
  }
}

// Check DNS resolution
async function checkDNS(hostname) {
  console.log(`\n${colors.cyan}${colors.bold}Checking DNS resolution for ${hostname}...${colors.reset}`);
  
  return new Promise(resolve => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error(`${colors.red}✘ DNS resolution failed: ${err.message}${colors.reset}`);
        resolve(false);
      } else {
        console.log(`${colors.green}✓ DNS resolved to: ${address}${colors.reset}`);
        resolve(true);
      }
    });
  });
}

// Check TCP connectivity
async function checkTCPConnection(hostname, port) {
  console.log(`\n${colors.cyan}${colors.bold}Checking TCP connectivity to ${hostname}:${port}...${colors.reset}`);
  
  return new Promise(resolve => {
    const socket = new net.Socket();
    let connected = false;
    
    // Set a timeout for the connection attempt
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`${colors.green}✓ TCP connection successful${colors.reset}`);
      connected = true;
      socket.end();
    });
    
    socket.on('timeout', () => {
      console.error(`${colors.red}✘ TCP connection timed out${colors.reset}`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (err) => {
      console.error(`${colors.red}✘ TCP connection failed: ${err.message}${colors.reset}`);
      resolve(false);
    });
    
    socket.on('close', () => {
      if (connected) {
        resolve(true);
      }
    });
    
    socket.connect(port, hostname);
  });
}

// Test database connection
async function testDatabaseConnection(db) {
  console.log(`\n${colors.cyan}${colors.bold}Testing PostgreSQL connection...${colors.reset}`);
  
  const startTime = Date.now();
  const prisma = new PrismaClient();
  
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    
    console.log('Executing a simple query...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    const duration = Date.now() - startTime;
    console.log(`${colors.green}✓ Database connection successful (${duration}ms)${colors.reset}`);
    console.log(`${colors.green}✓ Query result: ${JSON.stringify(result)}${colors.reset}`);
    
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${colors.red}✘ Database connection failed after ${duration}ms${colors.reset}`);
    console.error(`${colors.red}✘ Error: ${error.message}${colors.reset}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Check connection parameters
function checkConnectionParameters(db) {
  console.log(`\n${colors.cyan}${colors.bold}Checking connection parameters...${colors.reset}`);
  
  const params = db.params;
  const recommendations = [];
  
  if (!params.includes('connect_timeout=')) {
    recommendations.push('Add connect_timeout=60 to increase connection timeout');
  } else if (params.includes('connect_timeout=') && !params.includes('connect_timeout=60')) {
    recommendations.push('Increase connect_timeout to 60 seconds for better reliability');
  }
  
  if (!params.includes('keepalives=1')) {
    recommendations.push('Add keepalives=1 to maintain connection stability');
  }
  
  if (!params.includes('application_name=')) {
    recommendations.push('Add application_name=local_dev for better monitoring');
  }
  
  if (!params.includes('keepalives_idle=')) {
    recommendations.push('Add keepalives_idle=60 to maintain idle connections');
  }
  
  if (!params.includes('statement_timeout=')) {
    recommendations.push('Add statement_timeout=60000 to prevent hanging queries');
  }
  
  if (recommendations.length > 0) {
    console.log(`${colors.yellow}⚠ Connection parameter recommendations:${colors.reset}`);
    recommendations.forEach(rec => {
      console.log(`${colors.yellow}  - ${rec}${colors.reset}`);
    });
  } else {
    console.log(`${colors.green}✓ All recommended connection parameters are present${colors.reset}`);
  }
  
  return recommendations;
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log(`\n${colors.cyan}${colors.bold}Checking environment variables...${colors.reset}`);
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error(`${colors.red}✘ .env.local file not found${colors.reset}`);
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const recommendations = [];
  
  // Check for retry settings
  if (!envContent.includes('ENABLE_DB_CONNECTION_RETRIES=true')) {
    recommendations.push('Add ENABLE_DB_CONNECTION_RETRIES=true to enable connection retries');
  }
  
  if (!envContent.includes('DB_MAX_RETRIES=')) {
    recommendations.push('Add DB_MAX_RETRIES=5 to set maximum retry attempts');
  }
  
  if (!envContent.includes('DB_RETRY_DELAY_MS=')) {
    recommendations.push('Add DB_RETRY_DELAY_MS=1000 to set delay between retries');
  }
  
  if (recommendations.length > 0) {
    console.log(`${colors.yellow}⚠ Environment variable recommendations:${colors.reset}`);
    recommendations.forEach(rec => {
      console.log(`${colors.yellow}  - ${rec}${colors.reset}`);
    });
  } else {
    console.log(`${colors.green}✓ All recommended environment variables are present${colors.reset}`);
  }
  
  return recommendations;
}

// Main function
async function main() {
  console.log(`${colors.bold}${colors.blue}=== DATABASE CONNECTIVITY CHECK ====${colors.reset}\n`);
  
  // Extract database connection details
  const db = extractDatabaseDetails();
  if (!db) {
    return;
  }
  
  console.log(`${colors.bold}Database Host:${colors.reset} ${db.hostname}`);
  console.log(`${colors.bold}Database Port:${colors.reset} ${db.port}`);
  console.log(`${colors.bold}Database Name:${colors.reset} ${db.database}`);
  
  // Check DNS resolution
  const dnsOk = await checkDNS(db.hostname);
  
  // Check TCP connectivity
  const tcpOk = await checkTCPConnection(db.hostname, db.port);
  
  // Check database connection
  const dbOk = await testDatabaseConnection(db);
  
  // Check connection parameters
  const paramRecommendations = checkConnectionParameters(db);
  
  // Check environment variables
  const envRecommendations = checkEnvironmentVariables();
  
  // Summary
  console.log(`\n${colors.bold}${colors.blue}=== SUMMARY ====${colors.reset}\n`);
  
  console.log(`${colors.bold}DNS Resolution:${colors.reset} ${dnsOk ? colors.green + '✓ OK' : colors.red + '✘ FAILED'}${colors.reset}`);
  console.log(`${colors.bold}TCP Connectivity:${colors.reset} ${tcpOk ? colors.green + '✓ OK' : colors.red + '✘ FAILED'}${colors.reset}`);
  console.log(`${colors.bold}Database Connection:${colors.reset} ${dbOk ? colors.green + '✓ OK' : colors.red + '✘ FAILED'}${colors.reset}`);
  console.log(`${colors.bold}Connection Parameters:${colors.reset} ${paramRecommendations.length === 0 ? colors.green + '✓ OK' : colors.yellow + '⚠ IMPROVEMENTS SUGGESTED'}${colors.reset}`);
  console.log(`${colors.bold}Environment Variables:${colors.reset} ${envRecommendations.length === 0 ? colors.green + '✓ OK' : colors.yellow + '⚠ IMPROVEMENTS SUGGESTED'}${colors.reset}`);
  
  if (!dnsOk || !tcpOk || !dbOk) {
    console.log(`\n${colors.red}${colors.bold}CONNECTIVITY ISSUES DETECTED${colors.reset}\n`);
    
    // Provide actionable recommendations
    if (!dnsOk) {
      console.log(`${colors.yellow}${colors.bold}DNS Resolution Recommendations:${colors.reset}`);
      console.log(`- Check if the hostname ${colors.bold}${db.hostname}${colors.reset} is correct in .env.local`);
      console.log(`- Try using an IP address instead of a hostname`);
      console.log(`- Check your network DNS settings`);
    }
    
    if (!tcpOk) {
      console.log(`\n${colors.yellow}${colors.bold}TCP Connectivity Recommendations:${colors.reset}`);
      console.log(`- Verify the database is running and accessible on port ${colors.bold}${db.port}${colors.reset}`);
      console.log(`- Check if a firewall is blocking the connection`);
      console.log(`- Verify your VPN settings if you're using one`);
      console.log(`- Try connecting from a different network`);
    }
    
    if (!dbOk) {
      console.log(`\n${colors.yellow}${colors.bold}Database Connection Recommendations:${colors.reset}`);
      console.log(`- Verify username and password are correct`);
      console.log(`- Check if the database ${colors.bold}${db.database}${colors.reset} exists`);
      console.log(`- Run ${colors.bold}node scripts/optimize-dev.js${colors.reset} to optimize connection settings`);
      console.log(`- Consider setting up a local database for development`);
    }
  } else {
    console.log(`\n${colors.green}${colors.bold}ALL CONNECTIVITY CHECKS PASSED${colors.reset}\n`);
    
    if (paramRecommendations.length > 0 || envRecommendations.length > 0) {
      console.log(`${colors.yellow}${colors.bold}Recommendations for improved reliability:${colors.reset}`);
      console.log(`- Run ${colors.bold}node scripts/optimize-dev.js${colors.reset} to automatically apply all recommended changes`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }); 