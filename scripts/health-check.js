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

  // Check 0a: Lint
  console.log('0a. Running lint...');
  try {
    execSync('npm run lint', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
      timeout: 30000,
    });
    console.log('   ✅ Lint passed');
  } catch (err) {
    const msg = err.stderr?.toString() || err.stdout?.toString() || err.message;
    console.log('   ❌ Lint failed:', msg.split('\n').slice(-3).join('\n'));
    console.log('\n⚠️  Fix lint errors before deploying.');
    process.exit(1);
  }

  // Check 0b: TypeScript & build (catch type errors before deploy)
  console.log('0b. Running type check and build...');
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
    const healthRes = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });
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

  // Check 2a: Library - ensure formatDate is not passed to client (fixes save-style redirect error)
  console.log('\n2a. Checking library formatDate fix...');
  try {
    const libraryPage = fs.readFileSync(path.join(__dirname, '..', 'app', '(main)', 'library', 'page.tsx'), 'utf8');
    const libraryTabs = fs.readFileSync(path.join(__dirname, '..', 'components', 'library', 'library-tabs.tsx'), 'utf8');
    const passesFormatDate = libraryPage.includes('formatDate={formatDate}') || libraryPage.includes('formatDate=');
    const hasLocalFormatDate = libraryTabs.includes('function formatDate');
    if (passesFormatDate || !hasLocalFormatDate) {
      console.log('   ❌ Library may still pass formatDate to client - fix required');
    } else {
      console.log('   ✅ Library formatDate fix verified (no function passed to client)');
    }
  } catch (e) {
    console.log('   ⚠️  Could not verify library fix:', e.message);
  }

  // Check 2b: Billing page – Stripe Customer Portal configured
  console.log('\n2b. Checking billing setup...');
  try {
    const billingPage = fs.readFileSync(path.join(__dirname, '..', 'app', '(main)', 'billing', 'page.tsx'), 'utf8');
    const hasPortalButton = billingPage.includes('BillingPortalButton') || billingPage.includes('Manage billing');
    const hasPortalApi = fs.existsSync(path.join(__dirname, '..', 'app', 'api', 'billing', 'portal', 'route.ts'));
    if (hasPortalButton && hasPortalApi) {
      console.log('   ✅ Billing page has Customer Portal (manage payment methods, invoices)');
    } else {
      console.log('   ⚠️  Billing: add Stripe Customer Portal for full billing management');
    }
  } catch (e) {
    console.log('   ⚠️  Could not verify billing:', e.message);
  }

  // Check 2c: Stripe (for sandbox testing)
  console.log('\n2c. Checking Stripe configuration...');
  const stripeVars = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_CREATOR', 'STRIPE_WEBHOOK_SECRET'];
  let stripeOk = true;
  stripeVars.forEach((varName) => {
    const val = process.env[varName];
    if (!val || !val.trim()) {
      console.log(`   ⚠️  Missing or empty: ${varName}`);
      stripeOk = false;
    } else {
      const masked = varName.includes('SECRET') ? val.slice(0, 12) + '...' : val;
      console.log(`   ✅ ${varName}: ${masked}`);
    }
  });
  if (stripeOk) {
    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_STARTER);
      if (price && price.id) {
        console.log(`   ✅ Stripe API connected (Starter price: ${price.id})`);
      }
    } catch (err) {
      console.log(`   ⚠️  Stripe API test failed:`, err.message?.slice(0, 60));
    }
  } else {
    console.log('   ⚠️  Stripe not fully configured. Add keys for sandbox testing.');
  }

  // Check 3: Gemini API (if available)
  if (process.env.GEMINI_API_KEY) {
    console.log('\n3. Testing Gemini API connection...');
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro'];
    let geminiOk = false;
    for (const modelName of modelsToTry) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 50 },
        });
        const result = await model.generateContent('Reply with exactly: OK');
        const response = await result.response;
        const text = response.text();
        if (text && text.trim()) {
          console.log(`   ✅ Gemini API working (${modelName})`);
          geminiOk = true;
          break;
        }
      } catch (error) {
        console.log(`   ⚠️  ${modelName}:`, error.message?.slice(0, 80));
      }
    }
    if (!geminiOk) {
      console.log('   ❌ All Gemini models failed. Check API key and quota.');
    }
  }

  console.log('\n✅ Health check complete!');
}

// Run if executed directly
if (require.main === module) {
  healthCheck().catch(console.error);
}

module.exports = { healthCheck };
