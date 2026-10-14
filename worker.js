const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions(request) {
  return new Response(null, { headers: corsHeaders });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateId() {
  return crypto.randomUUID();
}

// Helper to verify a token against stored sessions for public users
async function verifyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (token === 'dtech_token_secret') {
      return { username: 'dtech_admin', business_id: 'dtech' };
  }

  try {
    const sessionsData = await env.DTECH_KV.get('sessions');
    const sessions = sessionsData ? JSON.parse(sessionsData) : {};

    if (sessions[token]) {
        // Optionally add expiration logic here
        return sessions[token];
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Generic KV handler
async function handleKVCollection(request, env, collectionName, business_id) {
  if (request.method === 'GET') {
    const data = await env.DTECH_KV.get(collectionName);
    const items = data ? JSON.parse(data) : [];
    // Filter by business_id
    const filteredItems = items.filter(item => item.business_id === business_id);

    // Always sort by some date if possible, else just return
    filteredItems.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
    return jsonResponse({ success: true, [collectionName]: filteredItems });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      body.id = generateId();
      body.business_id = business_id;
      body.dateAdded = new Date().toISOString();

      let data = await env.DTECH_KV.get(collectionName);
      let items = data ? JSON.parse(data) : [];
      items.push(body);

      await env.DTECH_KV.put(collectionName, JSON.stringify(items));
      return jsonResponse({ success: true, item: body }, 201);
    } catch (e) {
      return jsonResponse({ success: false, message: `Failed to create in ${collectionName}`, error: e.message }, 500);
    }
  }
}

async function handleKVSingle(request, env, collectionName, id, business_id) {
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      let data = await env.DTECH_KV.get(collectionName);
      let items = data ? JSON.parse(data) : [];

      const index = items.findIndex(c => c.id === id && c.business_id === business_id);
      if (index === -1) {
        return jsonResponse({ success: false, message: 'Item not found' }, 404);
      }

      const originalDate = items[index].dateAdded;
      items[index] = { ...items[index], ...body, id: id, business_id: business_id, dateAdded: originalDate };
      await env.DTECH_KV.put(collectionName, JSON.stringify(items));

      return jsonResponse({ success: true, item: items[index] });
    } catch (e) {
      return jsonResponse({ success: false, message: `Failed to update in ${collectionName}` }, 500);
    }
  }

  if (request.method === 'DELETE') {
    try {
      let data = await env.DTECH_KV.get(collectionName);
      let items = data ? JSON.parse(data) : [];

      const newItems = items.filter(c => !(c.id === id && c.business_id === business_id));
      if (items.length === newItems.length) {
        return jsonResponse({ success: false, message: 'Item not found' }, 404);
      }

      await env.DTECH_KV.put(collectionName, JSON.stringify(newItems));
      return jsonResponse({ success: true, message: 'Item deleted' });
    } catch (e) {
      return jsonResponse({ success: false, message: `Failed to delete from ${collectionName}` }, 500);
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // /api/register (public users)
    if (path === '/api/register' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { username, password, businessName } = body;

        if (!username || !password || !businessName) {
           return jsonResponse({ success: false, message: 'Missing required fields' }, 400);
        }

        let accountsData = await env.DTECH_KV.get('accounts');
        let accounts = accountsData ? JSON.parse(accountsData) : [];

        if (accounts.some(acc => acc.username === username)) {
           return jsonResponse({ success: false, message: 'Username already exists' }, 409);
        }

        const newAccount = {
            id: generateId(),
            username,
            password, // Storing in plain text as per context constraints for simple app
            businessName,
            business_id: generateId(), // Unique identifier for their tenant data
            dateAdded: new Date().toISOString()
        };

        accounts.push(newAccount);
        await env.DTECH_KV.put('accounts', JSON.stringify(accounts));

        // Generate secure random token
        const token = crypto.randomUUID() + crypto.randomUUID();

        // Store session
        let sessionsData = await env.DTECH_KV.get('sessions');
        let sessions = sessionsData ? JSON.parse(sessionsData) : {};
        sessions[token] = { username: newAccount.username, business_id: newAccount.business_id, role: 'Admin' };
        await env.DTECH_KV.put('sessions', JSON.stringify(sessions));

        return jsonResponse({
            success: true,
            token: token,
            user: { role: 'Admin', username: newAccount.username, businessName: newAccount.businessName }
        }, 201);
      } catch (e) {
        return jsonResponse({ success: false, message: 'Bad request' }, 400);
      }
    }

    // /api/login
    if (path === '/api/login' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { username, password } = body;

        if (username === 'dtech_admin' && password === 'all_mighty_push') {
          return jsonResponse({
            success: true,
            token: 'dtech_token_secret',
            user: { role: 'Super Admin', username: 'dtech_admin' }
          });
        }

        // Check accounts for public users
        let accountsData = await env.DTECH_KV.get('accounts');
        let accounts = accountsData ? JSON.parse(accountsData) : [];
        const account = accounts.find(acc => acc.username === username && acc.password === password);

        if (account) {
            const token = crypto.randomUUID() + crypto.randomUUID();

            // Store session
            let sessionsData = await env.DTECH_KV.get('sessions');
            let sessions = sessionsData ? JSON.parse(sessionsData) : {};
            sessions[token] = { username: account.username, business_id: account.business_id, role: 'Admin' };
            await env.DTECH_KV.put('sessions', JSON.stringify(sessions));

            return jsonResponse({
                success: true,
                token: token,
                user: { role: 'Admin', username: account.username, businessName: account.businessName }
            });
        }

        return jsonResponse({ success: false, message: 'Invalid credentials' }, 401);
      } catch (e) {
        return jsonResponse({ success: false, message: 'Bad request' }, 400);
      }
    }

    // Require Auth for all other routes
    const authPayload = await verifyAuth(request, env);
    if (!authPayload) {
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }
    const business_id = authPayload.business_id;

    // /api/yoco/checkout
    if (path === '/api/yoco/checkout' && request.method === 'POST') {
       return handleYocoCheckout(request, env, authPayload);
    }

    // /api/settings (for public user business settings)
    if (path === '/api/settings') {
       if (request.method === 'GET') {
           const settingsData = await env.DTECH_KV.get('settings');
           const settings = settingsData ? JSON.parse(settingsData) : [];
           const mySettings = settings.find(s => s.business_id === business_id) || {};
           return jsonResponse({ success: true, settings: mySettings });
       }
       if (request.method === 'PUT') {
           try {
             const body = await request.json();
             let settingsData = await env.DTECH_KV.get('settings');
             let settings = settingsData ? JSON.parse(settingsData) : [];

             const index = settings.findIndex(s => s.business_id === business_id);
             if (index === -1) {
                 settings.push({ ...body, business_id });
             } else {
                 settings[index] = { ...settings[index], ...body, business_id };
             }

             await env.DTECH_KV.put('settings', JSON.stringify(settings));
             return jsonResponse({ success: true, message: 'Settings saved' });
           } catch (e) {
             return jsonResponse({ success: false, message: 'Failed to update settings' }, 500);
           }
       }
    }

    const collections = ['clients', 'products', 'quotations', 'invoices', 'licenses', 'payments', 'contracts'];

    // Dynamic routing for collections
    for (const collection of collections) {
      const basePath = `/api/${collection}`;
      if (path === basePath) {
        return handleKVCollection(request, env, collection, business_id);
      }
      if (path.startsWith(`${basePath}/`) && path.split('/').length === 4) {
        const id = path.split('/')[3];
        return handleKVSingle(request, env, collection, id, business_id);
      }
    }

    // /api/dashboard
    if (path === '/api/dashboard' && request.method === 'GET') {
      try {
        const clientsData = await env.DTECH_KV.get('clients');
        const allClients = clientsData ? JSON.parse(clientsData) : [];
        const clients = allClients.filter(c => c.business_id === business_id);

        const licensesData = await env.DTECH_KV.get('licenses');
        const allLicenses = licensesData ? JSON.parse(licensesData) : [];
        const licenses = allLicenses.filter(l => l.business_id === business_id);
        const activeLicenses = licenses.filter(l => l.status === 'Active').length;

        const invoicesData = await env.DTECH_KV.get('invoices');
        const allInvoices = invoicesData ? JSON.parse(invoicesData) : [];
        const invoices = allInvoices.filter(i => i.business_id === business_id);
        const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        // Very basic monthly revenue estimation (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = invoices.filter(i => {
            const d = new Date(i.dateAdded);
            return i.status === 'Paid' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        // Calculate revenue for the last 6 months for the chart
        const chartData = {
          labels: [],
          data: []
        };

        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setDate(1); // Prevent date wrapping edge case on 31st of months
          d.setMonth(d.getMonth() - i);
          const month = d.toLocaleString('default', { month: 'short' });
          const year = d.getFullYear();
          chartData.labels.push(`${month} ${year}`);

          const monthRev = invoices.filter(inv => {
            const invDate = new Date(inv.dateAdded);
            return inv.status === 'Paid' && invDate.getMonth() === d.getMonth() && invDate.getFullYear() === year;
          }).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

          chartData.data.push(monthRev);
        }

        return jsonResponse({
          success: true,
          stats: {
            totalClients: clients.length,
            activeLicenses: activeLicenses,
            monthlyRevenue: monthlyRevenue,
            totalRevenue: totalRevenue
          },
          chartData: chartData
        });
      } catch (e) {
        return jsonResponse({ success: false, message: 'Failed to fetch dashboard' }, 500);
      }
    }

    return jsonResponse({ success: false, message: 'Not found' }, 404);
  }
};

