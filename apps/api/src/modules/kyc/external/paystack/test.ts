import { PaystackKycVerificator } from './paystack.kyc.client';
import { env } from '../../../../config/env';

/**
 * Test suite for Paystack KYC Verification
 *
 * IMPORTANT: This test uses actual Paystack API credentials.
 * Ensure PAYSTACK_SECRET_KEY_DEV is set in your .env file before running.
 *
 * Flow:
 * 1. Create a customer via Paystack API
 * 2. Extract the customer_code from response
 * 3. Verify KYC using that customer_code with test credentials
 */

// Step 1: Create a customer in Paystack
async function createPaystackCustomer(email: string, firstName: string, lastName: string): Promise<{ customer_code: string; customer_id: number }> {
  const url = 'https://api.paystack.co/customer';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`
  };

  const body = JSON.stringify({
    email,
    first_name: firstName,
    last_name: lastName
  });

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body
  });

  if (!response.ok) {
    throw new Error(`Failed to create customer: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  if (!data.data || !data.data.customer_code) {
    throw new Error('Invalid response: customer_code not found');
  }

  return {
    customer_code: data.data.customer_code,
    customer_id: data.data.id
  };
}

async function runPaystackKycTest(): Promise<void> {
  console.log('🚀 Starting Paystack KYC Verification Test...\n');

  // Verify env is loaded
  if (!env.PAYSTACK_SECRET_KEY) {
    console.error('❌ PAYSTACK_SECRET_KEY is not set in environment variables!');
    console.error('Please add PAYSTACK_SECRET_KEY_DEV to your .env file');
    process.exit(1);
  }

  console.log('✓ Paystack credentials loaded from env');
  console.log(`✓ Environment: ${env.NODE_ENV}`);
  console.log(`✓ Using: PAYSTACK_SECRET_KEY_${env.NODE_ENV.toUpperCase()}\n`);

  const verificator = new PaystackKycVerificator();

  // Test credentials as provided by Paystack docs
  const testCredentials = {
    country: 'NG',
    type: 'bank_account',
    account_number: '0111111111',
    bvn: '222222222221',
    bank_code: '007',
    first_name: 'Uchenna',
    last_name: 'Okoro'
  };

  console.log('Test Credentials:');
  console.log(JSON.stringify(testCredentials, null, 2));
  console.log('\n---\n');

  try {
    // Step 1: Create a customer
    console.log('Step 1️⃣  Creating a test customer in Paystack...\n');
    const customerEmail = `test-${Date.now()}@example.com`;
    const customer = await createPaystackCustomer(customerEmail, testCredentials.first_name, testCredentials.last_name);
    console.log('✓ Customer created successfully!');
    console.log(`  Customer Code: ${customer.customer_code}`);
    console.log(`  Customer ID: ${customer.customer_id}\n`);

    // Step 2: Verify KYC with created customer
    console.log('Step 2️⃣  Sending KYC verification request...\n');
    console.log(`POST https://api.paystack.co/customer/${customer.customer_code}/identification`);
    console.log('Headers: Authorization: Bearer [HIDDEN]');
    console.log('Body:');
    console.log(JSON.stringify(testCredentials, null, 2));
    console.log('\n---\n');

    const result = await verificator.verify({
      accountNumber: testCredentials.account_number,
      bvn: testCredentials.bvn,
      bankCode: testCredentials.bank_code,
      customerCode: customer.customer_code,
      firstName: testCredentials.first_name,
      lastName: testCredentials.last_name
    });

    console.log('✓ Response received from Paystack API\n');
    console.log('Full Response:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n---\n');

    if (result.success) {
      console.log('✅ KYC Verification SUCCESSFUL!');
      console.log(`Message: ${result.message}`);
    } else {
      console.log('❌ KYC Verification FAILED');
      console.log(`Message: ${result.message}`);
      if ('statusCode' in result && 'code' in result) {
        console.log(`Status Code: ${result.statusCode}`);
        console.log(`Error Code: ${result.code}`);
        console.log('\n💡 Debugging Tips:');
        console.log('  - Check if the test credentials are valid for your Paystack account');
        console.log('  - Verify the BVN and account number format');
        console.log('  - Check Paystack dashboard for any API restrictions');
        console.log('  - Make sure customer was created in the same environment (dev/prod)');
      }
    }
  } catch (error) {
    console.error('❌ Test Failed with Exception:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the test
runPaystackKycTest().catch((error) => {
  console.error('Fatal Error:', error);
  process.exit(1);
});
