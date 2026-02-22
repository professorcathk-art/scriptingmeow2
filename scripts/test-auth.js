/**
 * Test authentication flow
 */

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🔍 Testing Authentication...\n');

  // Test 1: Check if login page loads
  console.log('1. Testing login page...');
  try {
    const response = await fetch(`${BASE_URL}/auth/login`);
    if (response.ok) {
      console.log('   ✓ Login page accessible');
    } else {
      console.log(`   ✗ Login page error: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ✗ Login page error: ${error.message}`);
  }

  // Test 2: Check Supabase client creation
  console.log('\n2. Testing Supabase client...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://buebmyvaxtofjbjhugvh.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_U9XVguw-taryUR_D295-Vg__v8JC5iq'
    );
    
    // Test auth settings
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log(`   ⚠ Auth check: ${error.message}`);
    } else {
      console.log('   ✓ Supabase client created successfully');
    }
  } catch (error) {
    console.log(`   ✗ Supabase client error: ${error.message}`);
  }

  // Test 3: Check environment variables
  console.log('\n3. Checking environment variables...');
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const hasUrl = envFile.includes('NEXT_PUBLIC_SUPABASE_URL=https://');
    const hasKey = envFile.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
    
    console.log(`   ${hasUrl ? '✓' : '✗'} Supabase URL configured`);
    console.log(`   ${hasKey ? '✓' : '✗'} Supabase Key configured`);
    
    if (hasUrl && hasKey) {
      const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
      const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
      
      if (urlMatch) console.log(`   URL: ${urlMatch[1].substring(0, 50)}...`);
      if (keyMatch) console.log(`   Key: ${keyMatch[1].substring(0, 30)}...`);
    }
  } catch (error) {
    console.log(`   ✗ Error reading .env.local: ${error.message}`);
  }

  console.log('\n✅ Auth test complete!\n');
  console.log('💡 Tips:');
  console.log('   - Check browser console for errors');
  console.log('   - Verify Supabase project settings');
  console.log('   - Check if email confirmation is required');
  console.log('   - Try signing up first if no account exists\n');
}

testAuth().catch(console.error);