// --- Yoco Checkout Handler ---
async function handleYocoCheckout(request, env, authPayload) {
    if (!authPayload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    const session = authPayload;

    try {
        const body = await request.json();

        // Ensure required parameters are provided (defaults to R80 plan if not)
        const amount = body.amount || 8000;
        const currency = body.currency || 'ZAR';
        const successUrl = body.successUrl || 'https://example.com/success';
        const cancelUrl = body.cancelUrl || 'https://example.com/cancel';

        // Use environment variable if available, fallback to provided test key
        const yocoSecretKey = env.YOCO_SECRET_KEY || 'sk_test_3f5bc6d3V45ZM476554422498e8a';

        const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${yocoSecretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                currency: currency,
                successUrl: successUrl,
                cancelUrl: cancelUrl,
                metadata: {
                    business_id: session.business_id,
                    purpose: "Subscription Plan"
                }
            })
        });

        if (!yocoResponse.ok) {
            const errorText = await yocoResponse.text();
            console.error('Yoco API Error:', errorText);
            return new Response(JSON.stringify({ error: 'Failed to initiate payment with Yoco', details: errorText }), { status: 500, headers: corsHeaders });
        }

        const yocoData = await yocoResponse.json();

        return new Response(JSON.stringify({
            redirectUrl: yocoData.redirectUrl,
            checkoutId: yocoData.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}
