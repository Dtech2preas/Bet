// js/invoices.js

const invoicesManager = {
    invoices: [],

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

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
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
            const statusColor = inv.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
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
                        <div>
                            <button onclick="invoicesManager.preview('${inv.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="invoicesManager.deleteInvoice('${inv.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(invoice = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        const i = invoice || {};
        const isEdit = !!invoice;
        const title = isEdit ? 'Edit Invoice' : 'Create Invoice';

        const clientOptions = this.clients.map(c => `<option value="${c.id}" ${i.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        let quotesOptions = '<option value="">No Quotation Linked</option>';
        try {
            const qRes = await API.request('/api/quotations');
            if (qRes.success && qRes.quotations) {
                quotesOptions += qRes.quotations.map(q => `<option value="${q.id}" ${i.quotationId === q.id ? 'selected' : ''}>${q.reference} - ${q.title || 'Untitled'}</option>`).join('');
            }
        } catch (e) { console.warn("Could not load quotes for dropdown", e); }

        const itemDesc = i.items && i.items.length > 0 ? i.items[0].description : '';
        const itemPrice = i.items && i.items.length > 0 ? i.items[0].price : '';
        const itemQty = i.items && i.items.length > 0 ? i.items[0].quantity : 1;

        const d = new Date();
        d.setDate(d.getDate() + 14); // Due default 14 days
        const dueStr = isEdit && i.dueDate ? i.dueDate.split('T')[0] : d.toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3 h-96 overflow-y-auto pr-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Client *</label><select id="swal-i-client" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Client</option>${clientOptions}</select></div>
                        <div><label class="font-medium">Related Quotation</label><select id="swal-i-quote" class="swal2-input mt-1 w-full m-0">${quotesOptions}</select></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Item Details</h4>
                    <div><label class="font-medium">Item Description *</label><input id="swal-i-desc" class="swal2-input mt-1 w-full m-0" value="${itemDesc}" placeholder="Item Description"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Unit Price</label><input id="swal-i-price" type="number" class="swal2-input mt-1 w-full m-0" value="${itemPrice}" placeholder="0.00"></div>
                        <div><label class="font-medium">Quantity</label><input id="swal-i-qty" type="number" class="swal2-input mt-1 w-full m-0" value="${itemQty}" placeholder="1"></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Financials & Terms</h4>
                    <div class="grid grid-cols-3 gap-2">
                        <div><label class="font-medium">Discount (%)</label><input id="swal-i-discount" type="number" class="swal2-input mt-1 w-full m-0" value="${i.discount || 0}" placeholder="0"></div>
                        <div><label class="font-medium">VAT (%)</label><input id="swal-i-vat" type="number" class="swal2-input mt-1 w-full m-0" value="${i.vat || 15}" placeholder="15"></div>
                        <div><label class="font-medium">Status</label><select id="swal-i-status" class="swal2-input mt-1 w-full m-0"><option value="Unpaid" ${i.status==='Unpaid'?'selected':''}>Unpaid</option><option value="Paid" ${i.status==='Paid'?'selected':''}>Paid</option><option value="Overdue" ${i.status==='Overdue'?'selected':''}>Overdue</option><option value="Cancelled" ${i.status==='Cancelled'?'selected':''}>Cancelled</option></select></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Due Date</label><input type="date" id="swal-i-due" class="swal2-input mt-1 w-full m-0" value="${dueStr}"></div>
                        <div><label class="font-medium">Payment Terms</label><select id="swal-i-terms" class="swal2-input mt-1 w-full m-0">
                            <option value="Due on Receipt" ${i.paymentTerms==='Due on Receipt'?'selected':''}>Due on Receipt</option>
                            <option value="7 Days" ${i.paymentTerms==='7 Days'?'selected':''}>7 Days</option>
                            <option value="14 Days" ${i.paymentTerms==='14 Days'?'selected':''}>14 Days</option>
                            <option value="30 Days" ${i.paymentTerms==='30 Days'?'selected':''}>30 Days</option>
                        </select></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Other Info</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Purchase Order (PO) #</label><input id="swal-i-po" class="swal2-input mt-1 w-full m-0" value="${i.poNumber || ''}" placeholder="PO-12345"></div>
                        <div><label class="font-medium">Salesperson</label><input id="swal-i-sales" class="swal2-input mt-1 w-full m-0" value="${i.salesperson || ''}" placeholder="Name"></div>
                    </div>
                    <div><label class="font-medium">Internal Notes</label><textarea id="swal-i-notes" class="swal2-input mt-1 w-full m-0 p-2 text-sm" rows="2" placeholder="Internal only">${i.notes || ''}</textarea></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            width: '700px',
            preConfirm: () => {
                const cid = document.getElementById('swal-i-client').value;
                const desc = document.getElementById('swal-i-desc').value;
                if (!cid || !desc) {
                    Swal.showValidationMessage('Client and Item Description are required');
                    return false;
                }

                const price = parseFloat(document.getElementById('swal-i-price').value || 0);
                const qty = parseFloat(document.getElementById('swal-i-qty').value || 1);
                const discountPct = parseFloat(document.getElementById('swal-i-discount').value || 0);
                const vatPct = parseFloat(document.getElementById('swal-i-vat').value || 0);

                const subtotal = price * qty;
                const discountAmt = subtotal * (discountPct / 100);
                const afterDiscount = subtotal - discountAmt;
                const vatAmt = afterDiscount * (vatPct / 100);
                const total = afterDiscount + vatAmt;

                const dueDate = document.getElementById('swal-i-due').value;

                return {
                    clientId: cid,
                    quotationId: document.getElementById('swal-i-quote').value,
                    items: [{
                        description: desc,
                        price: price,
                        quantity: qty
                    }],
                    subtotal: subtotal.toFixed(2),
                    discountPct: discountPct,
                    discountAmt: discountAmt.toFixed(2),
                    vatPct: vatPct,
                    vatAmt: vatAmt.toFixed(2),
                    total: total.toFixed(2),
                    balanceDue: total.toFixed(2), // Initial balance = total
                    status: document.getElementById('swal-i-status').value,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                    paymentTerms: document.getElementById('swal-i-terms').value,
                    poNumber: document.getElementById('swal-i-po').value,
                    salesperson: document.getElementById('swal-i-sales').value,
                    notes: document.getElementById('swal-i-notes').value,
                }
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    // if status is paid, balance should be 0 (simple auto calc for now)
                    if (formValues.status === 'Paid') formValues.balanceDue = '0.00';
                    await API.request(`/api/invoices/${i.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Invoice updated', 'success');
                } else {
                    formValues.reference = 'INV-' + Math.floor(1000 + Math.random() * 9000);
                    formValues.date = new Date().toISOString();
                    await API.request('/api/invoices', { method: 'POST', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Invoice created', 'success');
                }
                this.loadInvoices();
                app.loadDashboardData();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editInvoice(id) {
        const i = this.invoices.find(x => x.id === id);
        if (i) this.openModal(i);
    },

    async preview(id) {
        const inv = this.invoices.find(x => x.id === id);
        inv.client = this.clients.find(c => c.id === inv.clientId);
        pdfEngine.preview('Invoice', inv);
    },

    async deleteInvoice(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/invoices/${id}`, { method: 'DELETE' });
            this.loadInvoices();
            app.loadDashboardData();
        }
    }
};