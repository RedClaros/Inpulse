document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form-element');
    const errorDiv = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorDiv.textContent = '';

            // --- FIX: Get value from the input with id="email" ---
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                errorDiv.textContent = 'Please enter both email and password.';
                return;
            }

            try {
                const apiResponse = await fetch('https://inpulse-3zws.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

                const responseData = await apiResponse.json();

                if (apiResponse.ok) {
                    // SUCCESS! Store the token and redirect.
                    localStorage.setItem('authToken', responseData.token);
                    // Ensure your main application page is named index.html or change this line.
                    window.location.href = 'inpulse.html'; 
                } else {
                    // ERROR! Display error message from the server.
                    errorDiv.textContent = responseData.error || 'An unexpected error occurred.';
                }
            } catch (error) {
                console.error('Connection error:', error);
                errorDiv.textContent = 'Could not connect to the server.';
            }
        });
    }
    
    // Also initialize Lucide icons on this page
    lucide.createIcons();
});