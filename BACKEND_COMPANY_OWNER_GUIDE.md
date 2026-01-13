# Backend Implementation Guide: Company Owner Role

## ⚠️ КРИТИЧЕСКИ ВАЖНО

**ДВА РЕЖИМА РАБОТЫ - НЕ ПУТАТЬ!**

1. **Legacy Mode** - старые компании БЕЗ главы
2. **Owner Mode** - новые компании С главой

**ЗАПРЕЩЕНО:**
- ❌ Автоматически менять старые компании
- ❌ Упрощать существующие расчёты
- ❌ Делать скрытые миграции

---

## 1. Database Schema Changes

### 1.1 Company Model

**File**: `backend/models/Company.js`

**ADD these fields** (optional, with defaults):

```javascript
const CompanySchema = new mongoose.Schema({
  // ... existing fields ...

  // ✅ NEW: Reference to company owner (optional)
  companyOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null  // ⚠️ IMPORTANT: null for old companies
  },

  // ✅ NEW: Distribution rates (optional)
  distributionRates: {
    companyOwner: { 
      type: Number, 
      default: undefined  // ⚠️ IMPORTANT: undefined = legacy mode
    },
    company: { 
      type: Number, 
      default: undefined  // ⚠️ Will use 0.20 in legacy, 0.10 in owner mode
    },
    admin: { type: Number, default: 0.10 },
    team: { type: Number, default: 0.70 },
    teamLead: { type: Number, default: 0.10 }
  }

  // ... rest of existing fields ...
});
```

**⚠️ CRITICAL**: Do NOT set defaults for `companyOwner` and `company` rates!
- `undefined` = use legacy mode
- Set value = use owner mode

---

### 1.2 User Model

**File**: `backend/models/User.js`

**NO CHANGES NEEDED** - role field already exists

Just add `'company_owner'` to validation enum:

```javascript
role: {
  type: String,
  enum: [
    'super_admin',
    'company_owner',  // ✅ ADD THIS
    'company_admin',
    'team_lead',
    'employee',
    'worker',
    // ... other roles
  ],
  required: true
}
```

---

## 2. Distribution Logic (MOST IMPORTANT)

### 2.1 Determine Mode

**File**: `backend/utils/distribution.js` (create new file)

```javascript
/**
 * Determine distribution mode for a company
 * 
 * @param {Object} company - Company document
 * @returns {'legacy' | 'owner'}
 */
const getDistributionMode = (company) => {
  // Legacy mode if:
  // - No owner assigned
  // - OR no owner rate set
  if (!company.companyOwner || company.distributionRates?.companyOwner === undefined) {
    return 'legacy';
  }

  // Owner mode if owner exists and rate is set
  return 'owner';
};
```

---

### 2.2 Get Distribution Rates

```javascript
/**
 * Get distribution rates based on company mode
 * 
 * @param {Object} company - Company document
 * @returns {Object} rates
 */
const getDistributionRates = (company) => {
  const mode = getDistributionMode(company);

  if (mode === 'legacy') {
    // ⚠️ LEGACY MODE - EXACTLY as before
    return {
      mode: 'legacy',
      company: company.distributionRates?.company ?? 0.20,  // 20% as before
      admin: company.distributionRates?.admin ?? 0.10,
      team: company.distributionRates?.team ?? 0.70,
      teamLead: company.distributionRates?.teamLead ?? 0.10
    };
  }

  // ✅ OWNER MODE - new distribution
  return {
    mode: 'owner',
    companyOwner: company.distributionRates?.companyOwner ?? 0.10,  // NEW
    company: company.distributionRates?.company ?? 0.10,            // Changed
    admin: company.distributionRates?.admin ?? 0.10,
    team: company.distributionRates?.team ?? 0.70,
    teamLead: company.distributionRates?.teamLead ?? 0.10
  };
};
```

---

### 2.3 Calculate Distribution

