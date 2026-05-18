# Complete Testing Guide: Wallet & Invest Modules

## 🚀 Running the Tests

### Run All Tests in Sequence

```bash
node c:\Users\HP\Desktop\finx\apps\api\src\modules\auth\test\repo.spec.ts && \
node c:\Users\HP\Desktop\finx\apps\api\src\modules\auth\test\service.spec.ts && \
node c:\Users\HP\Desktop\finx\apps\api\src\modules\wallet\test\repo.spec.ts && \
node c:\Users\HP\Desktop\finx\apps\api\src\modules\wallet\test\service.spec.ts && \
node c:\Users\HP\Desktop\finx\apps\api\src\modules\invest\test\repo.spec.ts && \
node c:\Users\HP\Desktop\finx\apps\api\src\modules\invest\test\service.spec.ts
```

### Run Individual Module Tests

```bash
# Auth tests
node c:\Users\HP\Desktop\finx\apps\api\src\modules\auth\test\repo.spec.ts
node c:\Users\HP\Desktop\finx\apps\api\src\modules\auth\test\service.spec.ts

# Wallet tests
node c:\Users\HP\Desktop\finx\apps\api\src\modules\wallet\test\repo.spec.ts
node c:\Users\HP\Desktop\finx\apps\api\src\modules\wallet\test\service.spec.ts

# Invest tests
node c:\Users\HP\Desktop\finx\apps\api\src\modules\invest\test\repo.spec.ts
node c:\Users\HP\Desktop\finx\apps\api\src\modules\invest\test\service.spec.ts
```

### Using npm/pnpm (Recommended)

Update your `package.json` with:

```json
{
  "scripts": {
    "test": "node --test 'src/modules/**/test/*.spec.ts'",
    "test:auth": "node --test 'src/modules/auth/test/*.spec.ts'",
    "test:wallet": "node --test 'src/modules/wallet/test/*.spec.ts'",
    "test:invest": "node --test 'src/modules/invest/test/*.spec.ts'"
  }
}
```

Then run:

```bash
pnpm test              # Run all tests
pnpm test:auth         # Run auth tests
pnpm test:wallet       # Run wallet tests
pnpm test:invest       # Run invest tests
```

---

## 📚 How I Wrote These Tests - A Learning Guide

### The Fundamental Question You Asked

> "If we mock, we are not actually using the main thing, so why write mock tests? What's actually being tested?"

This is an **excellent question** that shows you're thinking critically. Let me explain the entire philosophy.

### What Are We Actually Testing?

When we write tests, we're testing **behavior** and **logic**, not implementation details. Think of it this way:

```
❌ WRONG MINDSET:
"Tests should use the REAL database, REAL API calls, and REAL services"

✅ RIGHT MINDSET:
"Tests should verify that my code CORRECTLY handles different scenarios"
```

### The Three Layers of Testing

```
┌─────────────────────────────────────────────────────┐
│            LAYERS OF YOUR APPLICATION               │
├─────────────────────────────────────────────────────┤
│  Controller     (HTTP requests/responses)           │
│       ↓                                              │
│  Service        (Business Logic) ← WE TEST THIS     │
│       ↓                                              │
│  Repository     (Database Access) ← WE TEST THIS    │
│       ↓                                              │
│  Database       (Prisma/PostgreSQL)                 │
└─────────────────────────────────────────────────────┘
```

**Each layer has a DIFFERENT job:**

1. **Repository**: Knows how to talk to database
2. **Service**: Implements business rules
3. **Controller**: Handles HTTP communication

**We test the first two layers because they have logic. Controllers just route data.**

### Real-World Example: User Registration

```typescript
// WHAT WE WANT TO TEST:
async register(input: RegisterInput) {
  // ✅ Check if user already exists
  const existingUser = await this.authRepository.findUserByEmail(input.email);
  if (existingUser) {
    throw AppError.conflict('Already exists');
  }

  // ✅ Hash password correctly
  const passwordHash = await argon2.hash(input.password);

  // ✅ Create user AND wallet in one transaction
  const result = await this.authRepository.registerUserWithWallet(
    input,
    passwordHash,
    finxTag
  );

  // ✅ Return correct response format
  return { message: '...', data: { user, wallet, session } };
}
```

#### Option 1: Test With REAL Database ❌

```typescript
// This sounds good but has MASSIVE problems:
it('should register user', async () => {
  // Connect to REAL database
  const result = await service.register({
    email: 'test@example.com',
    password: 'Password123!'
    // ... other fields
  });

  // Check real database
  const userInDb = await prisma.user.findFirst({ where: { email: 'test@example.com' } });
  assert(userInDb, 'User should be in database');
});
```

**Why this is BAD:**

