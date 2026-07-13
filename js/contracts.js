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

    async openModal() {
        if (!this.clients || this.clients.length === 0) return Swal.fire('Error', 'Add a client first', 'error');

        const clientOptions = this.clients.map(c => `<option value="${c.id}">${c.companyName}</option>`).join('');

        const template = `This Software License Agreement ("Agreement") is entered into by and between D-TECH ("Licensor") and the Client ("Licensee").

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

        const { value: formValues } = await Swal.fire({
            title: 'Generate Contract',
            html: `
                <select id="swal-c-client" class="swal2-input mb-4"><option value="" disabled selected>Select Client</option>${clientOptions}</select>
                <textarea id="swal-c-content" class="w-full p-2 border rounded-md" rows="10" style="font-size: 14px;">${template}</textarea>
            `,
            width: '600px',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    clientId: document.getElementById('swal-c-client').value,
                    content: document.getElementById('swal-c-content').value,
                }
            }
        });

        if (formValues && formValues.clientId) {
            formValues.reference = 'AGR-' + Math.floor(1000 + Math.random() * 9000);
            formValues.status = 'Unsigned';
            formValues.date = new Date().toISOString();

            try {
                await API.request('/api/contracts', { method: 'POST', body: JSON.stringify(formValues) });
                Swal.fire('Success', 'Contract generated', 'success');
                this.loadContracts();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
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