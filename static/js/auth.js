// static/js/auth.js

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login/register page
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    
    if (!loginTab || !registerTab) {
        return; // Not on the login page
    }
    
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Firebase Auth
    const auth = firebase.auth();
    
    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Show loading
        showLoading('Logging in...');
        
        // Sign in with Firebase
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                
                // Get the ID token
                return user.getIdToken().then(idToken => {
                    // Create session
                    return fetch('/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: email,
                            idToken: idToken
                        })
                    });
                });
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Failed to create session');
                }
            })
            .then(data => {
                if (data.success) {
                    // Redirect to pantry page
                    window.location.href = '/pantry';
                } else {
                    throw new Error('Failed to create session');
                }
            })
            .catch((error) => {
                hideLoading();
                const errorCode = error.code;
                const errorMessage = error.message;
                
                let message = 'Login failed. Please try again.';
                
                if (errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
                    message = 'Invalid email or password. Please try again.';
                } else if (errorCode === 'auth/too-many-requests') {
                    message = 'Too many failed login attempts. Please try again later or reset your password.';
                }
                
                showError(message);
            });
    });
    
    // Register form submission
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }
        
        // Show loading
        showLoading('Creating account...');
        
        // Create user with Firebase
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                
                // Create session
                return fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        idToken: user.getIdToken()
                    })
                });
            })
            .then(response => {
                if (response.ok) {
                    // Redirect to pantry page
                    window.location.href = '/pantry';
                } else {
                    throw new Error('Failed to create session');
                }
            })
            .catch((error) => {
                hideLoading();
                const errorCode = error.code;
                const errorMessage = error.message;
                
                let message = 'Registration failed. Please try again.';
                
                if (errorCode === 'auth/email-already-in-use') {
                    message = 'Email already in use. Please login instead.';
                } else if (errorCode === 'auth/weak-password') {
                    message = 'Password is too weak. Please use a stronger password.';
                } else if (errorCode === 'auth/invalid-email') {
                    message = 'Invalid email address. Please provide a valid email.';
                }
                
                showError(message);
            });
    });
    
    // Helper functions
    function showLoading(message) {
        // Clear any existing alerts
        hideError();
        
        // Create loading alert
        const loadingAlert = document.createElement('div');
        loadingAlert.className = 'alert loading-alert';
        loadingAlert.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i> ${message}
        `;
        
        // Insert before the form
        loginForm.parentNode.insertBefore(loadingAlert, loginForm);
    }
    
    function hideLoading() {
        const loadingAlert = document.querySelector('.loading-alert');
        if (loadingAlert) {
            loadingAlert.remove();
        }
    }
    
    function showError(message) {
        // Clear any existing alerts
        hideError();
        hideLoading();
        
        // Create error alert
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert error-alert';
        errorAlert.textContent = message;
        
        // Insert before the form
        loginForm.parentNode.insertBefore(errorAlert, loginForm);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
    }
    
    function hideError() {
        const errorAlert = document.querySelector('.error-alert');
        if (errorAlert) {
            errorAlert.remove();
        }
    }
    
    // Add script to login.html
    if (document.querySelector('script[src*="auth.js"]') === null) {
        const script = document.createElement('script');
        script.src = '/static/js/auth.js';
        document.body.appendChild(script);
    }
});