- ⏱️ **SLOW**: Every test connects to real database (5-10 seconds per test)
- 💥 **FRAGILE**: Database down? All tests fail even if code is good
- 🧹 **MESSY**: Need to clean up database after each test
- 🔗 **COUPLED**: Test depends on database schema, migrations
- 🪲 **HARD TO DEBUG**: If test fails, is it the code or the database?
- 🚫 **ISOLATED FAILURES**: Can't test error scenarios (like "database transaction failed")

#### Option 2: Test With MOCKS ✅

```typescript
// This is MUCH BETTER:
it('should register user', async () => {
  // Create a FAKE repository that returns what WE CONTROL
  const mockRepository = {
    findUserByEmail: async () => null, // No existing user
    registerUserWithWallet: async (input, hash, tag) => ({
      user: { id: 'user-1', email: input.email, finxTag: tag },
      wallet: { id: 'wallet-1', availableBalance: '0' },
    }),
  };

  const service = new AuthService(mockRepository);
  const result = await service.register({ ... });

  // VERIFY THE SERVICE BEHAVIOR
  assert.strictEqual(result.data.user.email, 'test@example.com');
  assert(result.data.wallet, 'Should create wallet');
});
```

**Why this is GOOD:**

- ⚡ **FAST**: No database = instant execution
- 🎯 **FOCUSED**: Tests ONLY the service logic
- 💪 **ISOLATED**: Failures are easy to debug
- 🧪 **COMPLETE**: We can test ALL scenarios (errors, edge cases, etc.)
- 🔄 **REPEATABLE**: Same result every time
- 🛡️ **SAFE**: Real data is never touched

### What EXACTLY Are We Testing With Mocks?

Let's trace through a real example:

```typescript
// ACTUAL CODE WE'RE TESTING
async transferP2P(senderUserId: string, input: TransferInput) {
  // 1. Find receiver wallet
  const receiverWallet = await this.walletRepository.findUserWalletByFinxTag(
    input.finxTag
  );

  // 2. Handle not found
  if (!receiverWallet) {
    throw AppError.notFound('Receiver account not found.');  // ← TEST THIS
  }

  // 3. Prevent self-transfer
  if (receiverWallet.userId === senderUserId) {
    throw new AppError('You cannot transfer funds to yourself.', 400);  // ← TEST THIS
  }

  // 4. Execute transfer
  const result = await this.walletRepository.executeP2PTransfer(
    senderUserId,
    input,
    reference
  );

  // 5. Format response
  return {
    message: 'Transfer completed successfully.',
    data: { /* ... */ }
  };
}

// ───────────────────────────────────────────────────
// OUR TESTS VERIFY ALL THESE BEHAVIORS:
// ───────────────────────────────────────────────────

describe('transferP2P', () => {
  it('should transfer funds between users', async () => {
    // ✅ TESTS: Does it call repository correctly?
    // ✅ TESTS: Does it format response correctly?
    // ✅ TESTS: Are amounts returned as strings?
  });

  it('should throw error when receiver not found', async () => {
    // ✅ TESTS: When repository returns null, does it throw?
    // ✅ TESTS: Is error message correct?
    mockRepository.findUserWalletByFinxTag = async () => null;
    await service.transferP2P(...);  // Should throw
  });

  it('should prevent self-transfers', async () => {
    // ✅ TESTS: When receiver is same user, does it throw?
    mockRepository.findUserWalletByFinxTag = async () => ({
      userId: 'user-1'  // SAME USER
    });
    await service.transferP2P('user-1', ...);  // Should throw
  });
});
```

### Let's Compare: What Gets Tested

| Scenario                 | Real DB                    | Mocks                       |
| ------------------------ | -------------------------- | --------------------------- |
| User not found           | ✅ Works (if data exists)  | ✅ Works (we control it)    |
| Self-transfer prevention | ✅ Works (if we set it up) | ✅ Works (we control it)    |
| Database down            | ❌ Test fails              | ✅ Still passes             |
| Wallet transaction fails | ❌ Hard to trigger         | ✅ Easy - just mock failure |
| Insufficient funds       | ❌ Need real data          | ✅ Just mock balance        |
| Concurrent transfers     | ❌ Very hard to test       | ✅ Easy with mocks          |
| Network timeout          | ❌ Can't easily test       | ✅ Just mock timeout        |

**The key insight:** We're testing **"Does my service handle the repository's response correctly?"** not **"Does the database work?"**

### The Pyramid of Testing

```
                    🎁 E2E Tests (Use REAL everything)
                    └─ Slow but tests FULL flow
                  🧪 Integration Tests (Mix real + mocks)
                  └─ Tests service + real database
              ✅ Unit Tests (All mocked dependencies)
              └─ Fast, focused, lots of coverage
```

**Our approach: UNIT TESTS (bottom layer)**

Unit tests verify:

- ✅ Service logic is correct
- ✅ Error handling works
- ✅ Response formatting is right
- ✅ Business rules are enforced

