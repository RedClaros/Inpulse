document.addEventListener('DOMContentLoaded', () => {
    // A variable to temporarily store the user's email between steps
    let registrationEmail = '';

    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const messageDiv = document.getElementById('form-message') || createMessageDiv(accountForm);
            messageDiv.textContent = '';

            const firstName = accountForm.querySelector('input[placeholder="First Name"]').value;
            const lastName = accountForm.querySelector('input[placeholder="Last Name"]').value;
            const companyName = accountForm.querySelector('input[placeholder="Company Name"]').value;
            const email = accountForm.querySelector('input[type="email"]').value;
            const phoneNumber = accountForm.querySelector('input[type="tel"]').value;
            const password = accountForm.querySelector('input[type="password"]').value;

            if (!firstName || !lastName || !email || !password) {
                messageDiv.textContent = 'Please fill out all required fields.';
                messageDiv.style.color = 'red';
                return;
            }
            
            // Store the email for the next step
            registrationEmail = email;

            const userData = { firstName, lastName, companyName, email, phoneNumber, password };

            try {
                const apiResponse = await fetch('http://localhost:5001/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData),
                });
                const responseData = await apiResponse.json();

                if (apiResponse.ok) {
                    messageDiv.textContent = '';
                    document.getElementById('form-step-1').classList.remove('active');
                    document.getElementById('form-step-2').classList.add('active');
                } else {
                    messageDiv.textContent = responseData.error || 'An error occurred during registration.';
                    messageDiv.style.color = 'red';
                }
            } catch (error) {
                messageDiv.textContent = 'Could not connect to the server.';
                messageDiv.style.color = 'red';
            }
        });
    }

    // --- Logic for Step 2: PIN Verification ---
    const verificationForm = document.querySelector('#form-step-2');
    const verifyButton = verificationForm.querySelector('.btn-primary');
    const pinInputs = verificationForm.querySelectorAll('.pin-inputs input');

    if (verifyButton) {
        verifyButton.addEventListener('click', async () => {
            const verifyMessageDiv = document.getElementById('verify-message') || createVerifyMessageDiv(verificationForm);
            verifyMessageDiv.textContent = '';
            
            let pin = '';
            pinInputs.forEach(input => {
                pin += input.value;
            });

            if (pin.length !== 6) {
                verifyMessageDiv.textContent = 'Please enter all 6 digits of the PIN.';
                verifyMessageDiv.style.color = 'red';
                return;
            }

            try {
                const apiResponse = await fetch('http://localhost:5001/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: registrationEmail, pin: pin }),
                });
                const responseData = await apiResponse.json();

                if (apiResponse.ok) {
                    verifyMessageDiv.textContent = 'Verification successful! Redirecting to login...';
                    verifyMessageDiv.style.color = 'green';
                    setTimeout(() => {
                        window.location.href = 'login.html'; // Redirect to login page
                    }, 2000);
                } else {
                    verifyMessageDiv.textContent = responseData.error || 'An error occurred during verification.';
                    verifyMessageDiv.style.color = 'red';
                }
            } catch (error) {
                verifyMessageDiv.textContent = 'Could not connect to the server.';
                verifyMessageDiv.style.color = 'red';
            }
        });
    }

    // Helper functions to create message areas
    function createMessageDiv(formElement) {
        const div = document.createElement('div');
        div.id = 'form-message';
        div.style.marginTop = '15px';
        div.style.fontWeight = 'bold';
        div.style.textAlign = 'center';
        formElement.prepend(div);
        return div;
    }
    function createVerifyMessageDiv(formElement) {
        const div = document.createElement('div');
        div.id = 'verify-message';
        div.style.marginTop = '15px';
        div.style.fontWeight = 'bold';
        div.style.textAlign = 'center';
        formElement.querySelector('.pin-inputs').after(div);
        return div;
    }
});
