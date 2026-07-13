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

    openModal(client = null) {
        document.getElementById('clientForm').reset();
        document.getElementById('clientId').value = '';
        document.getElementById('clientModalTitle').innerText = 'Add New Client';

        if (client) {
            document.getElementById('clientModalTitle').innerText = 'Edit Client';
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

        document.getElementById('clientModal').classList.remove('hidden');
        document.getElementById('clientModal').classList.add('flex');
    },

    closeModal() {
        document.getElementById('clientModal').classList.add('hidden');
        document.getElementById('clientModal').classList.remove('flex');
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
                Swal.fire({ icon: 'success', title: 'Updated!', text: 'Client updated successfully', timer: 1500, showConfirmButton: false });
            } else {
                // Create
                await API.request('/api/clients', {
                    method: 'POST',
                    body: JSON.stringify(clientData)
                });
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

            html += renderList('Quotations', cQuotations, q => `
                <div>
                    <div class="font-medium">${q.reference || 'No Number'}</div>
                    <div class="text-xs text-gray-500">${new Date(q.date).toLocaleDateString()} - ${q.currency || 'R'} ${q.total}</div>
                </div>
                <span class="px-2 py-1 text-xs rounded-full ${q.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${q.status || 'Draft'}</span>
            `);

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