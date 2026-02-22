/**
 * Health check script to verify all functionality
 */

const fs = require('fs');
const path = require('path');

// Load .env.local if it exists
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
} catch {
  // .env.local might not exist
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const { execSync } = require('child_process');

async function healthCheck() {
  console.log('🔍 Starting health check...\n');

  // Check 0: TypeScript & build (catch type errors before deploy)
  console.log('0. Running type check and build...');
  try {
    execSync('npm run build', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      timeout: 120000,
    });
    console.log('   ✅ Build passed (types valid, no compile errors)');
  } catch (err) {
    const msg = err.stderr?.toString() || err.stdout?.toString() || err.message;
    console.log('   ❌ Build failed:', msg.split('\n').slice(-5).join('\n'));
    console.log('\n⚠️  Fix build errors before deploying.');
    process.exit(1);
  }

  // Check 1: Health endpoint
  try {
    console.log('1. Checking health endpoint...');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    console.log('   ✅ Health endpoint:', healthData.status);
    console.log('   Details:', JSON.stringify(healthData.checks, null, 2));
  } catch (error) {
    console.log('   ❌ Health endpoint failed:', error.message);
  }

  // Check 2: Environment variables
  console.log('\n2. Checking environment variables...');
  const requiredEnvVars = [
    'GEMINI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = [];
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
      console.log(`   ❌ Missing: ${varName}`);
    } else {
      console.log(`   ✅ Found: ${varName}`);
    }
  });

  if (missing.length > 0) {
    console.log(`\n⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.log('   Please check your .env.local file');
  }

  // Check 3: Gemini API (if available)
  if (process.env.GEMINI_API_KEY) {
    console.log('\n3. Testing Gemini API connection...');
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('Say "Hello"');
      const response = await result.response;
      console.log('   ✅ Gemini API working');
      console.log('   Response:', response.text().substring(0, 50));
    } catch (error) {
      console.log('   ❌ Gemini API test failed:', error.message);
    }
  }

  console.log('\n✅ Health check complete!');
}

// Run if executed directly
if (require.main === module) {
  healthCheck().catch(console.error);
}

module.exports = { healthCheck };