They DON'T verify:

- ❌ Database actually persists data (Integration test)
- ❌ API endpoints return correct HTTP status (E2E test)
- ❌ All systems work together (E2E test)

---

## 📝 Breaking Down the Test Structure

### 1. Mock Setup - The Foundation

```typescript
// CREATE A FAKE REPOSITORY
const createMockRepository = () => ({
  findUserByEmail: async (email) => null,  // "Not found" by default
  registerUserWithWallet: async (...) => ({
    user: { id: 'user-1', email: 'test@example.com' },
    wallet: { id: 'wallet-1' },
  }),
});
```

**Why we do this:**

- We control what the repository returns
- We can simulate ANY scenario
- Tests are fast because there's no real I/O

### 2. Test Setup - Before Each Test

```typescript
beforeEach(() => {
  mockRepository = createMockRepository();
  service = new AuthService(mockRepository); // Inject the fake
});

afterEach(() => {
  mockRepository = null; // Clean up
});
```

**Why we do this:**

- Each test starts fresh
- Tests don't affect each other
- Easy to reason about

### 3. Arrange-Act-Assert Pattern

```typescript
it('should register user successfully', async () => {
  // ARRANGE: Set up test data and mocks
  const input = {
    firstName: 'John',
    email: 'john@example.com',
    password: 'SecurePass123!'
  };

  mockRepository.findUserByEmail = async () => null; // No existing user

  // ACT: Execute the code we're testing
  const result = await service.register(input);

  // ASSERT: Verify the result
  assert.strictEqual(result.data.user.email, 'john@example.com');
  assert(result.data.wallet, 'Should have wallet');
});
```

---

## 🎯 Real-World Test Example Explained

Let's analyze a real test line by line:

```typescript
it('should prevent self-transfers', async () => {
  // ARRANGE: Create fake receiver wallet with SAME user ID
  const input = {
    finxTag: 'myfinxtag',
    amount: '1000',
    currency: 'NGN'
  };

  mockRepository.findUserWalletByFinxTag = async () => ({
    id: 'wallet-1',
    userId: 'user-1', // ← SAME as sender!
    type: 'FIAT',
    currency: 'NGN',
    user: { id: 'user-1', finxTag: 'myfinxtag' }
  });

  // ACT: Try to transfer to self
  try {
    await service.transferP2P('user-1', input); // sender is 'user-1'
    assert.fail('Should throw error'); // If we get here, test FAILED
  } catch (error) {
    // ASSERT: Verify the RIGHT error was thrown
    assert(error.message.includes('cannot transfer funds to yourself'), 'Should have correct error message');
  }
});
```

**What we're testing:**

1. ✅ When receiver's user ID equals sender's ID
2. ✅ Does the service throw an error?
3. ✅ Is the error message clear?

**We're NOT testing:**

1. ❌ Whether the database validates this
2. ❌ Whether the HTTP endpoint rejects it
3. ❌ Whether Prisma transaction commits

---

## 🧠 Understanding Mock Behavior

### Simple Mock Return Value

```typescript
// Simple: Always return same thing
mockRepository.findUserByEmail = async (email) => ({
  id: 'user-1',
  email: 'john@example.com'
});

// Now ANY email will return this user (unrealistic but sometimes useful)
```

### Smart Mock - Inspect Arguments

```typescript
// Smart: Check what was passed in
mockRepository.findUserByEmail = async (email) => {
  // VERIFY the service is using email correctly
  assert.strictEqual(email, 'john@example.com', 'Should query correct email');
  return null;
};
```

### Conditional Mock - Simulate Different Scenarios

```typescript
// Conditional: Return different results based on input
mockRepository.findUserByEmail = async (email) => {
  if (email.includes('existing')) {
    return { id: 'user-1', email }; // User exists
  }
  return null; // User doesn't exist
};
```

### Tracking Mock - Verify it was called

```typescript
let findUserCalled = false;

mockRepository.findUserByEmail = async (email) => {
  findUserCalled = true;  // Track it
  return null;
};

await service.register({ ... });

assert(findUserCalled, 'Should call findUserByEmail');
```

---

## 🔄 Comparison: How Tests Would Look With Real DB vs Mocks

### With Real Database (Problems!)

```typescript
it('insufficient funds should fail', async () => {
  // Need to:
  // 1. Create test user in database
  // 2. Create wallet with specific balance
  // 3. Run test
  // 4. Delete test user (cleanup)
  // 5. Wait for database operations

  // SETUP (tedious)
  await db.users.create({ email: 'test@test.com', ... });
  await db.wallets.create({ userId: '...', balance: '100' });

  // TEST (what we actually care about)
  const result = await service.withdrawFiat('user-id', { amount: '5000' });

  // VERIFY
  assert(result.error, 'Should have error');

  // CLEANUP (must remember to do this!)
  await db.users.delete({ email: 'test@test.com' });

  // PROBLEMS:
  // - Slow (database operations take time)
  // - Fragile (need specific test database state)
  // - Hard to test (some scenarios hard to set up)
});
```

