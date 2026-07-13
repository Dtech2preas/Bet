// js/contracts.js

const contractsManager = {
    contracts: [],

    async loadContracts() {
        const container = document.getElementById('contracts-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const [cRes, clRes] = await Promise.all([
                API.request('/api/contracts'),
                API.request('/api/clients')
            ]);
            if (cRes.success) {
                this.contracts = cRes.contracts;
                this.clients = clRes.clients;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('contracts-container');
        if (this.contracts.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No contracts found.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract Ref</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.contracts.forEach(con => {
            const client = this.clients.find(c => c.id === con.clientId);
            const statusColor = con.status === 'Signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Contract Ref:</div>
                        <div class="text-right md:text-left">${con.reference}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Client:</div>
                        <div class="text-right md:text-left">${client ? client.companyName : 'Unknown'}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Status:</div>
                        <div class="text-right md:text-left"><span class="px-2 py-1 text-xs rounded-full ${statusColor}">${con.status}</span></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="contractsManager.toggleStatus('${con.id}')" class="text-blue-600 hover:text-blue-900 mr-2" title="Mark Signed/Unsigned"><i class="fas fa-check-circle"></i></button>
                            <button onclick="contractsManager.preview('${con.id}')" class="text-gray-600 hover:text-gray-900 mr-2" title="Preview PDF"><i class="fas fa-file-pdf"></i></button>
                            <button onclick="contractsManager.deleteContract('${con.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal(contract = null) {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        const con = contract || {};
        const isEdit = !!contract;
        const title = isEdit ? 'Edit Contract' : 'Generate Contract';

        const clientOptions = this.clients.map(c => `<option value="${c.id}" ${con.clientId === c.id ? 'selected' : ''}>${c.companyName}</option>`).join('');

        let licenseOptions = '<option value="">No License Linked</option>';
        try {
            const lRes = await API.request('/api/licenses');
            if (lRes.success && lRes.licenses) {
                licenseOptions += lRes.licenses.map(l => `<option value="${l.id}" ${con.licenseId === l.id ? 'selected' : ''}>${l.licenseKey}</option>`).join('');
            }
        } catch(e) {}

        let invoiceOptions = '<option value="">No Invoice Linked</option>';
        try {
            const iRes = await API.request('/api/invoices');
            if (iRes.success && iRes.invoices) {
                invoiceOptions += iRes.invoices.map(i => `<option value="${i.id}" ${con.invoiceId === i.id ? 'selected' : ''}>${i.reference}</option>`).join('');
            }
        } catch(e) {}

        const defaultTemplate = `This Software License Agreement ("Agreement") is entered into by and between D-TECH ("Licensor") and the Client ("Licensee").

1. Grant of License:
Licensor grants Licensee a non-exclusive, non-transferable license to use the Software.

2. Intellectual Property:
All intellectual property rights belong exclusively to D-TECH.

3. Payment Terms:
The Licensee agrees to pay all fees associated with the product subscription. Failure to pay may result in immediate termination of the license.

4. Termination:
Either party may terminate this Agreement with 30 days written notice.

5. Confidentiality:
Both parties agree to maintain the confidentiality of proprietary information.`;

        const sDate = isEdit && con.startDate ? con.startDate.split('T')[0] : new Date().toISOString().split('T')[0];

        const d = new Date();
        d.setMonth(d.getMonth() + 12);
        const eDate = isEdit && con.endDate ? con.endDate.split('T')[0] : d.toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <div class="text-left text-sm space-y-3 h-96 overflow-y-auto pr-2">
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Client *</label><select id="swal-c-client" class="swal2-input mt-1 w-full m-0"><option value="" disabled ${!isEdit?'selected':''}>Select Client</option>${clientOptions}</select></div>
                        <div><label class="font-medium">Contract Type</label><select id="swal-c-type" class="swal2-input mt-1 w-full m-0">
                            <option value="SLA" ${con.contractType==='SLA'?'selected':''}>SLA (Service Level Agreement)</option>
                            <option value="NDA" ${con.contractType==='NDA'?'selected':''}>NDA (Non-Disclosure Agreement)</option>
                            <option value="Maintenance" ${con.contractType==='Maintenance'?'selected':''}>Maintenance</option>
                            <option value="License" ${con.contractType==='License'?'selected':''}>License Agreement</option>
                            <option value="General" ${con.contractType==='General'?'selected':''}>General Contract</option>
                        </select></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Start Date</label><input type="date" id="swal-c-start" class="swal2-input mt-1 w-full m-0" value="${sDate}"></div>
                        <div><label class="font-medium">End Date</label><input type="date" id="swal-c-end" class="swal2-input mt-1 w-full m-0" value="${eDate}"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Renewal Option</label><select id="swal-c-renew" class="swal2-input mt-1 w-full m-0">
                            <option value="Yes" ${con.renewalOption==='Yes'?'selected':''}>Yes</option>
                            <option value="No" ${con.renewalOption==='No'?'selected':''}>No</option>
                        </select></div>
                        <div><label class="font-medium">Signing Status</label><select id="swal-c-status" class="swal2-input mt-1 w-full m-0">
                            <option value="Draft" ${con.signingStatus==='Draft'?'selected':''}>Draft</option>
                            <option value="Sent" ${con.signingStatus==='Sent'?'selected':''}>Sent</option>
                            <option value="Signed" ${con.signingStatus==='Signed'?'selected':''}>Signed</option>
                        </select></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Client Sign Date</label><input type="date" id="swal-c-csign" class="swal2-input mt-1 w-full m-0" value="${con.clientSignDate ? con.clientSignDate.split('T')[0] : ''}"></div>
                        <div><label class="font-medium">D-TECH Sign Date</label><input type="date" id="swal-c-dsign" class="swal2-input mt-1 w-full m-0" value="${con.dtechSignDate ? con.dtechSignDate.split('T')[0] : ''}"></div>
                    </div>

                    <h4 class="font-semibold border-b pb-1 mt-4">Linked Records</h4>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-medium">Related License</label><select id="swal-c-license" class="swal2-input mt-1 w-full m-0">${licenseOptions}</select></div>
                        <div><label class="font-medium">Related Invoice</label><select id="swal-c-invoice" class="swal2-input mt-1 w-full m-0">${invoiceOptions}</select></div>
                    </div>

                    <div><label class="font-medium">Contract Terms / Content</label><textarea id="swal-c-content" class="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md" rows="8" style="font-size: 14px;">${con.content || defaultTemplate}</textarea></div>
                </div>
            `,
            width: '700px',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const cid = document.getElementById('swal-c-client').value;
                if (!cid) {
                    Swal.showValidationMessage('Client is required');
                    return false;
                }

                const cSign = document.getElementById('swal-c-csign').value;
                const dSign = document.getElementById('swal-c-dsign').value;
                const startD = document.getElementById('swal-c-start').value;
                const endD = document.getElementById('swal-c-end').value;
                const sigStatus = document.getElementById('swal-c-status').value;

                return {
                    clientId: cid,
                    contractType: document.getElementById('swal-c-type').value,
                    startDate: startD ? new Date(startD).toISOString() : new Date().toISOString(),
                    endDate: endD ? new Date(endD).toISOString() : new Date().toISOString(),
                    renewalOption: document.getElementById('swal-c-renew').value,
                    signingStatus: sigStatus,
                    status: sigStatus === 'Signed' ? 'Signed' : 'Unsigned', // fallback mapping for renderTable compatibility
                    clientSignDate: cSign ? new Date(cSign).toISOString() : null,
                    dtechSignDate: dSign ? new Date(dSign).toISOString() : null,
                    licenseId: document.getElementById('swal-c-license').value,
                    invoiceId: document.getElementById('swal-c-invoice').value,
                    content: document.getElementById('swal-c-content').value,
                }
            }
        });

        if (formValues) {
            try {
                if (isEdit) {
                    await API.request(`/api/contracts/${con.id}`, { method: 'PUT', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Contract updated', 'success');
                } else {
                    formValues.reference = 'AGR-' + Math.floor(1000 + Math.random() * 9000);
                    formValues.date = new Date().toISOString();
                    await API.request('/api/contracts', { method: 'POST', body: JSON.stringify(formValues) });
                    Swal.fire('Success', 'Contract generated', 'success');
                }
                this.loadContracts();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    editContract(id) {
        const con = this.contracts.find(x => x.id === id);
        if (con) this.openModal(con);
    },

    async toggleStatus(id) {
        const con = this.contracts.find(x => x.id === id);
        const newStatus = con.status === 'Signed' ? 'Unsigned' : 'Signed';

        try {
            await API.request(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
            this.loadContracts();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    },

    async preview(id) {
        const con = this.contracts.find(x => x.id === id);
        con.client = this.clients.find(c => c.id === con.clientId);
        pdfEngine.preview('License Agreement', con);
    },

    async deleteContract(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/contracts/${id}`, { method: 'DELETE' });
            this.loadContracts();
        }
    }
};