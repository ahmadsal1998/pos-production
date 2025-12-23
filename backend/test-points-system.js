/**
 * Test Script for Cross-Store Points System
 * 
 * This script tests all endpoints of the cross-store points system.
 * Run with: node test-points-system.js
 * 
 * Prerequisites:
 * 1. Backend server must be running
 * 2. You need valid admin and store user tokens
 * 3. At least one store and customer must exist
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // Set your admin token
const STORE_TOKEN = process.env.STORE_TOKEN || ''; // Set your store token
const STORE_ID = process.env.STORE_ID || 'store1'; // Your store ID

// Test data
const TEST_CUSTOMER_ID = process.env.TEST_CUSTOMER_ID || ''; // Store-specific customer ID
const TEST_PHONE = process.env.TEST_PHONE || '1234567890';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.headers['Content-Length'] = JSON.stringify(body).length;
    }

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test functions
async function testAddPoints() {
  console.log('\n📝 Test 1: Add Points After Sale');
  console.log('=' .repeat(50));

  if (!TEST_CUSTOMER_ID) {
    console.log('⚠️  Skipping: TEST_CUSTOMER_ID not set');
    return null;
  }

  const response = await makeRequest(
    'POST',
    '/api/points/add',
    {
      invoiceNumber: `INV-TEST-${Date.now()}`,
      customerId: TEST_CUSTOMER_ID,
      purchaseAmount: 1000,
      pointsPercentage: 5,
    },
    STORE_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Points added successfully');
    return response.data.data;
  } else {
    console.log('❌ Failed to add points');
    return null;
  }
}

async function testGetCustomerPointsByPhone() {
  console.log('\n📝 Test 2: Get Customer Points by Phone');
  console.log('=' .repeat(50));

  // Use admin token if store token not available
  const token = STORE_TOKEN || ADMIN_TOKEN;
  if (!token) {
    console.log('⚠️  Skipping: No token available');
    return null;
  }

  const response = await makeRequest(
    'GET',
    `/api/points/customer?phone=${TEST_PHONE}`,
    null,
    token
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved points balance');
    return response.data.data.balance;
  } else {
    console.log('❌ Failed to get points');
    return null;
  }
}

async function testGetCustomerPointsByCustomerId() {
  console.log('\n📝 Test 3: Get Customer Points by Customer ID');
  console.log('=' .repeat(50));

  if (!TEST_CUSTOMER_ID) {
    console.log('⚠️  Skipping: TEST_CUSTOMER_ID not set');
    return null;
  }

  const response = await makeRequest(
    'GET',
    `/api/points/customer?customerId=${TEST_CUSTOMER_ID}`,
    null,
    STORE_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved points balance');
    return response.data.data.balance;
  } else {
    console.log('❌ Failed to get points');
    return null;
  }
}

async function testGetCustomerPointsHistory() {
  console.log('\n📝 Test 4: Get Customer Points History');
  console.log('=' .repeat(50));

  const response = await makeRequest(
    'GET',
    `/api/points/customer/history?phone=${TEST_PHONE}&page=1&limit=10`,
    null,
    STORE_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved transaction history');
    return response.data.data;
  } else {
    console.log('❌ Failed to get history');
    return null;
  }
}

async function testPayWithPoints() {
  console.log('\n📝 Test 5: Pay with Points');
  console.log('=' .repeat(50));

  // This requires a store token (store operation)
  if (!STORE_TOKEN) {
    console.log('⚠️  Skipping: STORE_TOKEN required for this test');
    return null;
  }

  const response = await makeRequest(
    'POST',
    '/api/points/pay',
    {
      phone: TEST_PHONE,
      points: 10,
      invoiceNumber: `INV-REDEEM-${Date.now()}`,
      description: 'Test points redemption',
    },
    STORE_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Points redeemed successfully');
    return response.data.data;
  } else {
    console.log('❌ Failed to redeem points');
    return null;
  }
}

async function testGetStorePointsAccount() {
  console.log('\n📝 Test 6: Get Store Points Account');
  console.log('=' .repeat(50));

  // Use admin token if store token not available
  const token = STORE_TOKEN || ADMIN_TOKEN;
  if (!token) {
    console.log('⚠️  Skipping: No token available');
    return null;
  }

  const response = await makeRequest(
    'GET',
    `/api/store-points-accounts/${STORE_ID}`,
    null,
    token
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved store points account');
    return response.data.data.account;
  } else {
    console.log('❌ Failed to get store account');
    return null;
  }
}

async function testGetAllStorePointsAccounts() {
  console.log('\n📝 Test 7: Get All Store Points Accounts (Admin)');
  console.log('=' .repeat(50));

  if (!ADMIN_TOKEN) {
    console.log('⚠️  Skipping: ADMIN_TOKEN not set');
    return null;
  }

  const response = await makeRequest(
    'GET',
    '/api/store-points-accounts',
    null,
    ADMIN_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved all store accounts');
    return response.data.data.accounts;
  } else {
    console.log('❌ Failed to get all accounts');
    return null;
  }
}

async function testGetStorePointsTransactions() {
  console.log('\n📝 Test 8: Get Store Points Transactions');
  console.log('=' .repeat(50));

  // Use admin token if store token not available
  const token = STORE_TOKEN || ADMIN_TOKEN;
  if (!token) {
    console.log('⚠️  Skipping: No token available');
    return null;
  }

  const response = await makeRequest(
    'GET',
    `/api/store-points-accounts/${STORE_ID}/transactions?page=1&limit=10`,
    null,
    token
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved store transactions');
    return response.data.data;
  } else {
    console.log('❌ Failed to get transactions');
    return null;
  }
}

async function testGetPointsSettings() {
  console.log('\n📝 Test 9: Get Points Settings (Admin)');
  console.log('=' .repeat(50));

  if (!ADMIN_TOKEN) {
    console.log('⚠️  Skipping: ADMIN_TOKEN not set');
    return null;
  }

  const response = await makeRequest(
    'GET',
    '/api/admin/points-settings',
    null,
    ADMIN_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Retrieved points settings');
    return response.data.data.settings;
  } else {
    console.log('❌ Failed to get settings');
    return null;
  }
}

async function testUpdatePointsSettings() {
  console.log('\n📝 Test 10: Update Points Settings (Admin)');
  console.log('=' .repeat(50));

  if (!ADMIN_TOKEN) {
    console.log('⚠️  Skipping: ADMIN_TOKEN not set');
    return null;
  }

  const response = await makeRequest(
    'PUT',
    '/api/admin/points-settings',
    {
      userPointsPercentage: 5,
      companyProfitPercentage: 2,
      defaultThreshold: 10000,
      pointsValuePerPoint: 0.01,
    },
    ADMIN_TOKEN
  );

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.success) {
    console.log('✅ Updated points settings');
    return response.data.data.settings;
  } else {
    console.log('❌ Failed to update settings');
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('\n🚀 Starting Cross-Store Points System Tests');
  console.log('=' .repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Store ID: ${STORE_ID}`);
  console.log(`Test Phone: ${TEST_PHONE}`);
  console.log('=' .repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Test 1: Add Points
    const addResult = await testAddPoints();
    if (addResult) results.passed++;
    else if (!TEST_CUSTOMER_ID) results.skipped++;
    else results.failed++;

    // Test 2: Get Points by Phone
    const balanceByPhone = await testGetCustomerPointsByPhone();
    if (balanceByPhone) results.passed++;
    else results.failed++;

    // Test 3: Get Points by Customer ID
    const balanceById = await testGetCustomerPointsByCustomerId();
    if (balanceById) results.passed++;
    else if (!TEST_CUSTOMER_ID) results.skipped++;
    else results.failed++;

    // Test 4: Get History
    const history = await testGetCustomerPointsHistory();
    if (history) results.passed++;
    else results.failed++;

    // Test 5: Pay with Points
    const payResult = await testPayWithPoints();
    if (payResult) results.passed++;
    else results.failed++;

    // Test 6: Get Store Account
    const storeAccount = await testGetStorePointsAccount();
    if (storeAccount) results.passed++;
    else results.failed++;

    // Test 7: Get All Accounts (Admin)
    const allAccounts = await testGetAllStorePointsAccounts();
    if (allAccounts) results.passed++;
    else if (!ADMIN_TOKEN) results.skipped++;
    else results.failed++;

    // Test 8: Get Store Transactions
    const transactions = await testGetStorePointsTransactions();
    if (transactions) results.passed++;
    else results.failed++;

    // Test 9: Get Settings (Admin)
    const settings = await testGetPointsSettings();
    if (settings) results.passed++;
    else if (!ADMIN_TOKEN) results.skipped++;
    else results.failed++;

    // Test 10: Update Settings (Admin)
    const updateSettings = await testUpdatePointsSettings();
    if (updateSettings) results.passed++;
    else if (!ADMIN_TOKEN) results.skipped++;
    else results.failed++;

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Skipped: ${results.skipped}`);
    console.log(`📈 Total: ${results.passed + results.failed + results.skipped}`);
    console.log('=' .repeat(50));

    if (results.failed === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please check the output above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

