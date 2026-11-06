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

    ensureDrawer() {
        let modal = document.getElementById('licenseDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'licenseDrawerModal';
            modal.className = 'fixed inset-0 z-50 overflow-hidden hidden';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" id="licenseDrawerOverlay"></div>
                <div class="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                    <div class="w-screen max-w-xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="licenseDrawerPanel">
                        <div class="p-4 sm:p-6 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-card">
                            <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="licenseDrawerTitle">Issue License</h3>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="licensesManager.closeModal()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="licenseDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="licensesManager.saveLicense(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-5" id="licenseDrawerContent">
                                <input id="drawer-l-id" type="hidden">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                                        <select id="drawer-l-client" required class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product *</label>
                                        <select id="drawer-l-product" required class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></select>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Type</label>
                                        <select id="drawer-l-type" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="Trial">Trial</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Annual">Annual</option>
                                            <option value="Lifetime">Lifetime</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                        <select id="drawer-l-status" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="Active">Active</option>
                                            <option value="Expired">Expired</option>
                                            <option value="Revoked">Revoked</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Key</label>
                                    <input type="text" id="drawer-l-key" placeholder="Leave blank to auto-generate" class="w-full font-mono rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                        <input type="date" id="drawer-l-start" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                                        <input type="date" id="drawer-l-exp" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Max Activations</label>
                                        <input type="number" id="drawer-l-max" min="1" value="1" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Auto Renewal</label>
                                        <select id="drawer-l-autorenew" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Renewal Price</label>
                                        <input type="number" id="drawer-l-renewprice" placeholder="0.00" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain / URL</label>
                                        <input type="url" id="drawer-l-domain" placeholder="https://..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device / Machine ID</label>
                                        <input type="text" id="drawer-l-device" placeholder="Optional hardware ID" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
                                    <textarea id="drawer-l-notes" rows="2" placeholder="Internal remarks..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></textarea>
                                </div>
                            </div>
                            <div class="p-4 sm:p-6 border-t dark:border-dark-border flex justify-end space-x-3 bg-gray-50 dark:bg-dark-card flex-shrink-0">
                                <button type="button" onclick="licensesManager.closeModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" id="licenseDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save License</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'licenseDrawerOverlay') licensesManager.closeModal();
            });
        }
        return modal;
    },

    async openModal(license = null) {
        if (!this.clients || this.clients.length === 0 || !this.products || this.products.length === 0) {
            return Swal.fire('Error', 'Please add clients and products first.', 'error');
        }

        const modal = this.ensureDrawer();
        const panel = document.getElementById('licenseDrawerPanel');
        const form = document.getElementById('licenseDrawerForm');
        if (form) form.reset();

        const l = license || {};
        const isEdit = !!license;

        document.getElementById('licenseDrawerTitle').innerText = isEdit ? 'Edit License' : 'Issue New License';
        document.getElementById('licenseDrawerSubmitBtn').innerText = isEdit ? 'Save Changes' : 'Issue License';

        const clientSelect = document.getElementById('drawer-l-client');
        clientSelect.innerHTML = '<option value="" disabled ' + (!isEdit ? 'selected' : '') + '>Select Client</option>' +
            this.clients.map(c => `<option value="${c.id}" ${l.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        const productSelect = document.getElementById('drawer-l-product');
        productSelect.innerHTML = '<option value="" disabled ' + (!isEdit ? 'selected' : '') + '>Select Product</option>' +
            this.products.map(p => `<option value="${p.id}" ${l.productId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');

        const d = new Date();
        const startStr = isEdit && l.startDate ? l.startDate.split('T')[0] : d.toISOString().split('T')[0];
        d.setMonth(d.getMonth() + 12);
        const expStr = isEdit && l.expiryDate ? l.expiryDate.split('T')[0] : d.toISOString().split('T')[0];

        document.getElementById('drawer-l-id').value = isEdit ? l.id : '';
        document.getElementById('drawer-l-type').value = isEdit ? (l.licenseType || 'Annual') : 'Annual';
        document.getElementById('drawer-l-status').value = isEdit ? (l.status || 'Active') : 'Active';
        document.getElementById('drawer-l-key').value = isEdit ? (l.licenseKey || '') : '';
        document.getElementById('drawer-l-start').value = startStr;
        document.getElementById('drawer-l-exp').value = expStr;
        document.getElementById('drawer-l-max').value = isEdit ? (l.maxActivations || 1) : 1;
        document.getElementById('drawer-l-autorenew').value = isEdit ? (l.autoRenewal || 'No') : 'No';
        document.getElementById('drawer-l-renewprice').value = isEdit ? (l.renewalPrice || '') : '';
        document.getElementById('drawer-l-domain').value = isEdit ? (l.domain || '') : '';
        document.getElementById('drawer-l-device').value = isEdit ? (l.deviceId || '') : '';
        document.getElementById('drawer-l-notes').value = isEdit ? (l.notes || '') : '';

        modal.classList.remove('hidden');
        setTimeout(() => {
            if (panel) panel.classList.remove('translate-x-full');
        }, 10);
    },

    closeModal() {
        const modal = document.getElementById('licenseDrawerModal');
        const panel = document.getElementById('licenseDrawerPanel');
        if (panel) panel.classList.add('translate-x-full');
        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
        }, 300);
    },

    async saveLicense(e) {
        e.preventDefault();
        const id = document.getElementById('drawer-l-id').value;
        const cid = document.getElementById('drawer-l-client').value;
        const pid = document.getElementById('drawer-l-product').value;

        if (!cid || !pid) {
            Swal.fire('Error', 'Client and Product are required', 'warning');
            return;
        }

        let key = document.getElementById('drawer-l-key').value.trim();
        if (!key) key = 'DTECH-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        const sDate = document.getElementById('drawer-l-start').value;
        const eDate = document.getElementById('drawer-l-exp').value;

        const formValues = {
            clientId: cid,
            productId: pid,
            licenseType: document.getElementById('drawer-l-type').value,
            status: document.getElementById('drawer-l-status').value,
            licenseKey: key,
            startDate: sDate ? new Date(sDate).toISOString() : new Date().toISOString(),
            expiryDate: eDate ? new Date(eDate).toISOString() : new Date().toISOString(),
            maxActivations: parseInt(document.getElementById('drawer-l-max').value) || 1,
            autoRenewal: document.getElementById('drawer-l-autorenew').value,
            renewalPrice: document.getElementById('drawer-l-renewprice').value,
            domain: document.getElementById('drawer-l-domain').value.trim(),
            deviceId: document.getElementById('drawer-l-device').value.trim(),
            notes: document.getElementById('drawer-l-notes').value.trim()
        };

        const submitBtn = document.getElementById('licenseDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

        try {
            if (id) {
                await API.request(`/api/licenses/${id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                Swal.fire({ icon: 'success', title: 'Updated', text: 'License updated successfully', timer: 1500, showConfirmButton: false });
            } else {
                await API.request('/api/licenses', { method: 'POST', body: JSON.stringify(formValues) });
                Swal.fire({ icon: 'success', title: 'Issued', text: 'License issued successfully', timer: 1500, showConfirmButton: false });
            }
            this.closeModal();
            this.loadLicenses();
            if (typeof app !== 'undefined' && app.loadDashboardData) app.loadDashboardData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = id ? 'Save Changes' : 'Issue License';
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