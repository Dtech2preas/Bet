// js/quotations.js

const quotationsManager = {
    quotations: [],
    clients: [],
    currentQuote: null,

    async loadQuotations() {
        const container = document.getElementById('quotations-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [qRes, cRes] = await Promise.all([
                API.request('/api/quotations'),
                API.request('/api/clients')
            ]);
            if (qRes.success) {
                this.quotations = qRes.quotations;
                this.clients = cRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('quotations-container');
        if (this.quotations.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No quotations found.</div>`;
            return;
        }

        const isPremium = app.userPlan === 'Premium';
        const checkboxHeader = isPremium ? `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><input type="checkbox" onclick="quotationsManager.toggleSelectAll(this)"></th>` : '';

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            ${checkboxHeader}
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.quotations.forEach(q => {
            const client = this.clients.find(c => c.id === q.clientId);
            const checkboxCell = isPremium ? `<td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-start"><input type="checkbox" class="quotation-checkbox" value="${q.id}"></td>` : '';
            const statusClass = q.status === 'Accepted' ? 'bg-green-100 text-green-800' : (q.status === 'Declined' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800');
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    ${checkboxCell}
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Quote #:</div>
                        <div class="text-right md:text-left">${q.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Client:</div>
                        <div class="text-right md:text-left">${client ? client.companyName : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-semibold">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Total:</div>
                        <div class="text-right md:text-left">
                            <div>R ${q.total}</div>
                            ${q.paymentTerms === '50% Deposit' ? `<div class="text-xs text-blue-600 dark:text-blue-400 font-normal">Due before start: R ${(Number(q.total) * 0.5).toFixed(2)}</div>` : ''}
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full ${statusClass}">${q.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div class="flex items-center space-x-2 md:justify-end">
                            <button onclick="quotationsManager.convertToInvoice('${q.id}')" class="text-indigo-600 hover:text-indigo-900" title="Convert to Invoice"><i class="fas fa-file-invoice-dollar"></i></button>
                            <button onclick="quotationsManager.editQuote('${q.id}')" class="text-blue-600 hover:text-blue-900" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="quotationsManager.download('${q.id}')" class="text-gray-600 hover:text-gray-900" title="Download PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="quotationsManager.sendWhatsApp('${q.id}')" class="text-green-600 hover:text-green-900" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                            <button onclick="quotationsManager.deleteQuote('${q.id}')" class="text-red-600 hover:text-red-900" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async convertToInvoice(id) {
        const q = this.quotations.find(x => x.id === id);
        if (!q) return;

        const confirm = await Swal.fire({
            title: 'Convert to Invoice?',
            html: `Generate a new Invoice from Quotation <b>${q.reference}</b>?<br><br>The quotation status will be updated to <span class="text-green-600 font-semibold">Accepted</span>.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="fas fa-file-invoice-dollar mr-1"></i> Convert to Invoice'
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({ title: 'Converting to Invoice...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const invRef = 'INV-' + Math.floor(1000 + Math.random() * 9000);
            const invPayload = {
                reference: invRef,
                quotationId: q.id,
                clientId: q.clientId,
                title: q.title || '',
                items: q.items || [],
                subtotal: q.subtotal,
                discountPct: q.discountPct || 0,
                discountAmt: q.discountAmt || 0,
                vatPct: q.vatPct !== undefined ? q.vatPct : 15,
                vatAmt: q.vatAmt || 0,
                total: q.total,
                balanceDue: q.total,
                currency: q.currency || 'ZAR',
                status: 'Unpaid',
                date: new Date().toISOString(),
                dueDate: q.validUntil || new Date(Date.now() + 14 * 86400000).toISOString(),
                validUntil: q.validUntil || null,
                paymentTerms: q.paymentTerms || 'Due on Receipt',
                expectedStartDate: q.expectedStartDate || null,
                deliveryTime: q.deliveryTime || '',
                customerNotes: q.customerNotes || '',
                notes: `Converted from Quotation ${q.reference}`,
                poNumber: '',
                salesperson: ''
            };

            await API.request('/api/invoices', {
                method: 'POST',
                body: JSON.stringify(invPayload)
            });

            // Update Quotation Status to 'Accepted'
            const updatedQuote = { ...q, status: 'Accepted' };
            await API.request(`/api/quotations/${q.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedQuote)
            });

            if (typeof app !== 'undefined' && app.logActivity) {
                app.logActivity(`Converted Quotation ${q.reference} to Invoice ${invRef}`);
            }

            await this.loadQuotations();

            const isPublic = window.location.pathname.includes('public_');
            const invUrl = isPublic ? 'public_invoices.html' : 'invoices.html';

            Swal.fire({
                title: 'Quotation Converted!',
                html: `Invoice <b>${invRef}</b> created successfully and Quotation <b>${q.reference}</b> marked as <b>Accepted</b>.`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'View Invoices',
                cancelButtonText: 'Stay on Quotations',
                confirmButtonColor: '#4f46e5'
            }).then((res) => {
                if (res.isConfirmed) {
                    window.location.href = invUrl;
                }
            });
        } catch (err) {
            Swal.fire('Error', err.message || 'Failed to convert quotation', 'error');
        }
    },

    ensureDrawer() {
        let modal = document.getElementById('quotationDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'quotationDrawerModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-50 overflow-hidden';
            modal.innerHTML = `
                <div class="absolute inset-y-0 right-0 max-w-full flex">
                    <div class="w-screen max-w-2xl lg:max-w-3xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="quotationDrawerPanel">
                        <div class="px-6 py-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                            <div>
                                <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="quotationDrawerTitle">Create Quotation</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fill in project and financial details</p>
                            </div>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="quotationsManager.closeDrawer()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="quotationDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="quotationsManager.saveQuotation(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-6" id="quotationDrawerContent"></div>
                            <div class="px-6 py-4 border-t dark:border-dark-border bg-gray-50 dark:bg-gray-800 flex justify-between items-center sticky bottom-0 z-10">
                                <span id="quotationDrawerStatus" class="text-xs text-gray-500"></span>
                                <div class="flex space-x-3">
                                    <button type="button" onclick="quotationsManager.closeDrawer()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                    <button type="submit" id="quotationDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Quotation</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) quotationsManager.closeDrawer();
            });
        }
        return modal;
    },

    openModal(quotation = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        this.currentQuote = quotation;
        const q = quotation || {};
        const isEdit = !!quotation;
        const modal = this.ensureDrawer();
        const panel = document.getElementById('quotationDrawerPanel');

        document.getElementById('quotationDrawerTitle').textContent = isEdit ? `Edit Quotation (${q.reference || ''})` : 'Create New Quotation';
        document.getElementById('quotationDrawerSubmitBtn').textContent = isEdit ? 'Save Changes' : 'Create Quotation';

        const clientOptions = this.clients.map(c => `<option value="${c.id}" ${q.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        const d = new Date();
        d.setDate(d.getDate() + 30);
        const validStr = isEdit && q.validUntil ? q.validUntil.split('T')[0] : d.toISOString().split('T')[0];
        const projStartStr = isEdit && q.expectedStartDate ? q.expectedStartDate.split('T')[0] : '';

        const content = document.getElementById('quotationDrawerContent');
        content.innerHTML = `
            <!-- Client & Project Info -->
            <div class="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i class="fas fa-building mr-1.5 text-dtech-500"></i> Client & Project Info
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                        <select id="drawer-q-client" required class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Select Client</option>
                            ${clientOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quotation Title</label>
                        <input type="text" id="drawer-q-title" value="${q.title || ''}" placeholder="e.g. Website Redesign" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                    </div>
                </div>
            </div>

            <!-- Line Items -->
            <div>
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                        <i class="fas fa-list-ul mr-1.5 text-dtech-500"></i> Item Details
                    </h4>
                    <button type="button" onclick="quotationsManager.addRow('', '', 1)" class="inline-flex items-center text-xs font-medium bg-dtech-50 dark:bg-dtech-900/30 text-dtech-700 dark:text-dtech-300 px-3 py-1.5 rounded-md hover:bg-dtech-100 dark:hover:bg-dtech-900/50 transition">
                        <i class="fas fa-plus mr-1"></i> Add Line Item
                    </button>
                </div>
                <div id="drawer-q-items-container" class="space-y-2.5"></div>
            </div>

            <!-- Financials & Payment Terms -->
            <div>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i class="fas fa-calculator mr-1.5 text-dtech-500"></i> Financials & Terms
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                        <input type="text" id="drawer-q-currency" value="${q.currency || 'ZAR'}" placeholder="ZAR" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount (%)</label>
                        <input type="number" id="drawer-q-discount" min="0" max="100" step="any" value="${q.discount !== undefined ? q.discount : (q.discountPct !== undefined ? q.discountPct : 0)}" placeholder="0" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT (%)</label>
                        <input type="number" id="drawer-q-vat" min="0" max="100" step="any" value="${q.vat !== undefined ? q.vat : (q.vatPct !== undefined ? q.vatPct : 15)}" placeholder="15" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
                        <input type="date" id="drawer-q-valid" value="${validStr}" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                        <select id="drawer-q-terms" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                            <option value="Due on Receipt" ${q.paymentTerms === 'Due on Receipt' ? 'selected' : ''}>Due on Receipt</option>
                            <option value="50% Deposit" ${q.paymentTerms === '50% Deposit' ? 'selected' : ''}>50% Deposit</option>
                            <option value="7 Days" ${q.paymentTerms === '7 Days' ? 'selected' : ''}>7 Days</option>
                            <option value="14 Days" ${q.paymentTerms === '14 Days' ? 'selected' : ''}>14 Days</option>
                            <option value="30 Days" ${q.paymentTerms === '30 Days' ? 'selected' : ''}>30 Days</option>
                        </select>
                    </div>
                </div>

                <!-- Price Summary Card -->
                <div class="mt-4 bg-gray-50 dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                        <span>Subtotal:</span>
                        <span id="drawer-q-subtotal-disp" class="font-medium">R 0.00</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300" id="drawer-q-discount-row" style="display: none;">
                        <span>Discount:</span>
                        <span id="drawer-q-discount-disp" class="font-medium">- R 0.00</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300" id="drawer-q-vat-row" style="display: none;">
                        <span>VAT:</span>
                        <span id="drawer-q-vat-disp" class="font-medium">R 0.00</span>
                    </div>
                    <div class="flex justify-between text-base font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                        <span>Final Price (Total):</span>
                        <span id="drawer-q-total-disp">R 0.00</span>
                    </div>
                    <div class="flex justify-between items-center text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-md border border-blue-200 dark:border-blue-800 mt-2" id="drawer-q-deposit-row" style="display: none;">
                        <span>Due Before Project Start (50%):</span>
                        <span id="drawer-q-deposit-disp" class="font-bold">R 0.00</span>
                    </div>
                </div>
            </div>

            <!-- Logistics & Notes -->
            <div>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i class="fas fa-truck mr-1.5 text-dtech-500"></i> Logistics & Notes
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Project Start</label>
                        <input type="date" id="drawer-q-start" value="${projStartStr}" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Time</label>
                        <input type="text" id="drawer-q-delivery" value="${q.deliveryTime || ''}" placeholder="e.g. 2 weeks" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Notes <span class="text-xs text-gray-400 font-normal">(Printed on PDF)</span></label>
                        <textarea id="drawer-q-cnotes" rows="2" placeholder="Notes for the client..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">${q.customerNotes || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes <span class="text-xs text-gray-400 font-normal">(Private)</span></label>
                        <textarea id="drawer-q-inotes" rows="2" placeholder="Private internal notes..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">${q.internalNotes || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments (URL)</label>
                        <input type="text" id="drawer-q-attach" value="${q.attachments || ''}" placeholder="Link to Google Drive / Dropbox" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                </div>
            </div>
        `;

        // Render line item rows
        const itemsContainer = document.getElementById('drawer-q-items-container');
        itemsContainer.innerHTML = '';
        if (isEdit && q.items && q.items.length > 0) {
            q.items.forEach(it => this.addRow(it.description, it.price, it.quantity));
        } else {
            this.addRow('', '', 1);
        }

        // Setup event listeners for live totals
        itemsContainer.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-q-discount')?.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-q-vat')?.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-q-currency')?.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-q-terms')?.addEventListener('change', () => this.updateTotals());

        this.updateTotals();

        // Slide in
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-x-full');
        });
    },

    closeDrawer() {
        const modal = document.getElementById('quotationDrawerModal');
        const panel = document.getElementById('quotationDrawerPanel');
        if (!modal || !panel) return;
        panel.classList.add('translate-x-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    addRow(desc = '', price = '', qty = 1) {
        const container = document.getElementById('drawer-q-items-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'quote-item-row bg-gray-50/70 dark:bg-gray-800/40 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center';
        div.innerHTML = `
            <div class="sm:col-span-6">
                <input type="text" class="q-item-desc w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm border shadow-sm focus:border-dtech-500" placeholder="Description *" value="${desc || ''}" required>
            </div>
            <div class="sm:col-span-3">
                <input type="number" step="any" min="0" class="q-item-price w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm border shadow-sm focus:border-dtech-500" placeholder="Price" value="${price || ''}">
            </div>
            <div class="sm:col-span-2">
                <input type="number" step="any" min="1" class="q-item-qty w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm border shadow-sm focus:border-dtech-500" placeholder="Qty" value="${qty || 1}">
            </div>
            <div class="sm:col-span-1 flex justify-end sm:justify-center">
                <button type="button" onclick="quotationsManager.removeRow(this)" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition" title="Remove Item">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
        this.updateTotals();
    },

    removeRow(btn) {
        const row = btn.closest('.quote-item-row');
        if (row) {
            row.remove();
            this.updateTotals();
        }
    },

    updateTotals() {
        const curr = (document.getElementById('drawer-q-currency')?.value || 'ZAR').trim() || 'R';
        const prefix = curr === 'ZAR' ? 'R' : curr;
        let subtotal = 0;
        document.querySelectorAll('.quote-item-row').forEach(row => {
            const price = parseFloat(row.querySelector('.q-item-price')?.value || 0);
            const qty = parseFloat(row.querySelector('.q-item-qty')?.value || 0);
            if (!isNaN(price) && !isNaN(qty)) {
                subtotal += (price * qty);
            }
        });

        const discountPct = parseFloat(document.getElementById('drawer-q-discount')?.value || 0) || 0;
        const vatPct = parseFloat(document.getElementById('drawer-q-vat')?.value || 0) || 0;
        const discountAmt = subtotal * (discountPct / 100);
        const total = Math.max(0, subtotal - discountAmt);
        const vatAmt = vatPct > 0 ? (total - (total / (1 + (vatPct / 100)))) : 0;

        const subtotalEl = document.getElementById('drawer-q-subtotal-disp');
        if (subtotalEl) subtotalEl.textContent = `${prefix} ${subtotal.toFixed(2)}`;

        const discRow = document.getElementById('drawer-q-discount-row');
        const discEl = document.getElementById('drawer-q-discount-disp');
        if (discRow && discEl) {
            if (discountPct > 0) {
                discRow.style.display = 'flex';
                discEl.textContent = `- ${prefix} ${discountAmt.toFixed(2)} (${discountPct}%)`;
            } else {
                discRow.style.display = 'none';
            }
        }

        const vatRow = document.getElementById('drawer-q-vat-row');
        const vatEl = document.getElementById('drawer-q-vat-disp');
        if (vatRow && vatEl) {
            if (vatPct > 0) {
                vatRow.style.display = 'flex';
                vatEl.textContent = `${prefix} ${vatAmt.toFixed(2)} (${vatPct}%)`;
            } else {
                vatRow.style.display = 'none';
            }
        }

        const totalEl = document.getElementById('drawer-q-total-disp');
        if (totalEl) totalEl.textContent = `${prefix} ${total.toFixed(2)}`;

        const terms = document.getElementById('drawer-q-terms')?.value;
        const depRow = document.getElementById('drawer-q-deposit-row');
        const depEl = document.getElementById('drawer-q-deposit-disp');
        if (depRow && depEl) {
            if (terms === '50% Deposit') {
                depRow.style.display = 'flex';
                const depAmt = total * 0.5;
                depEl.textContent = `${prefix} ${depAmt.toFixed(2)}`;
            } else {
                depRow.style.display = 'none';
            }
        }
    },

    async saveQuotation(e) {
        e.preventDefault();
        const cid = document.getElementById('drawer-q-client').value;
        const rowElements = document.querySelectorAll('.quote-item-row');
        const items = [];
        let subtotal = 0;

        rowElements.forEach(row => {
            const desc = (row.querySelector('.q-item-desc')?.value || '').trim();
            const price = parseFloat(row.querySelector('.q-item-price')?.value || 0);
            const qty = parseFloat(row.querySelector('.q-item-qty')?.value || 1);
            if (desc) {
                items.push({ description: desc, price: price, quantity: qty });
                subtotal += (price * qty);
            }
        });

        if (!cid) return Swal.fire('Error', 'Please select a client', 'error');
        if (items.length === 0) return Swal.fire('Error', 'At least one item with a description is required', 'error');

        const discountPct = parseFloat(document.getElementById('drawer-q-discount').value || 0);
        const vatPct = parseFloat(document.getElementById('drawer-q-vat').value || 0);
        const discountAmt = subtotal * (discountPct / 100);
        const total = subtotal - discountAmt;
        const vatAmt = total - (total / (1 + (vatPct / 100)));

        const validDate = document.getElementById('drawer-q-valid').value;
        const startDate = document.getElementById('drawer-q-start').value;
        const paymentTerms = document.getElementById('drawer-q-terms').value;
        const depositAmt = paymentTerms === '50% Deposit' ? (total * 0.5).toFixed(2) : null;

        const formValues = {
            clientId: cid,
            title: document.getElementById('drawer-q-title').value,
            items: items,
            subtotal: subtotal.toFixed(2),
            discountPct: discountPct,
            discountAmt: discountAmt.toFixed(2),
            vatPct: vatPct,
            vatAmt: vatAmt.toFixed(2),
            total: total.toFixed(2),
            depositAmt: depositAmt,
            currency: document.getElementById('drawer-q-currency').value,
            validUntil: validDate ? new Date(validDate).toISOString() : null,
            paymentTerms: paymentTerms,
            expectedStartDate: startDate ? new Date(startDate).toISOString() : null,
            deliveryTime: document.getElementById('drawer-q-delivery').value,
            customerNotes: document.getElementById('drawer-q-cnotes').value,
            internalNotes: document.getElementById('drawer-q-inotes').value,
            attachments: document.getElementById('drawer-q-attach').value,
        };

        const submitBtn = document.getElementById('quotationDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Saving...';

        try {
            if (this.currentQuote && this.currentQuote.id) {
                await API.request(`/api/quotations/${this.currentQuote.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated Quotation`);
                Swal.fire({ icon: 'success', title: 'Quotation Updated', timer: 1500, showConfirmButton: false });
            } else {
                formValues.reference = 'QT-' + Math.floor(1000 + Math.random() * 9000);
                formValues.status = 'Draft';
                formValues.date = new Date().toISOString();
                await API.request('/api/quotations', { method: 'POST', body: JSON.stringify(formValues) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Created Quotation`);
                Swal.fire({ icon: 'success', title: 'Quotation Created', timer: 1500, showConfirmButton: false });
            }
            this.closeDrawer();
            this.loadQuotations();
        } catch (err) {
            Swal.fire('Error', err.message || 'Failed to save quotation', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = this.currentQuote ? 'Save Changes' : 'Create Quotation';
        }
    },

    editQuote(id) {
        const q = this.quotations.find(x => x.id === id);
        if (q) this.openModal(q);
    },

    async download(id) {
        const q = this.quotations.find(x => x.id === id);
        q.client = this.clients.find(c => c.id === q.clientId);
        pdfEngine.download('Quotation', q);
    },

    sendWhatsApp(id) {
        const q = this.quotations.find(x => x.id === id);
        const client = this.clients.find(c => c.id === q.clientId);
        if (!client || !client.phone) return Swal.fire('Error', 'Client has no phone number', 'error');

        const userStr = localStorage.getItem('dtech_user');
        const user = userStr ? JSON.parse(userStr) : {};
        const bName = user.businessName || "D-TECH";
        let totalInfo = `Total: R ${q.total}`;
        if (q.paymentTerms === '50% Deposit') {
            const dep = (Number(q.total) * 0.5).toFixed(2);
            totalInfo += `\nPayment Terms: 50% Deposit\nDue Before Project Start (50%): R ${dep}`;
        }
        const msg = encodeURIComponent(`Hi ${client.contactPerson || client.companyName},\n\nHere is the summary for Quotation ${q.reference}:\n${totalInfo}\n\nPlease let us know if you have any questions.\n\nRegards,\n${bName}`);
        const phone = client.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    },

    async deleteQuote(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/quotations/${id}`, { method: 'DELETE' });
            if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Deleted Quotation`);
            this.loadQuotations();
        }
    },

    toggleSelectAll(source) {
        const checkboxes = document.querySelectorAll('.quotation-checkbox');
        checkboxes.forEach(cb => cb.checked = source.checked);
    },

    async bulkDelete() {
        const selected = Array.from(document.querySelectorAll('.quotation-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) return Swal.fire('Info', 'No quotations selected', 'info');

        if (confirm(`Are you sure you want to delete ${selected.length} quotations?`)) {
            Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});
            try {
                for (const id of selected) {
                    await API.request(`/api/quotations/${id}`, { method: 'DELETE' });
                }
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Bulk deleted ${selected.length} Quotations`);
                await this.loadQuotations();
                Swal.fire('Success', 'Quotations deleted', 'success');
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async bulkExport() {
        const selected = Array.from(document.querySelectorAll('.quotation-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) return Swal.fire('Info', 'No quotations selected', 'info');

        const selectedQuotations = this.quotations.filter(q => selected.includes(q.id));
        if (selectedQuotations.length === 0) return;

        let csv = "Quotation Number,Client,Status,Date,Valid Until,Payment Terms,Deposit Due (50%),Subtotal,Discount,VAT,Total,Notes\n";
        selectedQuotations.forEach(q => {
            const client = this.clients.find(c => c.id === q.clientId);
            const cName = client ? client.companyName.replace(/,/g, '') : 'Unknown';
            const notes = (q.customerNotes || '').replace(/,/g, ' ').replace(/\n/g, ' ');
            const terms = (q.paymentTerms || '').replace(/,/g, ' ');
            const deposit = q.paymentTerms === '50% Deposit' ? (Number(q.total) * 0.5).toFixed(2) : '0.00';
            csv += `${q.reference},${cName},${q.status},${new Date(q.date).toLocaleDateString()},${new Date(q.validUntil).toLocaleDateString()},${terms},${deposit},${q.subtotal},${q.discount || 0},${q.vatAmt || 0},${q.total},${notes}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `quotations_bulk_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};