```javascript
/**
 * Calculate payment distribution for an order
 * 
 * @param {number} orderAmount - Total order amount
 * @param {Object} company - Company document (populated)
 * @param {string} adminId - ID of admin who accepted order
 * @returns {Object} distribution
 */
const calculateDistribution = (orderAmount, company, adminId) => {
  const rates = getDistributionRates(company);

  if (rates.mode === 'legacy') {
    // ⚠️ LEGACY MODE - EXACTLY as before
    return {
      mode: 'legacy',
      company: {
        amount: orderAmount * rates.company,
        companyId: company._id
      },
      admin: {
        amount: orderAmount * rates.admin,
        userId: adminId  // ⚠️ Only admin who accepted
      },
      team: {
        amount: orderAmount * rates.team,
        // ... existing team distribution logic
      }
    };
  }

  // ✅ OWNER MODE - new distribution
  return {
    mode: 'owner',
    companyOwner: {
      amount: orderAmount * rates.companyOwner,
      userId: company.companyOwner  // ✅ NEW: Owner gets from ALL orders
    },
    company: {
      amount: orderAmount * rates.company,
      companyId: company._id
    },
    admin: {
      amount: orderAmount * rates.admin,
      userId: adminId  // ⚠️ Only admin who accepted
    },
    team: {
      amount: orderAmount * rates.team,
      // ... existing team distribution logic
    }
  };
};
```

---

## 3. Company Creation

### 3.1 Create Company Endpoint

**File**: `backend/controllers/company.controller.js`

**Modify**: `createCompany` function

```javascript
const createCompany = async (req, res) => {
  try {
    const { name, email, password, ownerName } = req.body;

    // ⚠️ EXISTING CODE - create company
    const company = await Company.create({
      name,
      email,
      // ... other fields
      
      // ✅ NEW: Set owner mode rates for new companies
      distributionRates: {
        companyOwner: 0.10,  // ✅ Enable owner mode
        company: 0.10,       // ✅ New rate
        admin: 0.10,
        team: 0.70,
        teamLead: 0.10
      }
    });

    // ✅ NEW: Auto-create company owner
    const ownerUser = await User.create({
      name: ownerName || name,
      email: email,
      password: await bcrypt.hash(password, 10),
      role: 'company_owner',  // ✅ NEW ROLE
      companyId: company._id
    });

    // ✅ NEW: Link owner to company
    company.companyOwner = ownerUser._id;
    await company.save();

    res.status(201).json({
      success: true,
      company,
      owner: ownerUser
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
```

---

## 4. User Creation Validation

### 4.1 Create User Endpoint

**File**: `backend/controllers/user.controller.js`

**Modify**: `createUser` function

**ADD validation BEFORE creating user**:

