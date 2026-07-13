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
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License key / Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status & Expiry</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.licenses.forEach(l => {
            const client = this.clients.find(c => c.id === l.clientId);
            const product = this.products.find(p => p.id === l.productId);
            const expiry = new Date(l.expiryDate);
            const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));

            let statusColor = l.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            if (daysLeft < 30 && l.status === 'Active') statusColor = 'bg-yellow-100 text-yellow-800';

            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Key/Client:</div>
                        <div class="text-right md:text-left">
                            <div class="text-sm font-medium font-mono text-gray-900 dark:text-white">${l.licenseKey}</div>
                            <div class="text-xs text-gray-500">${client ? client.companyName : 'Unknown Client'}</div>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Product:</div>
                        <div class="text-right md:text-left">${product ? product.name : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${l.status}</span>
                            <div class="text-xs text-gray-500 mt-1">${daysLeft} days left (${expiry.toLocaleDateString()})</div>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="licensesManager.renewLicense('${l.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Renew"><i class="fas fa-sync-alt"></i></button>
                            <button onclick="licensesManager.deleteLicense('${l.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(license = null) {
        if (!this.clients || this.clients.length === 0 || !this.products || this.products.length === 0) {
            return Swal.fire('Error', 'Please add clients and products first.', 'error');
        }

        const l = license || {};
        const isEdit = !!license;
        const title = isEdit ? 'Edit License' : 'Issue License';

        let clientOptions = this.clients.map(c => `<option value="${c.id}" ${l.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');
        let productOptions = this.products.map(p => `<option value="${p.id}" ${l.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');

        const d = new Date();
        const startStr = isEdit && l.startDate ? l.startDate.split('T')[0] : d.toISOString().split('T')[0];

        d.setMonth(d.getMonth() + 12);
        const expStr = isEdit && l.expiryDate ? l.expiryDate.split('T')[0] : d.toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Client *</label><select id="swal-l-client" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Client</option>${clientOptions}</select></div>
                        <div><label class="font-medium">Product *</label><select id="swal-l-product" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Product</option>${productOptions}</select></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">License Type</label><select id="swal-l-type" class="swal2-input mt-1 w-full m-0">
                            <option value="Trial" ${l.licenseType==='Trial'?'selected':''}>Trial</option>
                            <option value="Monthly" ${l.licenseType==='Monthly'?'selected':''}>Monthly</option>
                            <option value="Annual" ${l.licenseType==='Annual'?'selected':''}>Annual</option>
                            <option value="Lifetime" ${l.licenseType==='Lifetime'?'selected':''}>Lifetime</option>
                        </select></div>
                        <div><label class="font-medium">Status</label><select id="swal-l-status" class="swal2-input mt-1 w-full m-0"><option value="Active" ${l.status==='Active'?'selected':''}>Active</option><option value="Expired" ${l.status==='Expired'?'selected':''}>Expired</option><option value="Revoked" ${l.status==='Revoked'?'selected':''}>Revoked</option></select></div>
                    </div>
                    <div><label class="font-medium">License Key (Auto-generated if empty)</label><input id="swal-l-key" class="swal2-input mt-1 w-full m-0" value="${l.licenseKey || ''}" placeholder="Leave blank to auto-generate"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Start Date</label><input type="date" id="swal-l-start" class="swal2-input mt-1 w-full m-0" value="${startStr}"></div>
                        <div><label class="font-medium">Expiry Date</label><input type="date" id="swal-l-exp" class="swal2-input mt-1 w-full m-0" value="${expStr}"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Max Activations</label><input type="number" id="swal-l-max" class="swal2-input mt-1 w-full m-0" value="${l.maxActivations || 1}"></div>
                        <div><label class="font-medium">Auto Renewal</label><select id="swal-l-autorenew" class="swal2-input mt-1 w-full m-0"><option value="No" ${l.autoRenewal==='No'?'selected':''}>No</option><option value="Yes" ${l.autoRenewal==='Yes'?'selected':''}>Yes</option></select></div>
                        <div><label class="font-medium">Renewal Price</label><input id="swal-l-renewprice" class="swal2-input mt-1 w-full m-0" value="${l.renewalPrice||''}"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Domain / Website URL</label><input id="swal-l-domain" class="swal2-input mt-1 w-full m-0" value="${l.domain || ''}" placeholder="https://..."></div>
                        <div><label class="font-medium">Device ID / Installation ID</label><input id="swal-l-device" class="swal2-input mt-1 w-full m-0" value="${l.deviceId || ''}" placeholder="..."></div>
                    </div>
                    <div><label class="font-medium">Internal Notes</label><input id="swal-l-notes" class="swal2-input mt-1 w-full m-0" value="${l.notes || ''}" placeholder="..."></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            width: '600px',
            preConfirm: () => {
                const cid = document.getElementById('swal-l-client').value;
                const pid = document.getElementById('swal-l-product').value;
                if (!cid || !pid) {
                    Swal.showValidationMessage('Client and Product are required');
                    return false;
                }

                let key = document.getElementById('swal-l-key').value;
                if (!key) key = 'DTECH-' + Math.random().toString(36).substring(2, 10).toUpperCase();

                // To correctly store ISO date from input date, we add time (UTC)
                const sDate = document.getElementById('swal-l-start').value;
                const eDate = document.getElementById('swal-l-exp').value;

                return {
                    clientId: cid,
                    productId: pid,
                    licenseType: document.getElementById('swal-l-type').value,
                    status: document.getElementById('swal-l-status').value,
                    licenseKey: key,
                    startDate: sDate ? new Date(sDate).toISOString() : new Date().toISOString(),
                    expiryDate: eDate ? new Date(eDate).toISOString() : new Date().toISOString(),
                    maxActivations: parseInt(document.getElementById('swal-l-max').value) || 1,
                    autoRenewal: document.getElementById('swal-l-autorenew').value,
                    renewalPrice: document.getElementById('swal-l-renewprice').value,
                    domain: document.getElementById('swal-l-domain').value,
                    deviceId: document.getElementById('swal-l-device').value,
                    notes: document.getElementById('swal-l-notes').value
                }
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    await API.request(`/api/licenses/${l.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'License updated', 'success');
                } else {
                    await API.request('/api/licenses', { method: 'POST', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'License issued', 'success');
                }
                this.loadLicenses();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editLicense(id) {
        const l = this.licenses.find(x => x.id === id);
        if (l) this.openModal(l);
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