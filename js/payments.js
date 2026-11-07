// js/payments.js

const paymentsManager = {
    payments: [],

    async loadPayments() {
        const container = document.getElementById('payments-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [pRes, iRes, cRes] = await Promise.all([
                API.request('/api/payments'),
                API.request('/api/invoices'),
                API.request('/api/clients')
            ]);
            if (pRes.success) {
                this.payments = pRes.payments;
                this.invoices = iRes.invoices;
                this.clients = cRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    filterPayments() {
        const query = (document.getElementById('paymentsSearchInput')?.value || '').toLowerCase().trim();
        const clearBtn = document.getElementById('paymentsSearchClear');
        if (clearBtn) {
            if (query.length > 0) clearBtn.classList.remove('hidden');
            else clearBtn.classList.add('hidden');
        }

        let filtered = this.payments || [];
        if (query) {
            filtered = filtered.filter(p => {
                const ref = (p.reference || '').toLowerCase();
                const method = (p.method || '').toLowerCase();
                const amount = String(p.amount || '');
                const inv = this.invoices.find(i => i.id === p.invoiceId) || {};
                const invRef = (inv.reference || '').toLowerCase();
                return ref.includes(query) || method.includes(query) || amount.includes(query) || invRef.includes(query);
            });
        }
        this.renderTable(filtered);
    },

    clearSearch() {
        const input = document.getElementById('paymentsSearchInput');
        const clearBtn = document.getElementById('paymentsSearchClear');
        if (input) input.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        this.filterPayments();
    },

    renderTable(list = null) {
        const container = document.getElementById('payments-container');
        if (!this.payments || this.payments.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No payments found.</div>`;
            return;
        }

        const dataToRender = list !== null ? list : this.payments;
        if (dataToRender.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10"><i class="fas fa-search text-2xl text-gray-400 mb-2 block"></i>No payments match your search.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Ref</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.payments.forEach(pay => {
            const inv = this.invoices.find(i => i.id === pay.invoiceId) || {};
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Receipt #:</div>
                        <div class="text-right md:text-left">${pay.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Invoice Ref:</div>
                        <div class="text-right md:text-left">${inv.reference || 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-semibold text-green-600">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Amount:</div>
                        <div class="text-right md:text-left">R ${pay.total}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Method/Status:</div>
                        <div class="text-right md:text-left">
                            ${pay.method}
                            <span class="ml-2 px-2 py-0.5 text-xs rounded-full ${pay.paymentStatus === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${pay.paymentStatus || 'Confirmed'}</span>
                        </div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="paymentsManager.download('${pay.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Download Receipt PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="paymentsManager.editPayment('${pay.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    ensureDrawer() {
        let modal = document.getElementById('paymentDrawerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'paymentDrawerModal';
            modal.className = 'fixed inset-0 z-50 overflow-hidden hidden';
            modal.innerHTML = `
                <div class="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" id="paymentDrawerOverlay"></div>
                <div class="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                    <div class="w-screen max-w-xl bg-white dark:bg-dark-card shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full" id="paymentDrawerPanel">
                        <div class="p-4 sm:p-6 border-b dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-card">
                            <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white" id="paymentDrawerTitle">Record Payment</h3>
                            <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" onclick="paymentsManager.closeModal()">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form id="paymentDrawerForm" class="flex flex-col flex-grow overflow-hidden" onsubmit="paymentsManager.savePayment(event)">
                            <div class="p-4 sm:p-6 overflow-y-auto flex-grow space-y-5" id="paymentDrawerContent">
                                <input id="drawer-pay-id" type="hidden">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice *</label>
                                    <select id="drawer-pay-inv" required class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></select>
                                    <p class="text-xs text-gray-500 mt-1">Select the invoice this payment applies to.</p>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Paid (ZAR) *</label>
                                        <input type="number" id="drawer-pay-amount" step="any" required placeholder="0.00" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                                        <input type="text" id="drawer-pay-currency" value="ZAR" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                                        <input type="date" id="drawer-pay-date" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
                                        <select id="drawer-pay-status" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Refunded">Refunded</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                                        <select id="drawer-pay-method" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                            <option value="EFT">EFT / Bank Transfer</option>
                                            <option value="Card">Card</option>
                                            <option value="Cash">Cash</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                                        <input type="text" id="drawer-pay-bank" placeholder="FNB, Standard Bank, Capitec..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Reference</label>
                                    <input type="text" id="drawer-pay-ref" placeholder="e.g. Bank Ref, EFT-9281, etc." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received By</label>
                                        <input type="text" id="drawer-pay-receivedby" placeholder="Staff Name" class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proof of Payment URL</label>
                                        <input type="url" id="drawer-pay-proof" placeholder="https://..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
                                    <textarea id="drawer-pay-notes" rows="2" placeholder="Internal remarks..." class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2 text-sm border shadow-sm focus:border-dtech-500"></textarea>
                                </div>
                            </div>
                            <div class="p-4 sm:p-6 border-t dark:border-dark-border flex justify-end space-x-3 bg-gray-50 dark:bg-dark-card flex-shrink-0">
                                <button type="button" onclick="paymentsManager.closeModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">Cancel</button>
                                <button type="submit" id="paymentDrawerSubmitBtn" class="px-5 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-dtech-600 hover:bg-dtech-700 shadow-sm transition">Save Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'paymentDrawerOverlay') paymentsManager.closeModal();
            });
        }
        return modal;
    },

    async openModal(payment = null) {
        if (!this.invoices || this.invoices.length === 0) return Swal.fire('Error', 'No invoices found', 'error');

        const modal = this.ensureDrawer();
        const panel = document.getElementById('paymentDrawerPanel');
        const form = document.getElementById('paymentDrawerForm');
        if (form) form.reset();

        const p = payment || {};
        const isEdit = !!payment;
        this._currentPayment = payment;

        document.getElementById('paymentDrawerTitle').innerText = isEdit ? 'Edit Payment' : 'Record Payment';
        document.getElementById('paymentDrawerSubmitBtn').innerText = isEdit ? 'Save Changes' : 'Save Payment';

        const invSelect = document.getElementById('drawer-pay-inv');
        let invoiceOptions = '<option value="" disabled>Select Invoice</option>';
        if (isEdit) {
            invoiceOptions += this.invoices.map(i => `<option value="${i.id}" ${p.invoiceId === i.id ? 'selected' : ''}>${i.reference} - ${i.currency||'ZAR'} ${i.total}</option>`).join('');
            invSelect.disabled = true;
        } else {
            invSelect.disabled = false;
            const unpaidInvoices = this.invoices.filter(i => i.status !== 'Paid');
            if (unpaidInvoices.length === 0) return Swal.fire('Info', 'All invoices are currently marked Paid!', 'info');
            invoiceOptions += unpaidInvoices.map(i => `<option value="${i.id}">${i.reference} - ${i.currency||'ZAR'} ${i.total} (${i.status})</option>`).join('');
        }
        invSelect.innerHTML = invoiceOptions;

        // Auto-fill invoice amount on select change
        invSelect.onchange = () => {
            const selectedInv = this.invoices.find(i => i.id === invSelect.value);
            if (selectedInv) {
                document.getElementById('drawer-pay-amount').value = selectedInv.balanceDue || selectedInv.total || '';
                document.getElementById('drawer-pay-currency').value = selectedInv.currency || 'ZAR';
            }
        };

        const dStr = isEdit && p.paymentDate ? p.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0];

        document.getElementById('drawer-pay-id').value = isEdit ? p.id : '';
        document.getElementById('drawer-pay-amount').value = isEdit ? (p.total || p.amount || '') : '';
        document.getElementById('drawer-pay-currency').value = isEdit ? (p.currency || 'ZAR') : 'ZAR';
        document.getElementById('drawer-pay-date').value = dStr;
        document.getElementById('drawer-pay-status').value = isEdit ? (p.paymentStatus || 'Confirmed') : 'Confirmed';
        document.getElementById('drawer-pay-method').value = isEdit ? (p.method || 'EFT') : 'EFT';
        document.getElementById('drawer-pay-bank').value = isEdit ? (p.bank || '') : '';
        document.getElementById('drawer-pay-ref').value = isEdit ? (p.transactionReference || '') : '';
        document.getElementById('drawer-pay-receivedby').value = isEdit ? (p.receivedBy || '') : '';
        document.getElementById('drawer-pay-proof').value = isEdit ? (p.proofLink || '') : '';
        document.getElementById('drawer-pay-notes').value = isEdit ? (p.notes || '') : '';

        // If newly opening without edit and has options, select first invoice and set default amount
        if (!isEdit) {
            const firstUnpaid = this.invoices.find(i => i.status !== 'Paid');
            if (firstUnpaid) {
                invSelect.value = firstUnpaid.id;
                document.getElementById('drawer-pay-amount').value = firstUnpaid.balanceDue || firstUnpaid.total || '';
            }
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            if (panel) panel.classList.remove('translate-x-full');
        }, 10);
    },

    closeModal() {
        const modal = document.getElementById('paymentDrawerModal');
        const panel = document.getElementById('paymentDrawerPanel');
        if (panel) panel.classList.add('translate-x-full');
        setTimeout(() => {
            if (modal) modal.classList.add('hidden');
        }, 300);
    },

    async savePayment(e) {
        e.preventDefault();
        const p = this._currentPayment;
        const isEdit = !!p;

        const invId = isEdit ? p.invoiceId : document.getElementById('drawer-pay-inv').value;
        const amt = parseFloat(document.getElementById('drawer-pay-amount').value || 0);

        if (!invId || !amt) {
            Swal.fire('Error', 'Please select an invoice and enter a valid amount', 'warning');
            return;
        }

        const inv = this.invoices.find(i => i.id === invId);
        const client = this.clients ? this.clients.find(c => c.id === inv.clientId) : null;
        const pDate = document.getElementById('drawer-pay-date').value;

        const formValues = {
            invoiceId: invId,
            amount: amt,
            total: amt,
            currency: document.getElementById('drawer-pay-currency').value || 'ZAR',
            paymentDate: pDate ? new Date(pDate).toISOString() : new Date().toISOString(),
            paymentStatus: document.getElementById('drawer-pay-status').value,
            method: document.getElementById('drawer-pay-method').value,
            bank: document.getElementById('drawer-pay-bank').value,
            transactionReference: document.getElementById('drawer-pay-ref').value,
            receivedBy: document.getElementById('drawer-pay-receivedby').value,
            proofLink: document.getElementById('drawer-pay-proof').value,
            notes: document.getElementById('drawer-pay-notes').value,
            clientId: inv.clientId,
            items: [{ description: `Payment for ${inv.reference} via ${document.getElementById('drawer-pay-method').value}`, price: amt, quantity: 1 }],
            subtotal: amt
        };

        const submitBtn = document.getElementById('paymentDrawerSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

        try {
            let savedPayId = isEdit ? p.id : null;
            if (isEdit) {
                await API.request(`/api/payments/${p.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated Payment for ${inv.reference}`);
                Swal.fire({ icon: 'success', title: 'Updated', text: 'Payment updated successfully', timer: 1500, showConfirmButton: false });
            } else {
                formValues.reference = 'REC-' + Math.floor(1000 + Math.random() * 9000);
                formValues.date = new Date().toISOString();
                const res = await API.request('/api/payments', { method: 'POST', body: JSON.stringify(formValues) });
                if (res && res.item) savedPayId = res.item.id;
                if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Recorded Payment of R${formValues.amount} for ${inv.reference}`);

                // If Confirmed, update Invoice status to Paid
                if (formValues.paymentStatus === 'Confirmed') {
                    await API.request(`/api/invoices/${inv.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Paid', balanceDue: '0.00' }) });
                }

                // Automatically link and record in Financial Transactions Ledger
                try {
                    const txDate = pDate ? pDate : new Date().toISOString().split('T')[0];
                    const clientName = client ? client.companyName : (inv.clientName || 'Client');
                    const tx = {
                        date: txDate,
                        description: `Payment: ${inv.reference} - ${clientName}`,
                        amount: amt,
                        type: 'Income',
                        category: 'Sales / Services Revenue',
                        reference: formValues.transactionReference || formValues.reference || inv.reference,
                        paymentId: savedPayId,
                        invoiceId: inv.id
                    };
                    await API.request('/api/transactions', { method: 'POST', body: JSON.stringify(tx) });
                } catch (txErr) {
                    console.warn("Could not auto-sync transaction to financials ledger", txErr);
                }

                Swal.fire({ icon: 'success', title: 'Success', text: 'Payment recorded and synced to Financials', timer: 1800, showConfirmButton: false });
            }

            this.closeModal();
            this.loadPayments();
            if (typeof app !== 'undefined' && app.loadDashboardData) app.loadDashboardData();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = isEdit ? 'Save Changes' : 'Save Payment';
        }
    },

    editPayment(id) {
        const p = this.payments.find(x => x.id === id);
        if (p) this.openModal(p);
    },

    async download(id) {
        const pay = this.payments.find(x => x.id === id);
        pay.client = this.clients.find(c => c.id === pay.clientId);
        pdfEngine.download('Receipt', pay);
    }
};