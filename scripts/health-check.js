/**
 * Health check script to verify all functionality
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function healthCheck() {
  console.log('🔍 Starting health check...\n');

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
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
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
