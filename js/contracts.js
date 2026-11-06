// js/contracts.js

const contractsManager = {
    contracts: [],

    async loadContracts() {
        const container = document.getElementById('contracts-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [cRes, clRes] = await Promise.all([
                API.request('/api/contracts'),
                API.request('/api/clients')
            ]);
            if (cRes.success) {
                this.contracts = cRes.contracts;
                this.clients = clRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('contracts-container');
        if (this.contracts.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No contracts found.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract Ref</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.contracts.forEach(con => {
            const client = this.clients.find(c => c.id === con.clientId);
            const statusColor = con.status === 'Signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Contract Ref:</div>
                        <div class="text-right md:text-left">${con.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Client:</div>
                        <div class="text-right md:text-left">${client ? client.companyName : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full ${statusColor}">${con.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="contractsManager.toggleStatus('${con.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Mark Signed/Unsigned"><i class="fas fa-check-circle"></i></button>
                            <button onclick="contractsManager.download('${con.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Download PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="contractsManager.deleteContract('${con.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    ensureDrawer() {
        let modal = document.getElementById('contractDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'contractDrawerModal';
            modal.className = 'fixed inset-0 z-50 overflow-hidden hidden';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" id="contractDrawerOverlay"></div>
                <div class="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                    <div class="w-screen max-w-2xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="contractDrawerPanel">
                        <div class="p-4 sm:p-6 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-card">
                            <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="contractDrawerTitle">Generate Contract</h3>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="contractsManager.closeModal()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="contractDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="contractsManager.saveContract(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-5" id="contractDrawerContent">
                                <input id="drawer-c-id" type="hidden">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                                        <select id="drawer-c-client" required class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contract Type</label>
                                        <select id="drawer-c-type" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="SLA">SLA (Service Level Agreement)</option>
                                            <option value="NDA">NDA (Non-Disclosure Agreement)</option>
                                            <option value="Maintenance">Maintenance Agreement</option>
                                            <option value="License">License Agreement</option>
                                            <option value="General">General Contract</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                        <input type="date" id="drawer-c-start" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                        <input type="date" id="drawer-c-end" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Renewal Option</label>
                                        <select id="drawer-c-renew" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="Yes">Yes (Auto-Renew)</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signing Status</label>
                                        <select id="drawer-c-status" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="Draft">Draft</option>
                                            <option value="Sent">Sent</option>
                                            <option value="Signed">Signed</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Sign Date</label>
                                        <input type="date" id="drawer-c-csign" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Sign Date</label>
                                        <input type="date" id="drawer-c-dsign" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div class="border-t dark:border-gray-700 pt-3">
                                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Linked Records</h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related License</label>
                                            <select id="drawer-c-license" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Invoice</label>
                                            <select id="drawer-c-invoice" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contract Terms & Conditions</label>
                                    <textarea id="drawer-c-content" rows="7" class="w-full font-mono text-xs rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 border shadow-sm focus:border-dtech-500"></textarea>
                                </div>
                            </div>
                            <div class="p-4 sm:p-6 border-t dark:border-dark-border flex justify-end space-x-3 bg-gray-50 dark:bg-dark-card flex-shrink-0">
                                <button type="button" onclick="contractsManager.closeModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" id="contractDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Contract</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'contractDrawerOverlay') contractsManager.closeModal();
            });
        }
        return modal;
    },

    async openModal(contract = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Please add a client first', 'error');

        const modal = this.ensureDrawer();
        const panel = document.getElementById('contractDrawerPanel');
        const form = document.getElementById('contractDrawerForm');
        if (form) form.reset();

        const con = contract || {};
        const isEdit = !!contract;

        document.getElementById('contractDrawerTitle').innerText = isEdit ? 'Edit Contract' : 'Generate Contract';
        document.getElementById('contractDrawerSubmitBtn').innerText = isEdit ? 'Save Changes' : 'Save Contract';

        const clientSelect = document.getElementById('drawer-c-client');
        clientSelect.innerHTML = '<option value="" disabled ' + (!isEdit ? 'selected' : '') + '>Select Client</option>' +
            this.clients.map(c => `<option value="${c.id}" ${con.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        const licenseSelect = document.getElementById('drawer-c-license');
        licenseSelect.innerHTML = '<option value="">No License Linked</option>';
        try {
            const lRes = await API.request('/api/licenses');
            if (lRes.success && lRes.licenses) {
                licenseSelect.innerHTML += lRes.licenses.map(l => `<option value="${l.id}" ${con.licenseId === l.id ? 'selected' : ''}>${l.licenseKey}</option>`).join('');
            }
        } catch(e) {}

        const invoiceSelect = document.getElementById('drawer-c-invoice');
        invoiceSelect.innerHTML = '<option value="">No Invoice Linked</option>';
        try {
            const iRes = await API.request('/api/invoices');
            if (iRes.success && iRes.invoices) {
                invoiceSelect.innerHTML += iRes.invoices.map(i => `<option value="${i.id}" ${con.invoiceId === i.id ? 'selected' : ''}>${i.reference}</option>`).join('');
            }
        } catch(e) {}

        const userStr = localStorage.getItem('dtech_user');
        const user = userStr ? JSON.parse(userStr) : {};
        const bName = user.businessName || "Your Company";

        const defaultTemplate = `This Software License & Services Agreement ("Agreement") is entered into by and between ${bName} ("Service Provider") and the Client ("Client").\n\n1. Grant of License & Services:\nService Provider grants Client a non-exclusive license and/or service commitment according to the selected plan.\n\n2. Intellectual Property:\nAll intellectual property rights remain exclusively with ${bName}.\n\n3. Payment Terms:\nClient agrees to pay all fees associated with products/invoices on time. Non-payment may lead to service interruption.\n\n4. Confidentiality:\nBoth parties agree to treat proprietary and sensitive company data strictly confidential.\n\n5. Termination:\nEither party may terminate this agreement with 30 days written notice.`;

        const sDate = isEdit && con.startDate ? con.startDate.split('T')[0] : new Date().toISOString().split('T')[0];
        const d = new Date();
        d.setMonth(d.getMonth() + 12);
        const eDate = isEdit && con.endDate ? con.endDate.split('T')[0] : d.toISOString().split('T')[0];

        document.getElementById('drawer-c-id').value = isEdit ? con.id : '';
        document.getElementById('drawer-c-type').value = isEdit ? (con.contractType || 'SLA') : 'SLA';
        document.getElementById('drawer-c-start').value = sDate;
        document.getElementById('drawer-c-end').value = eDate;
        document.getElementById('drawer-c-renew').value = isEdit ? (con.renewalOption || 'Yes') : 'Yes';
        document.getElementById('drawer-c-status').value = isEdit ? (con.signingStatus || 'Draft') : 'Draft';
        document.getElementById('drawer-c-csign').value = con.clientSignDate ? con.clientSignDate.split('T')[0] : '';
        document.getElementById('drawer-c-dsign').value = con.dtechSignDate ? con.dtechSignDate.split('T')[0] : '';
        document.getElementById('drawer-c-content').value = con.content || defaultTemplate;

        modal.classList.remove('hidden');
        setTimeout(() => {
            if (panel) panel.classList.remove('translate-x-full');
        }, 10);
    },

    closeModal() {
        const modal = document.getElementById('contractDrawerModal');
        const panel = document.getElementById('contractDrawerPanel');
        if (panel) panel.classList.add('translate-x-full');
        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
        }, 300);
    },

    async saveContract(e) {
        e.preventDefault();
        const id = document.getElementById('drawer-c-id').value;
        const cid = document.getElementById('drawer-c-client').value;
        if (!cid) {
            Swal.fire('Error', 'Client is required', 'warning');
            return;
        }

        const cSign = document.getElementById('drawer-c-csign').value;
        const dSign = document.getElementById('drawer-c-dsign').value;
        const startD = document.getElementById('drawer-c-start').value;
        const endD = document.getElementById('drawer-c-end').value;
        const sigStatus = document.getElementById('drawer-c-status').value;

        const formValues = {
            clientId: cid,
            contractType: document.getElementById('drawer-c-type').value,
            startDate: startD ? new Date(startD).toISOString() : new Date().toISOString(),
            endDate: endD ? new Date(endD).toISOString() : new Date().toISOString(),
            renewalOption: document.getElementById('drawer-c-renew').value,
            signingStatus: sigStatus,
            status: sigStatus === 'Signed' ? 'Signed' : 'Unsigned',
            clientSignDate: cSign ? new Date(cSign).toISOString() : null,
            dtechSignDate: dSign ? new Date(dSign).toISOString() : null,
            licenseId: document.getElementById('drawer-c-license').value,
            invoiceId: document.getElementById('drawer-c-invoice').value,
            content: document.getElementById('drawer-c-content').value
        };

        const submitBtn = document.getElementById('contractDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

        try {
            if (id) {
                await API.request(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Contract updated successfully', timer: 1500, showConfirmButton: false });
            } else {
                formValues.reference = 'AGR-' + Math.floor(1000 + Math.random() * 9000);
                formValues.date = new Date().toISOString();
                await API.request('/api/contracts', { method: 'POST', body: JSON.stringify(formValues) });
                Swal.fire({ icon: 'success', title: 'Generated', text: 'Contract generated successfully', timer: 1500, showConfirmButton: false });
            }
            this.closeModal();
            this.loadContracts();
            if (typeof app !== 'undefined' && app.loadDashboardData) app.loadDashboardData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = id ? 'Save Changes' : 'Save Contract';
        }
    },

    editContract(id) {
        const con = this.contracts.find(x => x.id === id);
        if (con) this.openModal(con);
    },

    async toggleStatus(id) {
        const con = this.contracts.find(x => x.id === id);
        const newStatus = con.status === 'Signed' ? 'Unsigned' : 'Signed';

        try {
            await API.request(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            this.loadContracts();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    async download(id) {
        const con = this.contracts.find(x => x.id === id);
        con.client = this.clients.find(c => c.id === con.clientId);
        pdfEngine.download('License Agreement', con);
    },

    async deleteContract(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/contracts/${id}`, { method: 'DELETE' });
            this.loadContracts();
        }
    }
};