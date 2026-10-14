const planManager = {
    async payForPlan() {
        try {
            const btn = document.getElementById('payPlanBtn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Redirecting to Yoco...';
            btn.disabled = true;

            const response = await api.post('/api/yoco/checkout', {
                amount: 8000, // 80.00 ZAR in cents
                currency: 'ZAR',
                successUrl: window.location.origin + window.location.pathname + '?payment=success',
                cancelUrl: window.location.origin + window.location.pathname + '?payment=cancel'
            });

            if (response && response.redirectUrl) {
                // Redirect user to Yoco secure checkout
                window.location.href = response.redirectUrl;
            } else {
                throw new Error("Invalid response from payment gateway.");
            }
        } catch (error) {
            console.error('Yoco Checkout Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Payment Error',
                text: error.message || 'Failed to initialize payment. Please try again.',
                confirmButtonColor: '#2563eb'
            });
            const btn = document.getElementById('payPlanBtn');
            btn.innerHTML = '<i class="fas fa-lock mr-2"></i> Pay with Yoco';
            btn.disabled = false;
        }
    },

    checkPaymentStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');

        if (paymentStatus === 'success') {
            // Wait for app to initialize before showing alert
            setTimeout(() => {
                app.showSection('plan');
                Swal.fire({
                    icon: 'success',
                    title: 'Payment Successful!',
                    text: 'Your R80 monthly plan has been renewed successfully.',
                    confirmButtonColor: '#2563eb'
                });

                // Clean up URL
                const newUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }, 500);
        } else if (paymentStatus === 'cancel') {
            setTimeout(() => {
                app.showSection('plan');
                Swal.fire({
                    icon: 'info',
                    title: 'Payment Cancelled',
                    text: 'You have cancelled the payment process.',
                    confirmButtonColor: '#2563eb'
                });

                // Clean up URL
                const newUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }, 500);
        }
    }
};

// Check for return from Yoco on page load
document.addEventListener('DOMContentLoaded', () => {
    planManager.checkPaymentStatus();
});
