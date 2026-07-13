// js/licenses.js

const licensesManager = {
    licenses: [],

    async loadLicenses() {
        const container = document.getElementById('licenses-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [licRes, clientsRes, prodRes] = await Promise.all([
                API.request('/api/licenses'),
                API.request('/api/clients'),
                API.request('/api/products')
            ]);

            if (licRes.success) {
                this.licenses = licRes.licenses;
                this.clients = clientsRes.clients;
                this.products = prodRes.products;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('licenses-container');
        if (this.licenses.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No licenses issued.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License key / Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status & Expiry</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        `;
        this.licenses.forEach(l => {
            const client = this.clients.find(c => c.id === l.clientId);
            const product = this.products.find(p => p.id === l.productId);
            const expiry = new Date(l.expiryDate);
            const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));

            let statusColor = l.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            if (daysLeft < 30 && l.status === 'Active') statusColor = 'bg-yellow-100 text-yellow-800';

            html += `
                <tr>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium font-mono text-gray-900 dark:text-white">${l.licenseKey}</div>
                        <div class="text-xs text-gray-500">${client ? client.companyName : 'Unknown Client'}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">${product ? product.name : 'Unknown'}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${l.status}</span>
                        <div class="text-xs text-gray-500 mt-1">${daysLeft} days left (${expiry.toLocaleDateString()})</div>
                    </td>
                    <td class="px-6 py-4 text-right text-sm">
                        <button onclick="licensesManager.renewLicense('${l.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Renew"><i class="fas fa-sync-alt"></i></button>
                        <button onclick="licensesManager.deleteLicense('${l.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal() {
        if (!this.clients || this.clients.length === 0 || !this.products || this.products.length === 0) {
            return Swal.fire('Error', 'Please add clients and products first.', 'error');
        }

        let clientOptions = this.clients.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');
        let productOptions = this.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

        const { value: formValues } = await Swal.fire({
            title: 'Issue License',
            html: `
                <select id="swal-l-client" class="swal2-input"><option value="" disabled selected>Select Client</option>${clientOptions}</select>
                <select id="swal-l-product" class="swal2-input"><option value="" disabled selected>Select Product</option>${productOptions}</select>
                <select id="swal-l-duration" class="swal2-input">
                    <option value="1">1 Month</option>
                    <option value="12">1 Year</option>
                </select>
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    clientId: document.getElementById('swal-l-client').value,
                    productId: document.getElementById('swal-l-product').value,
                    duration: parseInt(document.getElementById('swal-l-duration').value)
                }
            }
        });

        if (formValues && formValues.clientId && formValues.productId) {
            try {
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + formValues.duration);

                const data = {
                    ...formValues,
                    licenseKey: 'DTECH-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                    status: 'Active',
                    startDate: new Date().toISOString(),
                    expiryDate: expiry.toISOString()
                };

                await API.request('/api/licenses', { method: 'POST', body: JSON.stringify(data) });
                Swal.fire('Success', 'License issued', 'success');
                this.loadLicenses();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async renewLicense(id) {
        const license = this.licenses.find(l => l.id === id);
        if (!license) return;

        const { value: months } = await Swal.fire({
            title: 'Renew License',
            input: 'select',
            inputOptions: { '1': '1 Month', '12': '1 Year' },
            showCancelButton: true
        });

        if (months) {
            try {
                const newExpiry = new Date(license.expiryDate);
                newExpiry.setMonth(newExpiry.getMonth() + parseInt(months));

                await API.request(`/api/licenses/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ expiryDate: newExpiry.toISOString(), status: 'Active' })
                });

                Swal.fire('Success', 'License renewed!', 'success');
                this.loadLicenses();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async deleteLicense(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/licenses/${id}`, { method: 'DELETE' });
            this.loadLicenses();
        }
    }
};