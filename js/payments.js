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
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Method:</div>
                        <div class="text-right md:text-left">${pay.method}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="paymentsManager.preview('${pay.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview Receipt PDF"><i class="fas fa-file-pdf"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal() {
        if (!this.invoices || this.invoices.length === 0) return Swal.fire('Error', 'No invoices found', 'error');

        const unpaidInvoices = this.invoices.filter(i => i.status !== 'Paid');
        if (unpaidInvoices.length === 0) return Swal.fire('Info', 'All invoices are paid!', 'info');

        const invoiceOptions = unpaidInvoices.map(i => `<option value="${i.id}">${i.reference} - R ${i.total}</option>`).join('');

        const { value: formValues } = await Swal.fire({
            title: 'Record Payment',
            html: `
                <select id="swal-pay-inv" class="swal2-input"><option value="" disabled selected>Select Invoice</option>${invoiceOptions}</select>
                <select id="swal-pay-method" class="swal2-input">
                    <option value="EFT">EFT</option>
                    <option value="Card">Card</option>
                    <option value="Cash">Cash</option>
                </select>
                <input id="swal-pay-amount" type="number" class="swal2-input" placeholder="Amount Paid (ZAR)">
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    invoiceId: document.getElementById('swal-pay-inv').value,
                    method: document.getElementById('swal-pay-method').value,
                    total: parseFloat(document.getElementById('swal-pay-amount').value || 0)
                }
            }
        });

        if (formValues && formValues.invoiceId) {
            const inv = this.invoices.find(i => i.id === formValues.invoiceId);

            formValues.reference = 'REC-' + Math.floor(1000 + Math.random() * 9000);
            formValues.date = new Date().toISOString();
            formValues.clientId = inv.clientId;
            formValues.items = [{ description: `Payment for ${inv.reference} via ${formValues.method}`, price: formValues.total, quantity: 1 }];
            formValues.subtotal = formValues.total;

            try {
                // Save payment
                await API.request('/api/payments', { method: 'POST', body: JSON.stringify(formValues) });
                // Update Invoice status to Paid
                await API.request(`/api/invoices/${inv.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Paid' }) });

                Swal.fire('Success', 'Payment recorded', 'success');
                this.loadPayments();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async preview(id) {
        const pay = this.payments.find(x => x.id === id);
        pay.client = this.clients.find(c => c.id === pay.clientId);
        pdfEngine.preview('Receipt', pay);
    }
};