```javascript
const createUser = async (req, res) => {
  try {
    const { role, companyId } = req.body;

    // ✅ NEW: Validate company_owner creation
    if (role === 'company_owner') {
      // 1. Only super_admin can create owner
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super admin can create company owner'
        });
      }

      // 2. Check if company already has owner
      const existingOwner = await User.findOne({
        role: 'company_owner',
        companyId: companyId
      });

      if (existingOwner) {
        return res.status(409).json({
          success: false,
          message: 'Company already has an owner. Only one owner per company allowed.'
        });
      }
    }

    // ⚠️ EXISTING CODE - create user
    const user = await User.create(req.body);

    // ✅ NEW: If creating owner, link to company
    if (role === 'company_owner') {
      await Company.findByIdAndUpdate(companyId, {
        companyOwner: user._id,
        // ✅ Enable owner mode if not already
        'distributionRates.companyOwner': 0.10,
        'distributionRates.company': 0.10
      });
    }

    res.status(201).json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

## 5. Payment Distribution

### 5.1 Distribute Payment

**File**: `backend/controllers/payment.controller.js`

**Modify**: Payment distribution function

```javascript
const distributePayment = async (orderId) => {
  try {
    // Get order with company populated
    const order = await Order.findById(orderId)
      .populate({
        path: 'companyId',
        populate: { path: 'companyOwner' }
      });

    const company = order.companyId;
    const distribution = calculateDistribution(
      order.totalAmount,
      company,
      order.acceptedBy  // Admin who accepted order
    );

    // ✅ NEW: Create owner payment (if owner mode)
    if (distribution.mode === 'owner' && distribution.companyOwner) {
      await Payment.create({
        userId: distribution.companyOwner.userId,
        orderId: order._id,
        amount: distribution.companyOwner.amount,
        type: 'company_owner_share',
        description: `Owner share from order #${order.orderNumber}`
      });
    }

    // ⚠️ EXISTING: Company budget payment
    await Payment.create({
      companyId: company._id,
      orderId: order._id,
      amount: distribution.company.amount,
      type: 'company_budget',
      description: `Company budget from order #${order.orderNumber}`
    });

    // ⚠️ EXISTING: Admin payment (only who accepted)
    await Payment.create({
      userId: distribution.admin.userId,
      orderId: order._id,
      amount: distribution.admin.amount,
      type: 'admin_share',
      description: `Admin share from order #${order.orderNumber}`
    });

    // ⚠️ EXISTING: Team distribution (unchanged)
    // ... existing team payment logic ...

  } catch (error) {
    console.error('Payment distribution error:', error);
    throw error;
  }
};
```

---

## 6. API Endpoints

### 6.1 Get Company Distribution Mode

**NEW endpoint**:

```javascript
// GET /api/companies/:id/distribution-mode
router.get('/:id/distribution-mode', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('companyOwner');

    const mode = getDistributionMode(company);
    const rates = getDistributionRates(company);

    res.json({
      success: true,
      mode,
      rates,
      hasOwner: !!company.companyOwner
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

### 6.2 Update Distribution Rates

**Modify existing endpoint**:

```javascript
// PUT /api/companies/:id/distribution-rates
router.put('/:id/distribution-rates', auth, superAdminOnly, async (req, res) => {
  try {
    const { companyOwner, company, admin, team, teamLead } = req.body;

    // Validate total = 100%
    const total = (companyOwner || 0) + company + admin + team;
    if (Math.abs(total - 1.0) > 0.001) {
      return res.status(400).json({
        success: false,
        message: 'Distribution rates must sum to 100%'
      });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      {
        distributionRates: {
          companyOwner,  // ✅ NEW: Can be undefined for legacy mode
          company,
          admin,
          team,
          teamLead
        }
      },
      { new: true }
    );

    res.json({
      success: true,
      company: updatedCompany
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

---

## 7. Testing Checklist

### 7.1 Legacy Mode Tests

```javascript
describe('Legacy Mode (Old Companies)', () => {
  test('Company without owner uses legacy distribution', async () => {
    const company = await Company.create({
      name: 'Old Company',
      // NO companyOwner
      // NO distributionRates.companyOwner
    });

    const mode = getDistributionMode(company);
    expect(mode).toBe('legacy');

    const rates = getDistributionRates(company);
    expect(rates.company).toBe(0.20);  // 20% as before
    expect(rates.companyOwner).toBeUndefined();
  });

  test('Distribution calculation in legacy mode', () => {
    const distribution = calculateDistribution(1000, legacyCompany, adminId);

    expect(distribution.mode).toBe('legacy');
    expect(distribution.company.amount).toBe(200);  // 20%
    expect(distribution.admin.amount).toBe(100);    // 10%
    expect(distribution.team.amount).toBe(700);     // 70%
    expect(distribution.companyOwner).toBeUndefined();
  });
});
```

---

### 7.2 Owner Mode Tests

```javascript
describe('Owner Mode (New Companies)', () => {
  test('Company with owner uses owner distribution', async () => {
    const owner = await User.create({
      role: 'company_owner',
      // ...
    });

    const company = await Company.create({
      name: 'New Company',
      companyOwner: owner._id,
      distributionRates: {
        companyOwner: 0.10,
        company: 0.10
      }
    });

    const mode = getDistributionMode(company);
    expect(mode).toBe('owner');

    const rates = getDistributionRates(company);
    expect(rates.companyOwner).toBe(0.10);
    expect(rates.company).toBe(0.10);  // Changed from 20%
  });

  test('Owner gets 10% from ALL orders', async () => {
    const order1 = await createOrder({ acceptedBy: admin1._id });
    const order2 = await createOrder({ acceptedBy: admin2._id });

    await distributePayment(order1._id);
    await distributePayment(order2._id);

    const ownerPayments = await Payment.find({
      userId: owner._id,
      type: 'company_owner_share'
    });

    expect(ownerPayments).toHaveLength(2);  // From BOTH orders
    expect(ownerPayments[0].amount).toBe(100);  // 10% of 1000
    expect(ownerPayments[1].amount).toBe(100);  // 10% of 1000
  });

  test('Admin gets 10% only from their orders', async () => {
    const order1 = await createOrder({ acceptedBy: admin1._id });
    const order2 = await createOrder({ acceptedBy: admin2._id });

    await distributePayment(order1._id);
    await distributePayment(order2._id);

    const admin1Payments = await Payment.find({
      userId: admin1._id,
      type: 'admin_share'
    });

    expect(admin1Payments).toHaveLength(1);  // Only from order1
    expect(admin1Payments[0].amount).toBe(100);
  });
});
```

---

### 7.3 Validation Tests

```javascript
describe('Company Owner Validation', () => {
  test('Only super_admin can create owner', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send({ role: 'company_owner', companyId: company._id });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Only super admin');
  });

  test('Cannot create second owner', async () => {
    await User.create({
      role: 'company_owner',
      companyId: company._id
    });

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'company_owner', companyId: company._id });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already has an owner');
  });

  test('Auto-create owner on company creation', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Test Company',
        email: 'owner@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(201);

    const owner = await User.findOne({
      role: 'company_owner',
      companyId: res.body.company._id
    });

    expect(owner).toBeTruthy();
    expect(owner.email).toBe('owner@test.com');
  });
});
```

---

## 8. Migration Strategy

### 8.1 NO Auto-Migration

**DO NOT** run automatic migrations on old companies!

Old companies should:
- Have `companyOwner: null`
- Have `distributionRates.companyOwner: undefined`
- Continue using legacy mode (20% company budget)

---

### 8.2 Manual Migration Script (Optional)

**File**: `backend/scripts/migrate-to-owner-mode.js`

```javascript
// OPTIONAL: Manual migration script
// Run ONLY when explicitly requested

