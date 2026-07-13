// js/products.js

const productsManager = {
    products: [],

    async loadProducts() {
        const container = document.getElementById('products-container');
        container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-dtech-500"></i></div>';
        try {
            const response = await API.request('/api/products');
            if (response.success) {
                this.products = response.products;
                this.renderTable();
            }
        } catch (error) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Failed to load: ${error.message}</div>`;
        }
    },

    renderTable() {
        const container = document.getElementById('products-container');
        if (this.products.length === 0) {
            container.innerHTML = `<div class="text-center text-gray-500 py-10">No products found.</div>`;
            return;
        }

        let html = `
            <div class="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 block md:table">
                    <thead class="bg-gray-50 dark:bg-gray-800 hidden md:table-header-group">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricing</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700 block md:table-row-group">
        `;
        this.products.forEach(p => {
            html += `
                <tr class="block md:table-row mb-4 md:mb-0 border-b md:border-0 p-4 md:p-0">
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center font-medium text-gray-900 dark:text-white">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Product:</div>
                        <div class="text-right md:text-left">${p.name} <div class="text-xs text-gray-500 font-normal">${p.description}</div></div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-sm text-gray-500">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Pricing:</div>
                        <div class="text-right md:text-left">Setup: R${p.setupFee} | Monthly: R${p.monthlyFee}</div>
                    </td>
                    <td class="px-0 md:px-6 py-2 md:py-4 flex md:table-cell justify-between items-center text-right text-sm">
                        <div class="md:hidden font-bold text-xs uppercase text-gray-500 mr-2">Actions:</div>
                        <div>
                            <button onclick="productsManager.deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html + `</tbody></table></div>`;
    },

    async openModal() {
        const { value: formValues } = await Swal.fire({
            title: 'Add Product',
            html: `
                <input id="swal-p-name" class="swal2-input" placeholder="Product Name">
                <input id="swal-p-desc" class="swal2-input" placeholder="Description">
                <input id="swal-p-setup" type="number" class="swal2-input" placeholder="Setup Fee (ZAR)">
                <input id="swal-p-monthly" type="number" class="swal2-input" placeholder="Monthly Fee (ZAR)">
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    name: document.getElementById('swal-p-name').value,
                    description: document.getElementById('swal-p-desc').value,
                    setupFee: document.getElementById('swal-p-setup').value,
                    monthlyFee: document.getElementById('swal-p-monthly').value
                }
            }
        });

        if (formValues && formValues.name) {
            try {
                await API.request('/api/products', { method: 'POST', body: JSON.stringify(formValues) });
                Swal.fire('Success', 'Product added', 'success');
                this.loadProducts();
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async deleteProduct(id) {
        if (confirm("Are you sure?")) {
            await API.request(`/api/products/${id}`, { method: 'DELETE' });
            this.loadProducts();
        }
    }
};