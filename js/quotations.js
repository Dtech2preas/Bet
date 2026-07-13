// js/quotations.js

const quotationsManager = {
    quotations: [],

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

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
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
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
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
                        <div class="text-right md:text-left">R ${q.total}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${q.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="quotationsManager.preview('${q.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="quotationsManager.sendWhatsApp('${q.id}')" class="text-green-600 hover:text-green-900 mr-2" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                            <button onclick="quotationsManager.deleteQuote('${q.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(quotation = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        const q = quotation || {};
        const isEdit = !!quotation;
        const title = isEdit ? 'Edit Quotation' : 'Create Quotation';

        const clientOptions = this.clients.map(c => `<option value="${c.id}" ${q.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        // Extract single item if it exists for simpler editing in this modal style
        const itemDesc = q.items && q.items.length > 0 ? q.items[0].description : '';
        const itemPrice = q.items && q.items.length > 0 ? q.items[0].price : '';
        const itemQty = q.items && q.items.length > 0 ? q.items[0].quantity : 1;

        const d = new Date();
        d.setDate(d.getDate() + 30); // Valid until default 30 days
        const validStr = isEdit && q.validUntil ? q.validUntil.split('T')[0] : d.toISOString().split('T')[0];
        const projStartStr = isEdit && q.expectedStartDate ? q.expectedStartDate.split('T')[0] : '';

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3 h-96 overflow-y-auto pr-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Client *</label><select id="swal-q-client" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Client</option>${clientOptions}</select></div>
                        <div><label class="font-medium">Quotation Title</label><input id="swal-q-title" class="swal2-input mt-1 w-full m-0" value="${q.title || ''}" placeholder="e.g. Website Redesign"></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Item Details (Single item for now)</h4>
                    <div><label class="font-medium">Item Description *</label><input id="swal-q-desc" class="swal2-input mt-1 w-full m-0" value="${itemDesc}" placeholder="Item Description"></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Unit Price</label><input id="swal-q-price" type="number" class="swal2-input mt-1 w-full m-0" value="${itemPrice}" placeholder="0.00"></div>
                        <div><label class="font-medium">Quantity</label><input id="swal-q-qty" type="number" class="swal2-input mt-1 w-full m-0" value="${itemQty}" placeholder="1"></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Financials & Terms</h4>
                    <div class="grid grid-cols-3 gap-2">
                        <div><label class="font-medium">Currency</label><input id="swal-q-currency" class="swal2-input mt-1 w-full m-0" value="${q.currency || 'ZAR'}" placeholder="ZAR"></div>
                        <div><label class="font-medium">Discount (%)</label><input id="swal-q-discount" type="number" class="swal2-input mt-1 w-full m-0" value="${q.discount || 0}" placeholder="0"></div>
                        <div><label class="font-medium">VAT (%)</label><input id="swal-q-vat" type="number" class="swal2-input mt-1 w-full m-0" value="${q.vat || 15}" placeholder="15"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Valid Until</label><input type="date" id="swal-q-valid" class="swal2-input mt-1 w-full m-0" value="${validStr}"></div>
                        <div><label class="font-medium">Payment Terms</label><select id="swal-q-terms" class="swal2-input mt-1 w-full m-0">
                            <option value="Due on Receipt" ${q.paymentTerms==='Due on Receipt'?'selected':''}>Due on Receipt</option>
                            <option value="7 Days" ${q.paymentTerms==='7 Days'?'selected':''}>7 Days</option>
                            <option value="14 Days" ${q.paymentTerms==='14 Days'?'selected':''}>14 Days</option>
                            <option value="30 Days" ${q.paymentTerms==='30 Days'?'selected':''}>30 Days</option>
                        </select></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Logistics & Notes</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Expected Project Start</label><input type="date" id="swal-q-start" class="swal2-input mt-1 w-full m-0" value="${projStartStr}"></div>
                        <div><label class="font-medium">Delivery Time</label><input id="swal-q-delivery" class="swal2-input mt-1 w-full m-0" value="${q.deliveryTime || ''}" placeholder="e.g. 2 weeks"></div>
                    </div>
                    <div><label class="font-medium">Customer Notes</label><textarea id="swal-q-cnotes" class="swal2-input mt-1 w-full m-0 p-2 text-sm" rows="2" placeholder="Visible on PDF">${q.customerNotes || ''}</textarea></div>
                    <div><label class="font-medium">Internal Notes</label><textarea id="swal-q-inotes" class="swal2-input mt-1 w-full m-0 p-2 text-sm" rows="2" placeholder="Internal only">${q.internalNotes || ''}</textarea></div>
                    <div><label class="font-medium">Attachments (URL)</label><input id="swal-q-attach" class="swal2-input mt-1 w-full m-0" value="${q.attachments || ''}" placeholder="Link to Google Drive / Dropbox"></div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            width: '700px',
            preConfirm: () => {
                const cid = document.getElementById('swal-q-client').value;
                const desc = document.getElementById('swal-q-desc').value;
                if (!cid || !desc) {
                    Swal.showValidationMessage('Client and Item Description are required');
                    return false;
                }

                const price = parseFloat(document.getElementById('swal-q-price').value || 0);
                const qty = parseFloat(document.getElementById('swal-q-qty').value || 1);
                const discountPct = parseFloat(document.getElementById('swal-q-discount').value || 0);
                const vatPct = parseFloat(document.getElementById('swal-q-vat').value || 0);

                const subtotal = price * qty;
                const discountAmt = subtotal * (discountPct / 100);
                const afterDiscount = subtotal - discountAmt;
                const vatAmt = afterDiscount * (vatPct / 100);
                const total = afterDiscount + vatAmt;

                const validDate = document.getElementById('swal-q-valid').value;
                const startDate = document.getElementById('swal-q-start').value;

                return {
                    clientId: cid,
                    title: document.getElementById('swal-q-title').value,
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
                    currency: document.getElementById('swal-q-currency').value,
                    validUntil: validDate ? new Date(validDate).toISOString() : null,
                    paymentTerms: document.getElementById('swal-q-terms').value,
                    expectedStartDate: startDate ? new Date(startDate).toISOString() : null,
                    deliveryTime: document.getElementById('swal-q-delivery').value,
                    customerNotes: document.getElementById('swal-q-cnotes').value,
                    internalNotes: document.getElementById('swal-q-inotes').value,
                    attachments: document.getElementById('swal-q-attach').value,
                }
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    await API.request(`/api/quotations/${q.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Quotation updated', 'success');
                } else {
                    formValues.reference = 'QT-' + Math.floor(1000 + Math.random() * 9000);
                    formValues.status = 'Draft';
                    formValues.date = new Date().toISOString();
                    await API.request('/api/quotations', { method: 'POST', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Quotation created', 'success');
                }
                this.loadQuotations();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editQuote(id) {
        const q = this.quotations.find(x => x.id === id);
        if (q) this.openModal(q);
    },

    async preview(id) {
        const q = this.quotations.find(x => x.id === id);
        q.client = this.clients.find(c => c.id === q.clientId);
        pdfEngine.preview('Quotation', q);
    },

    sendWhatsApp(id) {
        const q = this.quotations.find(x => x.id === id);
        const client = this.clients.find(c => c.id === q.clientId);
        if (!client || !client.phone) return Swal.fire('Error', 'Client has no phone number', 'error');

        const msg = encodeURIComponent(`Hi ${client.contactPerson || client.companyName},\n\nHere is the summary for Quotation ${q.reference}:\nTotal: R ${q.total}\n\nPlease let us know if you have any questions.\n\nRegards,\nD-TECH`);
        const phone = client.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    },

    async deleteQuote(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/quotations/${id}`, { method: 'DELETE' });
            this.loadQuotations();
        }
    }
};