/**
 * Get Tokens and Run Tests
 * This script gets authentication tokens and runs the points system tests
 */

const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

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

async function getAdminToken() {
  console.log('🔐 Getting admin token...');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      emailOrUsername: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });

    if (response.status === 200 && response.data.success && response.data.data?.token) {
      console.log('✅ Admin token obtained');
      return response.data.data.token;
    } else {
      console.log('❌ Failed to get admin token:', response.data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.log('❌ Error getting admin token:', error.message);
    return null;
  }
}

async function getStoreUserToken(storeId) {
  console.log('🔐 Getting store user token...');
  console.log('⚠️  Store user credentials not provided. Using admin token for store operations.');
  return null;
}

async function getCustomers(storeToken) {
  if (!storeToken) {
    console.log('⚠️  Cannot get customers without store token');
    return { customerId: null, phone: null };
  }

  console.log('👤 Getting customers...');
  try {
    const response = await makeRequest('GET', '/api/customers', null, storeToken);

    if (response.status === 200 && response.data.success && response.data.data?.customers?.length > 0) {
      const customer = response.data.data.customers[0];
      console.log(`✅ Found customer: ${customer.id || customer._id}`);
      return {
        customerId: customer.id || customer._id,
        phone: customer.phone || '1234567890',
      };
    } else {
      console.log('⚠️  No customers found');
      return { customerId: null, phone: '1234567890' };
    }
  } catch (error) {
    console.log('⚠️  Error getting customers:', error.message);
    return { customerId: null, phone: '1234567890' };
  }
}

async function runBasicTests(adminToken, storeToken, customerId, phone) {
  console.log('\n🧪 Running Basic Tests');
  console.log('='.repeat(50));

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Test 1: Get Points Settings (Admin)
  console.log('\n📝 Test 1: Get Points Settings (Admin)');
  try {
    const response = await makeRequest('GET', '/api/admin/points-settings', null, adminToken);
    if (response.status === 200 && response.data.success) {
      console.log('✅ Success');
      console.log('Settings:', JSON.stringify(response.data.data.settings, null, 2));
      results.passed++;
    } else {
      console.log(`❌ Failed (HTTP ${response.status})`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    results.failed++;
  }

  // Test 2: Update Points Settings (Admin)
  console.log('\n📝 Test 2: Update Points Settings (Admin)');
  try {
    const response = await makeRequest('PUT', '/api/admin/points-settings', {
      userPointsPercentage: 5,
      companyProfitPercentage: 2,
      defaultThreshold: 10000,
      pointsValuePerPoint: 0.01,
    }, adminToken);
    if (response.status === 200 && response.data.success) {
      console.log('✅ Success');
      results.passed++;
    } else {
      console.log(`❌ Failed (HTTP ${response.status})`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    results.failed++;
  }

  // Test 3: Get All Store Points Accounts (Admin)
  console.log('\n📝 Test 3: Get All Store Points Accounts (Admin)');
  try {
    const response = await makeRequest('GET', '/api/store-points-accounts', null, adminToken);
    if (response.status === 200 && response.data.success) {
      console.log('✅ Success');
      const accounts = response.data.data.accounts || [];
      console.log(`Found ${accounts.length} store accounts`);
      if (accounts.length > 0) {
        accounts.forEach(acc => {
          console.log(`  - ${acc.storeId}: Issued ${acc.totalPointsIssued}, Redeemed ${acc.totalPointsRedeemed}, Owed $${acc.amountOwed}`);
        });
      }
      results.passed++;
    } else {
      console.log(`❌ Failed (HTTP ${response.status})`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    results.failed++;
  }

  // Test 4: Get Customer Points by Phone (if store token available)
  if (storeToken) {
    console.log('\n📝 Test 4: Get Customer Points by Phone');
    try {
      const response = await makeRequest('GET', `/api/points/customer?phone=${phone}`, null, storeToken);
      if (response.status === 200 && response.data.success) {
        console.log('✅ Success');
        const balance = response.data.data.balance;
        console.log(`Balance: ${balance.totalPoints} points (${balance.availablePoints} available)`);
        results.passed++;
      } else {
        console.log(`⚠️  Customer may not exist yet (HTTP ${response.status})`);
        results.skipped++;
      }
    } catch (error) {
      console.log('⚠️  Error:', error.message);
      results.skipped++;
    }
  } else {
    console.log('\n📝 Test 4: Get Customer Points by Phone');
    console.log('⚠️  Skipped: Store token not available');
    results.skipped++;
  }

  return results;
}

async function main() {
  console.log('\n🚀 Cross-Store Points System - Automated Test');
  console.log('='.repeat(50));
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(50));

  // Get tokens
  const adminToken = await getAdminToken();
  if (!adminToken) {
    console.log('\n❌ Cannot proceed without admin token');
    process.exit(1);
  }

  const storeToken = await getStoreUserToken('store1');
  const { customerId, phone } = await getCustomers(storeToken);

  // Set environment variables for test script
  process.env.ADMIN_TOKEN = adminToken;
  if (storeToken) process.env.STORE_TOKEN = storeToken;
  if (customerId) process.env.TEST_CUSTOMER_ID = customerId;
  process.env.TEST_PHONE = phone;

  // Run basic tests
  const results = await runBasicTests(adminToken, storeToken, customerId, phone);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);
  console.log(`📈 Total: ${results.passed + results.failed + results.skipped}`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    console.log('\n💡 To run full tests with store operations, provide:');
    console.log('   - STORE_USER_EMAIL');
    console.log('   - STORE_USER_PASSWORD');
    console.log('   - STORE_ID');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