### With Mocks (Perfect!)

```typescript
it('insufficient funds should fail', async () => {
  // SETUP (one line!)
  mockRepository.findUserWalletByUserId = async () => ({
    availableBalance: '100' // Only 100 available
  });

  // TEST (what we care about)
  const result = await service.withdrawFiat('user-id', { amount: '5000' });

  // VERIFY (one line!)
  assert(result.error, 'Should have error');

  // BENEFITS:
  // - Instant (no database)
  // - Reliable (we control all inputs)
  // - Easy (setup in one line)
  // - No cleanup needed!
});
```

---

## 🏗️ Test Coverage Map

### Auth Module Tests

```
Repository Tests:
├─ findUserByEmail              ← Single user query
├─ findActiveUserById           ← Active status filtering
├─ findUserByEmailWithWallets   ← Include relation
├─ registerUserWithWallet       ← Transaction: user + wallet
├─ resetPassword                ← Transaction: password + tokens
├─ createSession                ← Session creation
├─ rotateSessionForUser         ← Old session revoke + new create
└─ revokeAllSessionsForUser     ← Batch update

Service Tests:
├─ register                     ← User creation flow
├─ login                        ← Authentication
├─ refreshSession               ← Token rotation
├─ forgotPassword               ← Password reset initiation
└─ resetPassword                ← Password reset completion
```

### Wallet Module Tests

```
Repository Tests:
├─ findUserWalletByUserId       ← Single wallet query
├─ findUserWalletByFinxTag      ← P2P lookup
├─ getBalanceWithRecentActivity ← Balance + transactions
├─ executeP2PTransfer           ← Transaction: debit + credit
├─ createFiatDepositIntent      ← Deposit initialization
├─ reserveFiatWithdrawal        ← Withdrawal reservation
├─ postSuccessfulFiatDeposit    ← Deposit completion
└─ recordPaymentWebhook         ← Webhook processing

Service Tests:
├─ getBalance                   ← Get wallet + activity
├─ transferP2P                  ← P2P transfer
├─ initiateFiatDeposit          ← Deposit flow
├─ withdrawFiat                 ← Withdrawal flow
├─ verifyFiatDeposit            ← Verification
└─ handlePaystackWebhook        ← Webhook handling
```

### Invest Module Tests

```
Repository Tests:
├─ createSubscription           ← Transaction: wallet debit + investment create
├─ getUserPortfolio             ← Portfolio query
├─ findInvestmentByIdForUser    ← Access control
├─ withdrawInvestment           ← Withdrawal + payout
└─ creditInvestmentPayout       ← Payout distribution

Service Tests:
├─ listPlans                    ← Plan listing
├─ subscribe                    ← Investment creation
├─ getPortfolio                 ← Portfolio with calculations
├─ withdraw                     ← Withdrawal
└─ processDuePayouts            ← Scheduled payout processor
```

---

## 💡 Key Insight: What Makes These Tests Valuable

These tests are valuable because they verify:

```
✅ Repository Tests:
  - Correct Prisma queries
  - Correct where/include/orderBy
  - Transaction handling
  - Error handling

✅ Service Tests:
  - Business logic correctness
  - Input validation
  - Error scenarios
  - Response formatting
  - Integration between methods
  - State transitions (active → matured)

❌ What they DON'T test:
  - Actual database persistence (Integration test)
  - HTTP response codes (E2E test)
  - Network latency (Performance test)
  - Concurrent access (Stress test)
```

---

## 🎓 Summary: Why Mocking Matters

### The Fundamental Truth

> **Mocks let us test our code logic without testing the database's logic.**

Think of it like this:

```
🔧 YOUR CODE (what you write)
│
├─ Logic: "If user doesn't exist, create it"
├─ Logic: "Hash password with Argon2"
├─ Logic: "Create user AND wallet together"
│
↓ DEPENDS ON ↓

📦 DATABASE (Prisma's job)
├─ Storing data
├─ Transactions
├─ Constraints
```

**With Mocks:** We test YOUR CODE ✅ **With Real DB:** We test YOUR CODE + PRISMA + POSTGRESQL all at once ❌

**That's why mocks are BETTER for unit tests.**

---

## 📖 Next Steps

1. **Run these tests** to see them pass/fail
2. **Break a test on purpose** - change an assertion to see what happens
3. **Modify a mock** - return different data and see how tests behave
4. **Add a new test** - try writing your own for a method we haven't covered
5. **Read the error messages** - they tell you exactly what went wrong

**These tests are your safety net. They ensure your business logic is correct before it ever touches a database!**
