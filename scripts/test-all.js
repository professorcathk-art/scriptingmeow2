/**
 * Comprehensive health check and function testing
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const fs = require('fs');
const path = require('path');

// Read .env.local manually
try {
  const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  });
} catch (e) {
  // .env.local might not exist, that's okay
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

async function checkServer() {
  logSection('1. Server Status Check');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      log(`✓ Server is running at ${BASE_URL}`, 'green');
      log(`  Status: ${data.status}`, data.status === 'healthy' ? 'green' : 'yellow');
      log(`  Timestamp: ${data.timestamp}`);
      console.log('  Checks:', JSON.stringify(data.checks, null, 2));
      return data;
    } else {
      log(`✗ Server returned error: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ Server not accessible: ${error.message}`, 'red');
    log(`  Make sure dev server is running: npm run dev`, 'yellow');
    return null;
  }
}

async function checkEnvironment() {
  logSection('2. Environment Variables Check');
  const required = {
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  let allPresent = true;
  for (const [key, value] of Object.entries(required)) {
    if (value && value !== 'your_supabase_url' && value !== 'your_supabase_anon_key') {
      log(`✓ ${key}: Set (${value.substring(0, 20)}...)`, 'green');
    } else {
      log(`✗ ${key}: Missing or placeholder`, 'red');
      allPresent = false;
    }
  }
  return allPresent;
}

async function checkGeminiAPI() {
  logSection('3. Gemini API Check');
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'your_gemini_api_key') {
    log('✗ Gemini API key not configured', 'red');
    return false;
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    // Try different model names
    const modelNames = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
    let model = null;
    let lastError = null;
    
    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "Hello"');
        const response = await result.response;
        const text = response.text();
        log(`✓ Gemini API is working (using ${modelName})`, 'green');
        log(`  Test response: ${text.trim()}`);
        return true;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    
    throw lastError;
    
    log('  Testing Gemini API connection...', 'yellow');
    const result = await model.generateContent('Say "Hello" in one word');
    const response = await result.response;
    const text = response.text();
    
    log(`✓ Gemini API is working`, 'green');
    log(`  Test response: ${text.trim()}`);
    return true;
  } catch (error) {
    log(`✗ Gemini API test failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkEndpoints() {
  logSection('4. API Endpoints Check');
  const endpoints = [
    { path: '/api/health', method: 'GET', auth: false },
    { path: '/api/brand-spaces', method: 'POST', auth: true },
    { path: '/api/brandbooks/generate', method: 'POST', auth: true },
    { path: '/api/posts/generate', method: 'POST', auth: true },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: endpoint.auth ? { 'Content-Type': 'application/json' } : {},
        body: endpoint.auth ? JSON.stringify({}) : undefined,
      });

      if (response.status === 401 && endpoint.auth) {
        log(`✓ ${endpoint.path}: Protected (401 Unauthorized - expected)`, 'green');
      } else if (response.status === 400 || response.status === 500) {
        log(`⚠ ${endpoint.path}: Responds but needs valid data (${response.status})`, 'yellow');
      } else if (response.ok) {
        log(`✓ ${endpoint.path}: Working (${response.status})`, 'green');
      } else {
        log(`✗ ${endpoint.path}: Error (${response.status})`, 'red');
      }
    } catch (error) {
      log(`✗ ${endpoint.path}: ${error.message}`, 'red');
    }
  }
}

async function checkPages() {
  logSection('5. Page Routes Check');
  const pages = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/dashboard',
    '/brand-spaces',
    '/create-post',
    '/library',
    '/billing',
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`${BASE_URL}${page}`);
      if (response.status === 200 || response.status === 307 || response.status === 308) {
        log(`✓ ${page}: Accessible (${response.status})`, 'green');
      } else if (response.status === 401 || response.status === 403) {
        log(`⚠ ${page}: Protected (${response.status} - expected for auth pages)`, 'yellow');
      } else {
        log(`✗ ${page}: Error (${response.status})`, 'red');
      }
    } catch (error) {
      log(`✗ ${page}: ${error.message}`, 'red');
    }
  }
}

async function checkBuild() {
  logSection('6. Build Check');
  const { execSync } = require('child_process');
  
  try {
    log('  Running build check...', 'yellow');
    const output = execSync('npm run build 2>&1', { 
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    if (output.includes('Compiled successfully') || output.includes('✓ Compiled')) {
      log('✓ Build successful', 'green');
      return true;
    } else {
      log('✗ Build failed', 'red');
      console.log(output);
      return false;
    }
  } catch (error) {
    log('✗ Build check failed', 'red');
    console.log(error.message);
    return false;
  }
}

async function checkFileStructure() {
  logSection('7. File Structure Check');
  const fs = require('fs');
  const path = require('path');
  
  const criticalFiles = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'tailwind.config.ts',
    '.env.local',
    'app/layout.tsx',
    'app/page.tsx',
    'middleware.ts',
    'lib/ai/gemini.ts',
    'lib/ai/imagen.ts',
    'types/database.ts',
    'supabase/migrations/001_initial_schema.sql',
  ];

  let allPresent = true;
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log(`✓ ${file}`, 'green');
    } else {
      log(`✗ ${file}: Missing`, 'red');
      allPresent = false;
    }
  }
  return allPresent;
}

async function runAllChecks() {
  console.log('\n');
  log('🚀 Starting Comprehensive Health Check', 'blue');
  console.log('\n');

  const results = {
    server: false,
    environment: false,
    gemini: false,
    build: false,
    files: false,
  };

  // Check file structure first (doesn't need server)
  results.files = await checkFileStructure();

  // Check if server is running
  const healthData = await checkServer();
  results.server = healthData !== null;

  // Check environment
  results.environment = await checkEnvironment();

  // Check Gemini API (doesn't need server)
  results.gemini = await checkGeminiAPI();

  // Check endpoints (needs server)
  if (results.server) {
    await checkEndpoints();
    await checkPages();
  } else {
    log('\n⚠ Skipping endpoint checks (server not running)', 'yellow');
  }

  // Check build (doesn't need server)
  results.build = await checkBuild();

  // Summary
  logSection('Summary');
  const allChecks = Object.values(results);
  const passed = allChecks.filter(Boolean).length;
  const total = allChecks.length;

  log(`\nTests Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  console.log('\nResults:');
  Object.entries(results).forEach(([key, value]) => {
    log(`  ${key}: ${value ? '✓' : '✗'}`, value ? 'green' : 'red');
  });

  if (passed === total) {
    log('\n✅ All checks passed!', 'green');
  } else {
    log('\n⚠️  Some checks failed. Review the output above.', 'yellow');
  }

  console.log('\n');
}

// Run checks
runAllChecks().catch(console.error);
