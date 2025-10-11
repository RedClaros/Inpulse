// forgot-password.js

document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-form-element');
    const messageDiv = document.getElementById('reset-message');
    const emailInput = document.getElementById('email');

    if (resetForm) {
        resetForm.addEventListener('submit', (event) => {
            event.preventDefault();
            messageDiv.textContent = ''; // Clear previous messages
            messageDiv.classList.remove('reset-success-message'); // Clear success styling

            const email = emailInput.value;

            if (!email) {
                messageDiv.textContent = 'Please enter your email address.';
                return;
            }

            // --- Start of Mock Logic (Replaces Backend API Call) ---

            // Simulate a network delay
            setTimeout(() => {
                // Display a generic success message
                // This is a security best practice to avoid confirming if an email is registered.
                messageDiv.textContent = 'If an account with that email exists, a reset link has been sent.';
                messageDiv.classList.add('reset-success-message'); // Add success styling
            }, 500);

            // --- End of Mock Logic ---
        });
    }
});