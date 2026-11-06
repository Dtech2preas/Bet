// js/invoices.js

const invoicesManager = {
    invoices: [],
    clients: [],
    quotations: [],
    currentInvoice: null,

    async loadInvoices() {
        const container = document.getElementById('invoices-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [iRes, cRes] = await Promise.all([
                API.request('/api/invoices'),
                API.request('/api/clients')
            ]);
            if (iRes.success) {
                this.invoices = iRes.invoices;
                this.clients = cRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('invoices-container');
        if (this.invoices.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No invoices found.</div>`;
            return;
        }

        const isPremium = app.userPlan === 'Premium';
        const checkboxHeader = isPremium ? `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"><input type="checkbox" onclick="invoicesManager.toggleSelectAll(this)"></th>` : '';

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            ${checkboxHeader}
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inv #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.invoices.forEach(inv => {
            const client = this.clients.find(c => c.id === inv.clientId);
            const statusColor = inv.status === 'Paid' ? 'bg-green-100 text-green-800' : (inv.status === 'Overdue' ? 'bg-red-100 text-red-800' : (inv.status === 'Cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'));
            const checkboxCell = isPremium ? `<td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-start"><input type="checkbox" class="invoice-checkbox" value="${inv.id}"></td>` : '';
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    ${checkboxCell}
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Inv #:</div>
                        <div class="text-right md:text-left">${inv.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Client:</div>
                        <div class="text-right md:text-left">${client ? client.companyName : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-semibold">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Total:</div>
                        <div class="text-right md:text-left">R ${inv.total}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full ${statusColor}">${inv.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div class="flex items-center space-x-2 md:justify-end">
                            <button onclick="invoicesManager.editInvoice('${inv.id}')" class="text-blue-600 hover:text-blue-900" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="invoicesManager.download('${inv.id}')" class="text-gray-600 hover:text-gray-900" title="Download PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="invoicesManager.sendWhatsApp('${inv.id}')" class="text-green-600 hover:text-green-900" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                            <button onclick="invoicesManager.deleteInvoice('${inv.id}')" class="text-red-600 hover:text-red-900" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    ensureDrawer() {
        let modal = document.getElementById('invoiceDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'invoiceDrawerModal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden z-50 overflow-hidden';
            modal.innerHTML = `
                <div class="absolute inset-y-0 right-0 max-w-full flex">
                    <div class="w-screen max-w-2xl lg:max-w-3xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="invoiceDrawerPanel">
                        <div class="px-6 py-4 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                            <div>
                                <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="invoiceDrawerTitle">Create Invoice</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fill in invoice line items and payment terms</p>
                            </div>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="invoicesManager.closeDrawer()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="invoiceDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="invoicesManager.saveInvoice(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-6" id="invoiceDrawerContent"></div>
                            <div class="px-6 py-4 border-t dark:border-dark-border bg-gray-50 dark:bg-gray-800 flex justify-between items-center sticky bottom-0 z-10">
                                <span id="invoiceDrawerStatus" class="text-xs text-gray-500"></span>
                                <div class="flex space-x-3">
                                    <button type="button" onclick="invoicesManager.closeDrawer()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                    <button type="submit" id="invoiceDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Invoice</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) invoicesManager.closeDrawer();
            });
        }
        return modal;
    },

    async openModal(invoice = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        this.currentInvoice = invoice;
        const i = invoice || {};
        const isEdit = !!invoice;
        const modal = this.ensureDrawer();
        const panel = document.getElementById('invoiceDrawerPanel');

        document.getElementById('invoiceDrawerTitle').textContent = isEdit ? `Edit Invoice (${i.reference || ''})` : 'Create New Invoice';
        document.getElementById('invoiceDrawerSubmitBtn').textContent = isEdit ? 'Save Changes' : 'Create Invoice';

        const clientOptions = this.clients.map(c => `<option value="${c.id}" ${i.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        let quotesOptions = '<option value="">No Quotation Linked</option>';
        try {
            const qRes = await API.request('/api/quotations');
            if (qRes.success && qRes.quotations) {
                this.quotations = qRes.quotations;
                quotesOptions += qRes.quotations.map(q => `<option value="${q.id}" ${i.quotationId === q.id ? 'selected' : ''}>${q.reference} - ${q.title || 'Untitled'}</option>`).join('');
            }
        } catch (e) {
            console.warn("Could not load quotes for dropdown", e);
        }

        const d = new Date();
        d.setDate(d.getDate() + 14);
        const dueStr = isEdit && i.dueDate ? i.dueDate.split('T')[0] : d.toISOString().split('T')[0];
        let validStr = '';
        if (isEdit && i.validUntil) {
            try { validStr = new Date(i.validUntil).toISOString().split('T')[0]; } catch(e){}
        }
        let projStartStr = '';
        if (isEdit && i.expectedStartDate) {
            try { projStartStr = new Date(i.expectedStartDate).toISOString().split('T')[0]; } catch(e){}
        }

        const content = document.getElementById('invoiceDrawerContent');
        content.innerHTML = `
            <!-- Client & Quotation Link -->
            <div class="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i class="fas fa-building mr-1.5 text-dtech-500"></i> Client & Linked Quote
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                        <select id="drawer-i-client" required class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                            <option value="" disabled ${!isEdit ? 'selected' : ''}>Select Client</option>
                            ${clientOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Quotation</label>
                        <select id="drawer-i-quote" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500 focus:ring-dtech-500">
                            ${quotesOptions}
                        </select>
                        <p class="text-xs text-gray-500 mt-1">Selecting a quotation auto-fills items and financial rates.</p>
                    </div>
                </div>
            </div>

            <!-- Line Items -->
            <div>
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                        <i class="fas fa-list-ul mr-1.5 text-dtech-500"></i> Line Items
                    </h4>
                    <button type="button" onclick="invoicesManager.addRow('', '', 1)" class="inline-flex items-center text-xs font-medium bg-dtech-50 dark:bg-dtech-900/30 text-dtech-700 dark:text-dtech-300 px-3 py-1.5 rounded-md hover:bg-dtech-100 dark:hover:bg-dtech-900/50 transition">
                        <i class="fas fa-plus mr-1"></i> Add Line Item
                    </button>
                </div>
                <div id="drawer-i-items-container" class="space-y-2.5"></div>
            </div>

            <!-- Financials & Status -->
            <div>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i class="fas fa-calculator mr-1.5 text-dtech-500"></i> Financials & Terms
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount (%)</label>
                        <input type="number" id="drawer-i-discount" min="0" max="100" step="any" value="${i.discount !== undefined ? i.discount : (i.discountPct !== undefined ? i.discountPct : 0)}" placeholder="0" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT (%)</label>
                        <input type="number" id="drawer-i-vat" min="0" max="100" step="any" value="${i.vat !== undefined ? i.vat : (i.vatPct !== undefined ? i.vatPct : 15)}" placeholder="15" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select id="drawer-i-status" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                            <option value="Unpaid" ${i.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                            <option value="Paid" ${i.status === 'Paid' ? 'selected' : ''}>Paid</option>
                            <option value="Overdue" ${i.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
                            <option value="Cancelled" ${i.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                        <input type="date" id="drawer-i-due" value="${dueStr}" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
                        <input type="date" id="drawer-i-valid" value="${validStr}" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                        <select id="drawer-i-terms" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                            <option value="Due on Receipt" ${i.paymentTerms === 'Due on Receipt' ? 'selected' : ''}>Due on Receipt</option>
                            <option value="50% Deposit" ${i.paymentTerms === '50% Deposit' ? 'selected' : ''}>50% Deposit</option>
                            <option value="7 Days" ${i.paymentTerms === '7 Days' ? 'selected' : ''}>7 Days</option>
                            <option value="14 Days" ${i.paymentTerms === '14 Days' ? 'selected' : ''}>14 Days</option>
                            <option value="30 Days" ${i.paymentTerms === '30 Days' ? 'selected' : ''}>30 Days</option>
                        </select>
                    </div>
                </div>

                <!-- Price Summary Card -->
                <div class="mt-4 bg-gray-50 dark:bg-gray-800/80 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                        <span>Subtotal:</span>
                        <span id="drawer-i-subtotal-disp" class="font-medium">R 0.00</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300" id="drawer-i-discount-row" style="display: none;">
                        <span>Discount:</span>
                        <span id="drawer-i-discount-disp" class="font-medium">- R 0.00</span>
                    </div>
                    <div class="flex justify-between text-sm text-gray-600 dark:text-gray-300" id="drawer-i-vat-row" style="display: none;">
                        <span>VAT:</span>
                        <span id="drawer-i-vat-disp" class="font-medium">R 0.00</span>
                    </div>
                    <div class="flex justify-between text-base font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                        <span>Total Invoice Amount:</span>
                        <span id="drawer-i-total-disp">R 0.00</span>
                    </div>
                    <div class="flex justify-between items-center text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-md border border-blue-200 dark:border-blue-800 mt-2" id="drawer-i-deposit-row" style="display: none;">
                        <span>Due Before Project Start (50% Deposit):</span>
                        <span id="drawer-i-deposit-disp" class="font-bold">R 0.00</span>
                    </div>
                </div>
            </div>

            <!-- Logistics & Notes -->
            <div>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                    <i class="fas fa-truck mr-1.5 text-dtech-500"></i> Logistics & Details
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Project Start</label>
                        <input type="date" id="drawer-i-start" value="${projStartStr}" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Time</label>
                        <input type="text" id="drawer-i-delivery" value="${i.deliveryTime || ''}" placeholder="e.g. 2 weeks" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Order (PO) #</label>
                        <input type="text" id="drawer-i-po" value="${i.poNumber || ''}" placeholder="PO-12345" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salesperson</label>
                        <input type="text" id="drawer-i-sales" value="${i.salesperson || ''}" placeholder="Name" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                    </div>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Notes <span class="text-xs text-gray-400 font-normal">(Printed on PDF)</span></label>
                        <textarea id="drawer-i-cnotes" rows="2" placeholder="Notes for the client..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">${i.customerNotes || ''}</textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes <span class="text-xs text-gray-400 font-normal">(Private)</span></label>
                        <textarea id="drawer-i-notes" rows="2" placeholder="Private internal notes..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">${i.notes || ''}</textarea>
                    </div>
                </div>
            </div>
        `;

        // Render line item rows
        const itemsContainer = document.getElementById('drawer-i-items-container');
        itemsContainer.innerHTML = '';
        if (isEdit && i.items && i.items.length > 0) {
            i.items.forEach(it => this.addRow(it.description, it.price, it.quantity));
        } else {
            this.addRow('', '', 1);
        }

        // Setup event listeners for live totals
        itemsContainer.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-i-discount')?.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-i-vat')?.addEventListener('input', () => this.updateTotals());
        document.getElementById('drawer-i-terms')?.addEventListener('change', () => this.updateTotals());

        // Handle Quotation Auto-population
        const quoteSelect = document.getElementById('drawer-i-quote');
        if (quoteSelect) {
            quoteSelect.addEventListener('change', (e) => {
                const qId = e.target.value;
                if (!qId || !this.quotations) return;
                const q = this.quotations.find(x => x.id === qId);
                if (q) {
                    // Populate client
                    const clientInput = document.getElementById('drawer-i-client');
                    if (clientInput && q.clientId) clientInput.value = q.clientId;

                    // Populate line items
                    itemsContainer.innerHTML = '';
                    if (q.items && q.items.length > 0) {
                        q.items.forEach(it => this.addRow(it.description, it.price, it.quantity));
                    } else {
                        this.addRow('', '', 1);
                    }

                    // Populate discount and vat
                    if (q.discountPct !== undefined) {
                        const dEl = document.getElementById('drawer-i-discount');
                        if (dEl) dEl.value = q.discountPct;
                    }
                    if (q.vatPct !== undefined) {
                        const vEl = document.getElementById('drawer-i-vat');
                        if (vEl) vEl.value = q.vatPct;
                    }
                    if (q.paymentTerms) {
                        const tEl = document.getElementById('drawer-i-terms');
                        if (tEl) tEl.value = q.paymentTerms;
                    }
                    if (q.deliveryTime) {
                        const delEl = document.getElementById('drawer-i-delivery');
                        if (delEl) delEl.value = q.deliveryTime;
                    }
                    if (q.customerNotes) {
                        const cnEl = document.getElementById('drawer-i-cnotes');
                        if (cnEl) cnEl.value = q.customerNotes;
                    }
                    this.updateTotals();
                }
            });
        }

        this.updateTotals();

        // Slide in
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-x-full');
        });
    },

    closeDrawer() {
        const modal = document.getElementById('invoiceDrawerModal');
        const panel = document.getElementById('invoiceDrawerPanel');
        if (!modal || !panel) return;
        panel.classList.add('translate-x-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    },

    addRow(desc = '', price = '', qty = 1) {
        const container = document.getElementById('drawer-i-items-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'invoice-item-row bg-gray-50/70 dark:bg-gray-800/40 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center';
        div.innerHTML = `
            <div class="sm:col-span-6">
                <input type="text" class="i-item-desc w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm border shadow-sm focus:border-dtech-500" placeholder="Description *" value="${desc || ''}" required>
            </div>
            <div class="sm:col-span-3">
                <input type="number" step="any" min="0" class="i-item-price w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm border shadow-sm focus:border-dtech-500" placeholder="Price" value="${price || ''}">
            </div>
            <div class="sm:col-span-2">
                <input type="number" step="any" min="1" class="i-item-qty w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-1.5 text-sm border shadow-sm focus:border-dtech-500" placeholder="Qty" value="${qty || 1}">
            </div>
            <div class="sm:col-span-1 flex justify-end sm:justify-center">
                <button type="button" onclick="invoicesManager.removeRow(this)" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition" title="Remove Item">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
        this.updateTotals();
    },

    removeRow(btn) {
        const row = btn.closest('.invoice-item-row');
        if (row) {
            row.remove();
            this.updateTotals();
        }
    },

    updateTotals() {
        let subtotal = 0;
        document.querySelectorAll('.invoice-item-row').forEach(row => {
            const price = parseFloat(row.querySelector('.i-item-price')?.value || 0);
            const qty = parseFloat(row.querySelector('.i-item-qty')?.value || 0);
            if (!isNaN(price) && !isNaN(qty)) {
                subtotal += (price * qty);
            }
        });

        const discountPct = parseFloat(document.getElementById('drawer-i-discount')?.value || 0) || 0;
        const vatPct = parseFloat(document.getElementById('drawer-i-vat')?.value || 0) || 0;
        const discountAmt = subtotal * (discountPct / 100);
        const total = Math.max(0, subtotal - discountAmt);
        const vatAmt = vatPct > 0 ? (total - (total / (1 + (vatPct / 100)))) : 0;

        const subtotalEl = document.getElementById('drawer-i-subtotal-disp');
        if (subtotalEl) subtotalEl.textContent = `R ${subtotal.toFixed(2)}`;

        const discRow = document.getElementById('drawer-i-discount-row');
        const discEl = document.getElementById('drawer-i-discount-disp');
        if (discRow && discEl) {
            if (discountPct > 0) {
                discRow.style.display = 'flex';
                discEl.textContent = `- R ${discountAmt.toFixed(2)} (${discountPct}%)`;
            } else {
                discRow.style.display = 'none';
            }
        }

        const vatRow = document.getElementById('drawer-i-vat-row');
        const vatEl = document.getElementById('drawer-i-vat-disp');
        if (vatRow && vatEl) {
            if (vatPct > 0) {
                vatRow.style.display = 'flex';
                vatEl.textContent = `R ${vatAmt.toFixed(2)} (${vatPct}%)`;
            } else {
                vatRow.style.display = 'none';
            }
        }

        const totalEl = document.getElementById('drawer-i-total-disp');
        if (totalEl) totalEl.textContent = `R ${total.toFixed(2)}`;

        const terms = document.getElementById('drawer-i-terms')?.value;
        const depRow = document.getElementById('drawer-i-deposit-row');
        const depEl = document.getElementById('drawer-i-deposit-disp');
        if (depRow && depEl) {
            if (terms === '50% Deposit') {
                depRow.style.display = 'flex';
                const depAmt = total * 0.5;
                depEl.textContent = `R ${depAmt.toFixed(2)}`;
            } else {
                depRow.style.display = 'none';
            }
        }
    },

    async saveInvoice(e) {
        e.preventDefault();
        const cid = document.getElementById('drawer-i-client').value;
        const rowElements = document.querySelectorAll('.invoice-item-row');
        const items = [];
        let subtotal = 0;

        rowElements.forEach(row => {
            const desc = (row.querySelector('.i-item-desc')?.value || '').trim();
            const price = parseFloat(row.querySelector('.i-item-price')?.value || 0);
            const qty = parseFloat(row.querySelector('.i-item-qty')?.value || 1);
            if (desc) {
                items.push({ description: desc, price: price, quantity: qty });
                subtotal += (price * qty);
            }
        });

        if (!cid) return Swal.fire('Error', 'Please select a client', 'error');
        if (items.length === 0) return Swal.fire('Error', 'At least one line item with a description is required', 'error');

        const discountPct = parseFloat(document.getElementById('drawer-i-discount').value || 0);
        const vatPct = parseFloat(document.getElementById('drawer-i-vat').value || 0);
        const discountAmt = subtotal * (discountPct / 100);
        const total = subtotal - discountAmt;
        const vatAmt = total - (total / (1 + (vatPct / 100)));

        const dueDate = document.getElementById('drawer-i-due').value;
        const validDate = document.getElementById('drawer-i-valid').value;
        const startDate = document.getElementById('drawer-i-start').value;
        const paymentTerms = document.getElementById('drawer-i-terms').value;

        const formValues = {
            clientId: cid,
            quotationId: document.getElementById('drawer-i-quote').value || null,
            items: items,
            subtotal: subtotal.toFixed(2),
            discountPct: discountPct,
            discountAmt: discountAmt.toFixed(2),
            vatPct: vatPct,
            vatAmt: vatAmt.toFixed(2),
            total: total.toFixed(2),
            balanceDue: total.toFixed(2),
            status: document.getElementById('drawer-i-status').value,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            validUntil: validDate ? new Date(validDate).toISOString() : null,
            paymentTerms: paymentTerms,
            expectedStartDate: startDate ? new Date(startDate).toISOString() : null,
            deliveryTime: document.getElementById('drawer-i-delivery').value,
            customerNotes: document.getElementById('drawer-i-cnotes').value,
            poNumber: document.getElementById('drawer-i-po').value,
            salesperson: document.getElementById('drawer-i-sales').value,
            notes: document.getElementById('drawer-i-notes').value,
        };

        const submitBtn = document.getElementById('invoiceDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i> Saving...';

        try {
            if (this.currentInvoice && this.currentInvoice.id) {
                await API.request(`/api/invoices/${this.currentInvoice.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated Invoice`);
                Swal.fire({ icon: 'success', title: 'Invoice Updated', timer: 1500, showConfirmButton: false });
            } else {
                formValues.reference = 'INV-' + Math.floor(1000 + Math.random() * 9000);
                formValues.date = new Date().toISOString();
                await API.request('/api/invoices', { method: 'POST', body: JSON.stringify(formValues) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Created Invoice`);
                Swal.fire({ icon: 'success', title: 'Invoice Created', timer: 1500, showConfirmButton: false });
            }
            this.closeDrawer();
            this.loadInvoices();
            if (typeof app !== 'undefined' && app.loadDashboardData) {
                app.loadDashboardData();
            }
        } catch (err) {
            Swal.fire('Error', err.message || 'Failed to save invoice', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = this.currentInvoice ? 'Save Changes' : 'Create Invoice';
        }
    },

    editInvoice(id) {
        const i = this.invoices.find(x => x.id === id);
        if (i) this.openModal(i);
    },

    async download(id) {
        const inv = this.invoices.find(x => x.id === id);
        inv.client = this.clients.find(c => c.id === inv.clientId);
        pdfEngine.download('Invoice', inv);
    },

    sendWhatsApp(id) {
        const inv = this.invoices.find(x => x.id === id);
        const client = this.clients.find(c => c.id === inv.clientId);
        if (!client || !client.phone) return Swal.fire('Error', 'Client has no phone number', 'error');

        const userStr = localStorage.getItem('dtech_user');
        const user = userStr ? JSON.parse(userStr) : {};
        const bName = user.businessName || "D-TECH";
        const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon Receipt';
        const msg = encodeURIComponent(`Hi ${client.contactPerson || client.companyName},\n\nHere is your invoice summary from ${bName}:\nInvoice #: ${inv.reference}\nTotal: R ${inv.total}\nDue Date: ${dueDateStr}\nStatus: ${inv.status}\n\nPlease let us know if you need any assistance.\n\nRegards,\n${bName}`);
        const phone = client.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    },

    async deleteInvoice(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/invoices/${id}`, { method: 'DELETE' });
            if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Deleted Invoice`);
            this.loadInvoices();
            if (typeof app !== 'undefined' && app.loadDashboardData) {
                app.loadDashboardData();
            }
        }
    },

    toggleSelectAll(source) {
        const checkboxes = document.querySelectorAll('.invoice-checkbox');
        checkboxes.forEach(cb => cb.checked = source.checked);
    },

    async bulkDelete() {
        const selected = Array.from(document.querySelectorAll('.invoice-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) return Swal.fire('Info', 'No invoices selected', 'info');

        if (confirm(`Are you sure you want to delete ${selected.length} invoices?`)) {
            Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() }});
            try {
                for (const id of selected) {
                    await API.request(`/api/invoices/${id}`, { method: 'DELETE' });
                }
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Bulk deleted ${selected.length} Invoices`);
                await this.loadInvoices();
                if (typeof app !== 'undefined' && app.loadDashboardData) {
                    await app.loadDashboardData();
                }
                Swal.fire('Success', 'Invoices deleted', 'success');
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async bulkExport() {
        const selected = Array.from(document.querySelectorAll('.invoice-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) return Swal.fire('Info', 'No invoices selected', 'info');

        const selectedInvoices = this.invoices.filter(i => selected.includes(i.id));
        if (selectedInvoices.length === 0) return;

        let csv = "Invoice Number,Client,Status,Date,Subtotal,Discount,VAT,Total,Notes\n";
        selectedInvoices.forEach(i => {
            const client = this.clients.find(c => c.id === i.clientId);
            const cName = client ? client.companyName.replace(/,/g, '') : 'Unknown';
            const notes = (i.customerNotes || '').replace(/,/g, ' ').replace(/\n/g, ' ');
            csv += `${i.reference},${cName},${i.status},${new Date(i.date).toLocaleDateString()},${i.subtotal},${i.discount || 0},${i.vatAmt || 0},${i.total},${notes}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `invoices_bulk_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};
