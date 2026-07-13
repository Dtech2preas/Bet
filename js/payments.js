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

    renderTable() {
        const container = document.getElementById('payments-container');
        if (this.payments.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No payments found.</div>`;
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
                            <button onclick="paymentsManager.preview('${pay.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview Receipt PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="paymentsManager.editPayment('${pay.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(payment = null) {
        if (!this.invoices || this.invoices.length === 0) return Swal.fire('Error', 'No invoices found', 'error');

        const p = payment || {};
        const isEdit = !!payment;
        const title = isEdit ? 'Edit Payment' : 'Record Payment';

        let invoiceOptions = '<option value="" disabled>Select Invoice</option>';
        if (isEdit) {
            invoiceOptions += this.invoices.map(i => `<option value="${i.id}" ${p.invoiceId === i.id ? 'selected' : ''}>${i.reference} - ${i.currency||'ZAR'} ${i.total}</option>`).join('');
        } else {
            const unpaidInvoices = this.invoices.filter(i => i.status !== 'Paid');
            if (unpaidInvoices.length === 0) return Swal.fire('Info', 'All invoices are paid!', 'info');
            invoiceOptions += unpaidInvoices.map(i => `<option value="${i.id}">${i.reference} - ${i.currency||'ZAR'} ${i.total}</option>`).join('');
        }

        const dStr = isEdit && p.paymentDate ? p.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3 h-96 overflow-y-auto pr-2">
                    <div><label class="font-medium">Invoice *</label><select id="swal-pay-inv" class="swal2-input mt-1 w-full m-0" ${isEdit ? 'disabled' : ''}>${invoiceOptions}</select></div>

                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Amount Paid *</label><input id="swal-pay-amount" type="number" class="swal2-input mt-1 w-full m-0" value="${p.total || p.amount || ''}" placeholder="0.00"></div>
                        <div><label class="font-medium">Currency</label><input id="swal-pay-currency" class="swal2-input mt-1 w-full m-0" value="${p.currency || 'ZAR'}" placeholder="ZAR"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Payment Date</label><input type="date" id="swal-pay-date" class="swal2-input mt-1 w-full m-0" value="${dStr}"></div>
                        <div><label class="font-medium">Payment Status</label><select id="swal-pay-status" class="swal2-input mt-1 w-full m-0">
                            <option value="Pending" ${p.paymentStatus==='Pending'?'selected':''}>Pending</option>
                            <option value="Confirmed" ${(!isEdit || p.paymentStatus==='Confirmed')?'selected':''}>Confirmed</option>
                            <option value="Refunded" ${p.paymentStatus==='Refunded'?'selected':''}>Refunded</option>
                        </select></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Payment Method</label><select id="swal-pay-method" class="swal2-input mt-1 w-full m-0">
                            <option value="EFT" ${p.method==='EFT'?'selected':''}>EFT</option>
                            <option value="Card" ${p.method==='Card'?'selected':''}>Card</option>
                            <option value="Cash" ${p.method==='Cash'?'selected':''}>Cash</option>
                        </select></div>
                        <div><label class="font-medium">Bank</label><input id="swal-pay-bank" class="swal2-input mt-1 w-full m-0" value="${p.bank || ''}" placeholder="Bank Name"></div>
                    </div>

                    <div><label class="font-medium">Transaction Reference</label><input id="swal-pay-ref" class="swal2-input mt-1 w-full m-0" value="${p.transactionReference || ''}" placeholder="..."></div>
                    <div><label class="font-medium">Received By</label><input id="swal-pay-receivedby" class="swal2-input mt-1 w-full m-0" value="${p.receivedBy || ''}" placeholder="Name"></div>
                    <div><label class="font-medium">Proof of Payment Link (URL)</label><input id="swal-pay-proof" class="swal2-input mt-1 w-full m-0" value="${p.proofLink || ''}" placeholder="https://..."></div>
                    <div><label class="font-medium">Internal Notes</label><textarea id="swal-pay-notes" class="swal2-input mt-1 w-full m-0 p-2 text-sm" rows="2" placeholder="Internal only">${p.notes || ''}</textarea></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            width: '600px',
            preConfirm: () => {
                const invId = isEdit ? p.invoiceId : document.getElementById('swal-pay-inv').value;
                const amt = parseFloat(document.getElementById('swal-pay-amount').value || 0);
                if (!invId || !amt) {
                    Swal.showValidationMessage('Invoice and Amount are required');
                    return false;
                }

                const pDate = document.getElementById('swal-pay-date').value;

                return {
                    invoiceId: invId,
                    amount: amt,
                    total: amt, // for backwards compat in renderTable and PDF
                    currency: document.getElementById('swal-pay-currency').value,
                    paymentDate: pDate ? new Date(pDate).toISOString() : new Date().toISOString(),
                    paymentStatus: document.getElementById('swal-pay-status').value,
                    method: document.getElementById('swal-pay-method').value,
                    bank: document.getElementById('swal-pay-bank').value,
                    transactionReference: document.getElementById('swal-pay-ref').value,
                    receivedBy: document.getElementById('swal-pay-receivedby').value,
                    proofLink: document.getElementById('swal-pay-proof').value,
                    notes: document.getElementById('swal-pay-notes').value,
                }
            }
        });

        if (formValues) {
            const inv = this.invoices.find(i => i.id === formValues.invoiceId);

            // Re-sync basic details needed for existing PDF generation logic
            formValues.clientId = inv.clientId;
            formValues.items = [{ description: `Payment for ${inv.reference} via ${formValues.method}`, price: formValues.total, quantity: 1 }];
            formValues.subtotal = formValues.total;

            try {
                if (isEdit) {
                    // Update payment
                    await API.request(`/api/payments/${p.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Payment updated', 'success');
                } else {
                    formValues.reference = 'REC-' + Math.floor(1000 + Math.random() * 9000);
                    formValues.date = new Date().toISOString();
                    // Save payment
                    await API.request('/api/payments', { method: 'POST', body: JSON.stringify(formValues) });

                    // If Confirmed, update Invoice status to Paid
                    if (formValues.paymentStatus === 'Confirmed') {
                        await API.request(`/api/invoices/${inv.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Paid', balanceDue: '0.00' }) });
                    }
                    Swal.fire('Success', 'Payment recorded', 'success');
                }

                this.loadPayments();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editPayment(id) {
        const p = this.payments.find(x => x.id === id);
        if (p) this.openModal(p);
    },

    async preview(id) {
        const pay = this.payments.find(x => x.id === id);
        pay.client = this.clients.find(c => c.id === pay.clientId);
        pdfEngine.preview('Receipt', pay);
    }
};