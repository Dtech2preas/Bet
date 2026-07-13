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

async function verifyAuth(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== 'Bearer dtech_token_secret') {
    return false;
  }
  return true;
}

// Generic KV handler
async function handleKVCollection(request, env, collectionName) {
  if (request.method === 'GET') {
    const data = await env.DTECH_KV.get(collectionName);
    const items = data ? JSON.parse(data) : [];
    // Always sort by some date if possible, else just return
    items.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
    return jsonResponse({ success: true, [collectionName]: items });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      body.id = generateId();
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

async function handleKVSingle(request, env, collectionName, id) {
  if (request.method === 'PUT') {
    try {
      const body = await request.json();
      let data = await env.DTECH_KV.get(collectionName);
      let items = data ? JSON.parse(data) : [];

      const index = items.findIndex(c => c.id === id);
      if (index === -1) {
        return jsonResponse({ success: false, message: 'Item not found' }, 404);
      }

      const originalDate = items[index].dateAdded;
      items[index] = { ...items[index], ...body, id: id, dateAdded: originalDate };
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

      const newItems = items.filter(c => c.id !== id);
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

        return jsonResponse({ success: false, message: 'Invalid credentials' }, 401);
      } catch (e) {
        return jsonResponse({ success: false, message: 'Bad request' }, 400);
      }
    }

    // Require Auth for all other routes
    const isAuthorized = await verifyAuth(request);
    if (!isAuthorized) {
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    const collections = ['clients', 'products', 'quotations', 'invoices', 'licenses', 'payments', 'contracts'];

    // Dynamic routing for collections
    for (const collection of collections) {
      const basePath = `/api/${collection}`;
      if (path === basePath) {
        return handleKVCollection(request, env, collection);
      }
      if (path.startsWith(`${basePath}/`) && path.split('/').length === 4) {
        const id = path.split('/')[3];
        return handleKVSingle(request, env, collection, id);
      }
    }

    // /api/dashboard
    if (path === '/api/dashboard' && request.method === 'GET') {
      try {
        const clientsData = await env.DTECH_KV.get('clients');
        const clients = clientsData ? JSON.parse(clientsData) : [];

        const licensesData = await env.DTECH_KV.get('licenses');
        const licenses = licensesData ? JSON.parse(licensesData) : [];
        const activeLicenses = licenses.filter(l => l.status === 'Active').length;

        const invoicesData = await env.DTECH_KV.get('invoices');
        const invoices = invoicesData ? JSON.parse(invoicesData) : [];
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