const migrateCompanyToOwnerMode = async (companyId, ownerEmail, ownerPassword) => {
  const company = await Company.findById(companyId);

  // Create owner
  const owner = await User.create({
    name: company.name + ' Owner',
    email: ownerEmail,
    password: await bcrypt.hash(ownerPassword, 10),
    role: 'company_owner',
    companyId: company._id
  });

  // Update company
  await Company.findByIdAndUpdate(companyId, {
    companyOwner: owner._id,
    distributionRates: {
      companyOwner: 0.10,
      company: 0.10,  // Changed from 0.20
      admin: 0.10,
      team: 0.70,
      teamLead: 0.10
    }
  });

  console.log(`✅ Company ${company.name} migrated to owner mode`);
};

// Run manually:
// node scripts/migrate-to-owner-mode.js <companyId> <ownerEmail> <ownerPassword>
```

---

## 9. Summary

### ✅ What Changes

- New role: `company_owner`
- New field: `Company.companyOwner`
- New field: `Company.distributionRates.companyOwner`
- New payment type: `company_owner_share`
- Auto-create owner on company creation
- Dual-mode distribution logic

### ✅ What Stays the Same

- Old companies use legacy mode (20% budget)
- company_admin logic unchanged (10% from own orders)
- Team distribution unchanged
- All existing endpoints work
- All existing data works

### ✅ Key Rules

1. **Legacy mode** = no owner OR no owner rate
2. **Owner mode** = has owner AND has owner rate
3. **Never auto-migrate** old companies
4. **Only super_admin** can create owners
5. **One owner** per company maximum

---

## 10. API Documentation

### New Endpoints

```
POST   /api/companies              - Auto-creates owner
GET    /api/companies/:id/distribution-mode
PUT    /api/companies/:id/distribution-rates
POST   /api/users                  - Validates owner creation
```

### Modified Responses

```json
// Company response now includes:
{
  "company": {
    "_id": "...",
    "name": "...",
    "companyOwner": "userId or null",  // NEW
    "distributionRates": {
      "companyOwner": 0.10,  // NEW (optional)
      "company": 0.10,
      "admin": 0.10,
      "team": 0.70,
      "teamLead": 0.10
    }
  }
}
```

---

## ⚠️ FINAL CHECKLIST

- [ ] Two modes implemented (legacy/owner)
- [ ] Old companies use legacy mode
- [ ] New companies use owner mode
- [ ] Owner gets 10% from ALL orders
- [ ] Admin gets 10% from OWN orders
- [ ] Only super_admin can create owner
- [ ] One owner per company enforced
- [ ] Auto-create owner on company creation
- [ ] No auto-migrations
- [ ] All tests pass
- [ ] Backward compatibility verified
