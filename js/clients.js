// clients.js

const clientsManager = {
    clients: [],

    async loadClients() {
        const container = document.getElementById('clients-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';

        try {
            const response = await API.request('/api/clients');
            if (response.success) {
                this.clients = response.clients;
                this.renderClientsTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load clients: ${error.message}</div>`;
        }
    },

    renderClientsTable() {
        const container = document.getElementById('clients-container');

        if (this.clients.length === 0) {
            container.innerHTML = `
                <div class="bg-white dark:bg-dark-card p-10 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border text-center">
                    <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">No clients yet</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-4">Get started by creating a new client.</p>
                    <button onclick="clientsManager.openModal()" class="text-dtech-600 hover:text-dtech-700 font-medium">Add Client</button>
                </div>
            `;
            return;
        }

        let tableHtml = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                        <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company Name</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Added</th>
                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;

        this.clients.forEach(client => {
            const statusColor = client.status === 'Active' ? 'bg-green-100 text-green-800' :
                                client.status === 'Inactive' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';

            const dateStr = new Date(client.dateAdded).toLocaleDateString();

            tableHtml += `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Company:</div>
                        <div class="flex items-center text-right md:text-left">
                            <div class="hidden md:flex h-10 w-10 flex-shrink-0 rounded-full bg-dtech-100 text-dtech-600 items-center justify-center font-bold">
                                ${client.companyName.charAt(0).toUpperCase()}
                            </div>
                            <div class="md:ml-4">
                                <div class="text-sm font-medium text-gray-900 dark:text-white">${client.companyName}</div>
                                <div class="text-sm text-gray-500">${client.email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Contact:</div>
                        <div class="text-right md:text-left">
                            <div class="text-sm text-gray-900 dark:text-white">${client.contactPerson || '-'}</div>
                            <div class="text-sm text-gray-500">${client.phone || '-'}</div>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                            ${client.status || 'Active'}
                        </span>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Added:</div>
                        ${dateStr}
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center whitespace-nowrap text-right text-sm font-medium">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="clientsManager.viewDetails('${client.id}')" class="text-green-600 hover:text-green-900 dark:hover:text-green-400 mr-3" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="clientsManager.editClient('${client.id}')" class="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 mr-3" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="clientsManager.deleteClient('${client.id}')" class="text-red-600 hover:text-red-900 dark:hover:text-red-400" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHtml += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = tableHtml;
    },

    ensureDrawer() {
        let modal = document.getElementById('clientDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'clientDrawerModal';
            modal.className = 'fixed inset-0 z-50 overflow-hidden hidden';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" id="clientDrawerOverlay"></div>
                <div class="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                    <div class="w-screen max-w-2xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="clientDrawerPanel">
                        <div class="p-4 sm:p-6 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-card">
                            <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="clientDrawerTitle">Add New Client</h3>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="clientsManager.closeModal()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="clientDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="clientsManager.saveClient(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-6" id="clientDrawerContent">
                                <input id="clientId" type="hidden">
                                
                                <!-- Basic Info -->
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                        <i class="fas fa-building mr-1.5 text-dtech-500"></i> Basic Information
                                    </h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                                            <input type="text" id="clientCompany" required placeholder="Official Registered Name" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Reg Number</label>
                                            <input type="text" id="clientRegNum" placeholder="e.g. 2023/123456/07" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Number</label>
                                            <input type="text" id="clientVatNum" placeholder="Tax / VAT Number" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                                            <input type="text" id="clientIndustry" placeholder="e.g. Technology, Retail" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                                            <input type="url" id="clientWebsite" placeholder="https://..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                                            <select id="clientStatus" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Archived">Archived</option>
                                            </select>
                                        </div>
                                        <div class="sm:col-span-2">
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn Profile</label>
                                            <input type="url" id="clientLinkedin" placeholder="https://linkedin.com/company/..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                    </div>
                                </div>

                                <!-- Addresses -->
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                        <i class="fas fa-map-marker-alt mr-1.5 text-dtech-500"></i> Addresses
                                    </h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Physical Address</label>
                                            <textarea id="clientPhysicalAddress" rows="2" placeholder="Street Address, City, Postal Code" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></textarea>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Address</label>
                                            <textarea id="clientPostalAddress" rows="2" placeholder="P.O. Box or Postal Address" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></textarea>
                                        </div>
                                    </div>
                                </div>

                                <!-- Contacts -->
                                <div>
                                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                        <i class="fas fa-address-book mr-1.5 text-dtech-500"></i> Contact Details
                                    </h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Contact Person</label>
                                            <input type="text" id="clientContact" placeholder="e.g. John Doe" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Email *</label>
                                            <input type="email" id="clientEmail" required placeholder="invoices@client.co.za" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                            <input type="tel" id="clientPhone" placeholder="+27 82 123 4567" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Contact Method</label>
                                            <select id="clientPreferredContact" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                                <option value="Email">Email</option>
                                                <option value="Phone">Phone</option>
                                                <option value="WhatsApp">WhatsApp</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Contact</label>
                                            <input type="text" id="clientBillingContact" placeholder="accounts@client.co.za" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technical Contact</label>
                                            <input type="text" id="clientTechContact" placeholder="tech@client.co.za" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                        </div>
                                    </div>
                                </div>

                                <!-- Notes -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
                                    <textarea id="clientNotes" rows="2" placeholder="Private internal client notes..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></textarea>
                                </div>
                            </div>
                            <div class="p-4 sm:p-6 border-t dark:border-dark-border flex justify-end space-x-3 bg-gray-50 dark:bg-dark-card flex-shrink-0">
                                <button type="button" onclick="clientsManager.closeModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" id="saveClientBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'clientDrawerOverlay') clientsManager.closeModal();
            });
        }
        return modal;
    },

    openModal(client = null) {
        const modal = this.ensureDrawer();
        const panel = document.getElementById('clientDrawerPanel');
        const form = document.getElementById('clientDrawerForm');
        if (form) form.reset();

        document.getElementById('clientId').value = '';
        document.getElementById('clientDrawerTitle').innerText = 'Add New Client';

        if (client) {
            document.getElementById('clientDrawerTitle').innerText = 'Edit Client';
            document.getElementById('clientId').value = client.id;
            document.getElementById('clientCompany').value = client.companyName || '';
            document.getElementById('clientContact').value = client.contactPerson || '';
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientPhone').value = client.phone || '';
            document.getElementById('clientStatus').value = client.status || 'Active';
            document.getElementById('clientRegNum').value = client.regNum || '';
            document.getElementById('clientVatNum').value = client.vatNum || '';
            document.getElementById('clientIndustry').value = client.industry || '';
            document.getElementById('clientWebsite').value = client.website || '';
            document.getElementById('clientLinkedin').value = client.linkedin || '';
            document.getElementById('clientPhysicalAddress').value = client.physicalAddress || '';
            document.getElementById('clientPostalAddress').value = client.postalAddress || '';
            document.getElementById('clientPreferredContact').value = client.preferredContact || 'Email';
            document.getElementById('clientBillingContact').value = client.billingContact || '';
            document.getElementById('clientTechContact').value = client.techContact || '';
            document.getElementById('clientNotes').value = client.notes || '';
        }

        // Hide legacy static modal if present
        const legacyModal = document.getElementById('clientModal');
        if (legacyModal) {
            legacyModal.classList.add('hidden');
            legacyModal.classList.remove('flex');
        }

        // Open drawer with slide transition
        modal.classList.remove('hidden');
        setTimeout(() => {
            if (panel) panel.classList.remove('translate-x-full');
        }, 10);
    },

    closeModal() {
        const modal = document.getElementById('clientDrawerModal');
        const panel = document.getElementById('clientDrawerPanel');
        if (panel) panel.classList.add('translate-x-full');

        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
        }, 300);

        // Also clean up legacy modal if open
        const legacyModal = document.getElementById('clientModal');
        if (legacyModal) {
            legacyModal.classList.add('hidden');
            legacyModal.classList.remove('flex');
        }
    },

    editClient(id) {
        const client = this.clients.find(c => c.id === id);
        if (client) {
            this.openModal(client);
        }
    },

    async saveClient(e) {
        e.preventDefault();

        const saveBtn = document.getElementById('saveClientBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';

        const id = document.getElementById('clientId').value;
        const clientData = {
            companyName: document.getElementById('clientCompany').value,
            contactPerson: document.getElementById('clientContact').value,
            email: document.getElementById('clientEmail').value,
            phone: document.getElementById('clientPhone').value,
            status: document.getElementById('clientStatus').value,
            regNum: document.getElementById('clientRegNum').value,
            vatNum: document.getElementById('clientVatNum').value,
            industry: document.getElementById('clientIndustry').value,
            website: document.getElementById('clientWebsite').value,
            linkedin: document.getElementById('clientLinkedin').value,
            physicalAddress: document.getElementById('clientPhysicalAddress').value,
            postalAddress: document.getElementById('clientPostalAddress').value,
            preferredContact: document.getElementById('clientPreferredContact').value,
            billingContact: document.getElementById('clientBillingContact').value,
            techContact: document.getElementById('clientTechContact').value,
            notes: document.getElementById('clientNotes').value
        };

        try {
            if (id) {
                // Update
                await API.request(`/api/clients/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(clientData)
                });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated Client: ${clientData.name}`);
                Swal.fire({ icon: 'success', title: 'Updated!', text: 'Client updated successfully', timer: 1500, showConfirmButton: false });
            } else {
                // Create
                await API.request('/api/clients', {
                    method: 'POST',
                    body: JSON.stringify(clientData)
                });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Added Client: ${clientData.name}`);
                Swal.fire({ icon: 'success', title: 'Created!', text: 'Client added successfully', timer: 1500, showConfirmButton: false });
            }

            this.closeModal();
            this.loadClients();
            app.loadDashboardData(); // Refresh stats

        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Client';
        }
    },

    async deleteClient(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await API.request(`/api/clients/${id}`, { method: 'DELETE' });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Deleted Client`);
                Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Client has been deleted.', timer: 1500, showConfirmButton: false });
                this.loadClients();
                app.loadDashboardData();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: error.message });
            }
        }
    },

    async viewDetails(id) {
        const client = this.clients.find(c => c.id === id);
        if (!client) return;

        const modal = document.getElementById('clientDetailsModal');
        const panel = document.getElementById('clientDetailsPanel');
        const content = document.getElementById('clientDetailsContent');

        document.getElementById('detailsCompanyName').innerText = client.companyName + ' Details';

        content.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i><p class="mt-2">Loading related records...</p></div>';

        // Open modal and slide panel in
        modal.classList.remove('hidden');
        modal.onclick = (e) => {
            if (e.target === modal || e.target.id === 'clientDetailsOverlay') {
                clientsManager.closeDetails();
            }
        };
        // small timeout to allow display:block to apply before transition
        setTimeout(() => {
            panel.classList.remove('translate-x-full');
        }, 10);

        try {
            const [licRes, quoRes, invRes, payRes, conRes] = await Promise.all([
                API.request('/api/licenses'),
                API.request('/api/quotations'),
                API.request('/api/invoices'),
                API.request('/api/payments'),
                API.request('/api/contracts')
            ]);

            const cLicenses = (licRes.licenses || []).filter(l => l.clientId === id);
            const cQuotations = (quoRes.quotations || []).filter(q => q.clientId === id);
            const cInvoices = (invRes.invoices || []).filter(i => i.clientId === id);
            // Link payments through invoices
            const cInvoiceIds = cInvoices.map(i => i.id);
            const cPayments = (payRes.payments || []).filter(p => cInvoiceIds.includes(p.invoiceId));
            const cContracts = (conRes.contracts || []).filter(c => c.clientId === id);

            let html = `
                <div class="mb-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <h3 class="text-lg font-semibold mb-4 border-b pb-2">Client Profile</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Company:</strong> ${client.companyName}</div>
                        <div><strong>Contact:</strong> ${client.contactPerson || '-'}</div>
                        <div><strong>Email:</strong> <a href="mailto:${client.email}" class="text-blue-600">${client.email}</a></div>
                        <div><strong>Phone:</strong> ${client.phone || '-'}</div>
                        <div><strong>Status:</strong> <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${client.status || 'Active'}</span></div>
                        <div><strong>Industry:</strong> ${client.industry || '-'}</div>
                        <div><strong>Reg No:</strong> ${client.regNum || '-'}</div>
                        <div><strong>VAT No:</strong> ${client.vatNum || '-'}</div>
                        <div class="md:col-span-2"><strong>Website:</strong> ${client.website ? `<a href="${client.website}" target="_blank" class="text-blue-600">${client.website}</a>` : '-'}</div>
                    </div>
                </div>
            `;

            // Helper to render lists
            const renderList = (title, items, renderItem) => {
                let listHtml = `<div class="mb-8"><h3 class="text-lg font-semibold mb-3 border-b pb-1">${title} <span class="text-sm font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full ml-2">${items.length}</span></h3>`;
                if (items.length === 0) {
                    listHtml += `<p class="text-sm text-gray-500 italic">No ${title.toLowerCase()} found.</p>`;
                } else {
                    listHtml += `<div class="space-y-3">`;
                    items.forEach(item => {
                        listHtml += `<div class="p-3 border dark:border-dark-border rounded-md shadow-sm bg-white dark:bg-dark-card flex justify-between items-center text-sm">${renderItem(item)}</div>`;
                    });
                    listHtml += `</div>`;
                }
                listHtml += `</div>`;
                return listHtml;
            };

            html += renderList('Licenses', cLicenses, l => `
                <div>
                    <div class="font-mono font-medium">${l.licenseKey}</div>
                    <div class="text-xs text-gray-500">Exp: ${new Date(l.expiryDate).toLocaleDateString()}</div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${l.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${l.status}</span>
            `);

            html += renderList('Quotations', cQuotations, q => {
                const depStr = q.paymentTerms === '50% Deposit' ? ` (Due before start: ${q.currency || 'R'} ${(Number(q.total) * 0.5).toFixed(2)})` : '';
                return `
                <div>
                    <div class="font-medium">${q.reference || 'No Number'}</div>
                    <div class="text-xs text-gray-500">${new Date(q.date).toLocaleDateString()} - ${q.currency || 'R'} ${q.total}${depStr}</div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${q.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${q.status || 'Draft'}</span>
            `;
            });

            html += renderList('Invoices', cInvoices, i => `
                <div>
                    <div class="font-medium">${i.reference || 'No Number'}</div>
                    <div class="text-xs text-gray-500">${new Date(i.date).toLocaleDateString()} - R ${i.total}</div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${i.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${i.status || 'Unpaid'}</span>
            `);

            html += renderList('Payments', cPayments, p => `
                <div>
                    <div class="font-medium">${p.currency || 'ZAR'} ${p.amount}</div>
                    <div class="text-xs text-gray-500">${new Date(p.date || p.paymentDate).toLocaleDateString()} - Ref: ${p.transactionReference || p.reference || 'N/A'}</div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${p.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${p.status || p.paymentStatus || 'Completed'}</span>
            `);

            html += renderList('Contracts', cContracts, c => `
                <div>
                    <div class="font-medium">${c.contractType || 'Contract'}</div>
                    <div class="text-xs text-gray-500">${new Date(c.startDate || c.dateAdded).toLocaleDateString()} to ${new Date(c.endDate || c.expiryDate || new Date()).toLocaleDateString()}</div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${c.signingStatus === 'Signed' || c.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${c.signingStatus || c.status || 'Draft'}</span>
            `);

            content.innerHTML = html;

        } catch (error) {
            content.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load details: ${error.message}</div>`;
        }
    },

    closeDetails() {
        const modal = document.getElementById('clientDetailsModal');
        const panel = document.getElementById('clientDetailsPanel');

        panel.classList.add('translate-x-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); // match transition duration
    }
};

// Bind form submit event
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('clientForm');
    if (form) {
        form.addEventListener('submit', (e) => clientsManager.saveClient(e));
    }
});