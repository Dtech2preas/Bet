const assert = require('assert');

// Simple mock environment
const mockItems = [];

function getSubscriptionPlan(business_id) {
    return 'Pro';
}

async function checkLimits(business_id, collectionName, items) {
    const plan = getSubscriptionPlan(business_id);
    if (plan === 'Premium') return { allowed: true };

    const limits = {
        'Free': { clients: 5, products: 5, documents: 10, contracts: false },
        'Pro': { clients: 25, products: 25, documents: 25, contracts: true }
    };

    // Default to Free if plan is somehow unrecognized
    const currentLimits = limits[plan] || limits['Free'];

    // Feature gating
    if ((collectionName === 'contracts' || collectionName === 'licenses') && !currentLimits.contracts) {
        return { allowed: false, message: 'Feature locked. Upgrade to Pro or Premium to use Licenses and Contracts.', code: 'FEATURE_LOCKED' };
    }

    if (collectionName === 'clients') {
        if (items.length >= currentLimits.clients) return { allowed: false, message: `Client limit reached (${currentLimits.clients}). Upgrade your plan for higher limits.`, code: 'LIMIT_REACHED' };
    }
    if (collectionName === 'products') {
        if (items.length >= currentLimits.products) return { allowed: false, message: `Product limit reached (${currentLimits.products}). Upgrade your plan for higher limits.`, code: 'LIMIT_REACHED' };
    }

    // Check for loophole: user downgraded
    if (collectionName === 'invoices' || collectionName === 'quotations') {
        let myClients = new Array(10).fill({}); // 10 clients (allowed on Pro, not Free)
        let myProducts = new Array(10).fill({});

        if (myClients.length > currentLimits.clients || myProducts.length > currentLimits.products) {
            return { allowed: false, message: `You have more clients/products than allowed on your current plan. Please upgrade or reduce your active list to continue creating invoices.`, code: 'OVER_LIMIT_FROZEN' };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let thisMonthCount = items.filter(item => {
            const d = new Date(item.dateAdded || 0);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;

        if (thisMonthCount >= currentLimits.documents) {
             return { allowed: false, message: `Monthly limit reached for ${collectionName} (${currentLimits.documents}). Upgrade your plan for higher limits.`, code: 'LIMIT_REACHED' };
        }
    }

    return { allowed: true };
}


async function runTest() {
    let items = new Array(24).fill({ dateAdded: new Date().toISOString() });

    // Test Pro limits logic
    let res = await checkLimits('b_123', 'clients', items);
    assert(res.allowed === true, "24 clients should be allowed on Pro");

    items.push({ dateAdded: new Date().toISOString() });
    res = await checkLimits('b_123', 'clients', items);
    assert(res.allowed === false, "25 clients should hit limit on Pro");

    res = await checkLimits('b_123', 'contracts', []);
    assert(res.allowed === true, "Contracts should be allowed on Pro");

    res = await checkLimits('b_123', 'invoices', items);
    assert(res.allowed === false, "25 invoices should hit limit on Pro");

    console.log("All limit tests passed!");
}

runTest();
