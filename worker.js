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

    // /api/clients
    if (path === '/api/clients') {
      if (request.method === 'GET') {
        const clientsData = await env.DTECH_KV.get('clients');
        const clients = clientsData ? JSON.parse(clientsData) : [];
        return jsonResponse({ success: true, clients: clients.sort((a,b) => new Date(b.dateAdded) - new Date(a.dateAdded)) });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          body.id = generateId();
          body.dateAdded = new Date().toISOString();

          let clientsData = await env.DTECH_KV.get('clients');
          let clients = clientsData ? JSON.parse(clientsData) : [];
          clients.push(body);

          await env.DTECH_KV.put('clients', JSON.stringify(clients));
          return jsonResponse({ success: true, client: body }, 201);
        } catch (e) {
          return jsonResponse({ success: false, message: 'Failed to create client', error: e.message }, 500);
        }
      }
    }

    // /api/clients/:id
    if (path.startsWith('/api/clients/') && path.split('/').length === 4) {
      const clientId = path.split('/')[3];

      if (request.method === 'PUT') {
        try {
          const body = await request.json();
          let clientsData = await env.DTECH_KV.get('clients');
          let clients = clientsData ? JSON.parse(clientsData) : [];

          const index = clients.findIndex(c => c.id === clientId);
          if (index === -1) {
            return jsonResponse({ success: false, message: 'Client not found' }, 404);
          }

          // Do not allow overriding id or dateAdded by accident
          const originalDate = clients[index].dateAdded;
          clients[index] = { ...clients[index], ...body, id: clientId, dateAdded: originalDate };
          await env.DTECH_KV.put('clients', JSON.stringify(clients));

          return jsonResponse({ success: true, client: clients[index] });
        } catch (e) {
          return jsonResponse({ success: false, message: 'Failed to update client' }, 500);
        }
      }

      if (request.method === 'DELETE') {
        try {
          let clientsData = await env.DTECH_KV.get('clients');
          let clients = clientsData ? JSON.parse(clientsData) : [];

          const newClients = clients.filter(c => c.id !== clientId);
          if (clients.length === newClients.length) {
            return jsonResponse({ success: false, message: 'Client not found' }, 404);
          }

          await env.DTECH_KV.put('clients', JSON.stringify(newClients));
          return jsonResponse({ success: true, message: 'Client deleted' });
        } catch (e) {
          return jsonResponse({ success: false, message: 'Failed to delete client' }, 500);
        }
      }
    }

    // /api/dashboard
    if (path === '/api/dashboard' && request.method === 'GET') {
      try {
        const clientsData = await env.DTECH_KV.get('clients');
        const clients = clientsData ? JSON.parse(clientsData) : [];
        const activeClients = clients.filter(c => c.status === 'Active').length;

        return jsonResponse({
          success: true,
          stats: {
            totalClients: clients.length,
            activeLicenses: activeClients * 2, // Mock logic for now
            monthlyRevenue: 15400,
            totalRevenue: 125000
          }
        });
      } catch (e) {
        return jsonResponse({ success: false, message: 'Failed to fetch dashboard' }, 500);
      }
    }

    return jsonResponse({ success: false, message: 'Not found' }, 404);
  }
};
