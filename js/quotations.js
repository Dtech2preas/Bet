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
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${q.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="quotationsManager.editQuote('${q.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="quotationsManager.download('${q.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Download PDF"><i class="fas fa-file-pdf"></i></button>
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


        const d = new Date();
        d.setDate(d.getDate() + 30); // Valid until default 30 days
        const validStr = isEdit && q.validUntil ? q.validUntil.split('T')[0] : d.toISOString().split('T')[0];
        const projStartStr = isEdit && q.expectedStartDate ? q.expectedStartDate.split('T')[0] : '';

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><label class="font-medium">Client *</label><select id="swal-q-client" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Client</option>${clientOptions}</select></div>
                        <div><label class="font-medium">Quotation Title</label><p class="text-xs text-gray-500 mb-1">A short description of the project.</p><input id="swal-q-title" class="swal2-input mt-1 w-full m-0" value="${q.title || ''}" placeholder="e.g. Website Redesign"></div>
                    </div>


                    <div class="flex justify-between items-center border-b pb-1 mt-4">
                        <h4 class="font-semibold">Item Details</h4>
                        <button type="button" id="add-q-item-btn" class="text-xs bg-dtech-100 text-dtech-700 px-2 py-1 rounded hover:bg-dtech-200">+ Add Item</button>
                    </div>
                    <div id="swal-q-items-container" class="space-y-2 mt-2"></div>


                    <h4 class="font-semibold border-b pb-1 mt-4">Financials & Terms</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div><label class="font-medium">Currency</label><input id="swal-q-currency" class="swal2-input mt-1 w-full m-0" value="${q.currency || 'ZAR'}" placeholder="ZAR"></div>
                        <div><label class="font-medium">Discount (%)</label><p class="text-xs text-gray-500 mb-1">Leave at 0 if no discount.</p><input id="swal-q-discount" type="number" class="swal2-input mt-1 w-full m-0" value="${q.discount || 0}" placeholder="0"></div>
                        <div><label class="font-medium">VAT (%)</label><p class="text-xs text-gray-500 mb-1">Standard rate is 15%.</p><input id="swal-q-vat" type="number" class="swal2-input mt-1 w-full m-0" value="${q.vat || 15}" placeholder="15"></div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><label class="font-medium">Valid Until</label><input type="date" id="swal-q-valid" class="swal2-input mt-1 w-full m-0" value="${validStr}"></div>
                        <div><label class="font-medium">Payment Terms</label><select id="swal-q-terms" class="swal2-input mt-1 w-full m-0">
                            <option value="Due on Receipt" ${q.paymentTerms==='Due on Receipt'?'selected':''}>Due on Receipt</option>
                            <option value="50% Deposit" ${q.paymentTerms==='50% Deposit'?'selected':''}>50% Deposit</option>
                            <option value="7 Days" ${q.paymentTerms==='7 Days'?'selected':''}>7 Days</option>
                            <option value="14 Days" ${q.paymentTerms==='14 Days'?'selected':''}>14 Days</option>
                            <option value="30 Days" ${q.paymentTerms==='30 Days'?'selected':''}>30 Days</option>
                        </select></div>
                    </div>

                    <!-- Live Summary / Total Price -->
                    <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700 mt-4 space-y-1 text-sm" id="swal-q-summary-box">
                        <div class="flex justify-between text-gray-600 dark:text-gray-300">
                            <span>Subtotal:</span>
                            <span id="swal-q-subtotal-disp" class="font-medium">R 0.00</span>
                        </div>
                        <div class="flex justify-between text-gray-600 dark:text-gray-300" id="swal-q-discount-row" style="display: none;">
                            <span>Discount:</span>
                            <span id="swal-q-discount-disp" class="font-medium">- R 0.00</span>
                        </div>
                        <div class="flex justify-between text-gray-600 dark:text-gray-300" id="swal-q-vat-row" style="display: none;">
                            <span>VAT:</span>
                            <span id="swal-q-vat-disp" class="font-medium">R 0.00</span>
                        </div>
                        <div class="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-1 text-gray-900 dark:text-white">
                            <span>Final Price (Total):</span>
                            <span id="swal-q-total-disp">R 0.00</span>
                        </div>
                        <div class="flex justify-between items-center font-semibold text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2 rounded mt-2 border border-blue-200 dark:border-blue-800" id="swal-q-deposit-row" style="display: none;">
                            <span>Due Before Project Start (50%):</span>
                            <span id="swal-q-deposit-disp" class="font-bold">R 0.00</span>
                        </div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Logistics & Notes</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            width: 'min(95%, 700px)',
            didOpen: () => {
                const container = document.getElementById('swal-q-items-container');
                const addBtn = document.getElementById('add-q-item-btn');

                const updateTotals = () => {
                    const curr = (document.getElementById('swal-q-currency')?.value || 'ZAR').trim() || 'R';
                    const currPrefix = curr === 'ZAR' ? 'R' : curr;
                    let subtotal = 0;
                    document.querySelectorAll('.quote-item-row').forEach(row => {
                        const price = parseFloat(row.querySelector('.q-item-price')?.value || 0);
                        const qty = parseFloat(row.querySelector('.q-item-qty')?.value || 0);
                        if (!isNaN(price) && !isNaN(qty)) {
                            subtotal += (price * qty);
                        }
                    });

                    const discountPct = parseFloat(document.getElementById('swal-q-discount')?.value || 0) || 0;
                    const vatPct = parseFloat(document.getElementById('swal-q-vat')?.value || 0) || 0;
                    const discountAmt = subtotal * (discountPct / 100);
                    const total = Math.max(0, subtotal - discountAmt);
                    const vatAmt = vatPct > 0 ? (total - (total / (1 + (vatPct / 100)))) : 0;

                    const subtotalEl = document.getElementById('swal-q-subtotal-disp');
                    if (subtotalEl) subtotalEl.textContent = `${currPrefix} ${subtotal.toFixed(2)}`;

                    const discRow = document.getElementById('swal-q-discount-row');
                    const discEl = document.getElementById('swal-q-discount-disp');
                    if (discRow && discEl) {
                        if (discountPct > 0) {
                            discRow.style.display = 'flex';
                            discEl.textContent = `- ${currPrefix} ${discountAmt.toFixed(2)} (${discountPct}%)`;
                        } else {
                            discRow.style.display = 'none';
                        }
                    }

                    const vatRow = document.getElementById('swal-q-vat-row');
                    const vatEl = document.getElementById('swal-q-vat-disp');
                    if (vatRow && vatEl) {
                        if (vatPct > 0) {
                            vatRow.style.display = 'flex';
                            vatEl.textContent = `${currPrefix} ${vatAmt.toFixed(2)} (${vatPct}%)`;
                        } else {
                            vatRow.style.display = 'none';
                        }
                    }

                    const totalEl = document.getElementById('swal-q-total-disp');
                    if (totalEl) totalEl.textContent = `${currPrefix} ${total.toFixed(2)}`;

                    const terms = document.getElementById('swal-q-terms')?.value;
                    const depRow = document.getElementById('swal-q-deposit-row');
                    const depEl = document.getElementById('swal-q-deposit-disp');
                    if (depRow && depEl) {
                        if (terms === '50% Deposit') {
                            depRow.style.display = 'flex';
                            const depAmt = total * 0.5;
                            depEl.textContent = `${currPrefix} ${depAmt.toFixed(2)}`;
                        } else {
                            depRow.style.display = 'none';
                        }
                    }
                };

                window.removeQItemRow = function(btn) {
                    btn.closest('.quote-item-row').remove();
                    updateTotals();
                };

                function createRow(desc, price, qty) {
                    const div = document.createElement('div');
                    div.className = 'quote-item-row grid grid-cols-1 md:grid-cols-12 gap-2 items-center border-b md:border-0 pb-2 md:pb-0 mb-2 md:mb-0';
                    div.innerHTML = `
                        <div class="md:col-span-6 flex"><input type="text" class="q-item-desc swal2-input m-0 flex-1 w-full" placeholder="Description" value="${desc || ''}"></div>
                        <div class="md:col-span-3 flex"><input type="number" class="q-item-price swal2-input m-0 w-full" placeholder="Price" value="${price || ''}"></div>
                        <div class="md:col-span-2 flex"><input type="number" class="q-item-qty swal2-input m-0 w-full" placeholder="Qty" value="${qty || 1}"></div>
                        <div class="md:col-span-1 flex justify-end md:justify-center"><button type="button" onclick="window.removeQItemRow(this)" class="text-red-500 hover:text-red-700 p-2"><i class="fas fa-times"></i></button></div>
                    `;
                    container.appendChild(div);
                }

                if (isEdit && q.items && q.items.length > 0) {
                    q.items.forEach(item => createRow(item.description, item.price, item.quantity));
                } else {
                    createRow('', '', 1);
                }

                addBtn.addEventListener('click', () => {
                    createRow('', '', 1);
                    updateTotals();
                });

                container.addEventListener('input', updateTotals);
                document.getElementById('swal-q-terms')?.addEventListener('change', updateTotals);
                document.getElementById('swal-q-discount')?.addEventListener('input', updateTotals);
                document.getElementById('swal-q-vat')?.addEventListener('input', updateTotals);
                document.getElementById('swal-q-currency')?.addEventListener('input', updateTotals);

                updateTotals();
            },
            preConfirm: () => {
                const cid = document.getElementById('swal-q-client').value;
                const rowElements = document.querySelectorAll('.quote-item-row');
                const items = [];
                let subtotal = 0;

                rowElements.forEach(row => {
                    const desc = row.querySelector('.q-item-desc').value;
                    const price = parseFloat(row.querySelector('.q-item-price').value || 0);
                    const qty = parseFloat(row.querySelector('.q-item-qty').value || 1);
                    if (desc) {
                        items.push({ description: desc, price: price, quantity: qty });
                        subtotal += (price * qty);
                    }
                });

                if (!cid || items.length === 0) {
                    Swal.showValidationMessage('Client and at least one Item Description are required');
                    return false;
                }

                const discountPct = parseFloat(document.getElementById('swal-q-discount').value || 0);
                const vatPct = parseFloat(document.getElementById('swal-q-vat').value || 0);
                const discountAmt = subtotal * (discountPct / 100);
                const total = subtotal - discountAmt;
                const vatAmt = total - (total / (1 + (vatPct / 100)));

                const validDate = document.getElementById('swal-q-valid').value;
                const startDate = document.getElementById('swal-q-start').value;
                const paymentTerms = document.getElementById('swal-q-terms').value;
                const depositAmt = paymentTerms === '50% Deposit' ? (total * 0.5).toFixed(2) : null;

                return {
                    clientId: cid,
                    title: document.getElementById('swal-q-title').value,
                    items: items,
                    subtotal: subtotal.toFixed(2),
                    discountPct: discountPct,
                    discountAmt: discountAmt.toFixed(2),
                    vatPct: vatPct,
                    vatAmt: vatAmt.toFixed(2),
                    total: total.toFixed(2),
                    depositAmt: depositAmt,
                    currency: document.getElementById('swal-q-currency').value,
                    validUntil: validDate ? new Date(validDate).toISOString() : null,
                    paymentTerms: paymentTerms,
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
                    if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Updated Quotation`);
                    Swal.fire('Success', 'Quotation updated', 'success');
                } else {
                    formValues.reference = 'QT-' + Math.floor(1000 + Math.random() * 9000);
                    formValues.status = 'Draft';
                    formValues.date = new Date().toISOString();
                    await API.request('/api/quotations', { method: 'POST', body: JSON.stringify(formValues) });
                    if (typeof app !== 'undefined' && app.logActivity) app.logActivity(`Created Quotation`);
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