/* =========================================
   CreatorIQ — Login Form Logic
   File: frontend/js/auth.js
   Mode: Frontend prototype only
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");

    // This script can safely load on pages without a login form.
    if (!loginForm) return;

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("toggle-password");
    const loginButton = document.getElementById("login-button");
    const loginStatus = document.getElementById("login-status");
    const googleButton = document.getElementById("google-signin");

    const emailError = document.getElementById("email-error");
    const passwordError = document.getElementById("password-error");

    const originalButtonText =
        loginButton.querySelector(".button-text")?.textContent || "Sign In";

    let isSubmitting = false;

    // -------------------------------------
    // Accessible field error handling
    // -------------------------------------

    function showFieldError(input, errorElement, message) {
        errorElement.textContent = message;
        input.setAttribute("aria-invalid", "true");
    }

    function clearFieldError(input, errorElement) {
        errorElement.textContent = "";
        input.removeAttribute("aria-invalid");
    }

    function clearStatus() {
        loginStatus.textContent = "";
        loginStatus.className = "form-status";
    }

    function showStatus(message, type = "info") {
        loginStatus.textContent = message;
        loginStatus.className = `form-status ${type}`;
    }

    // -------------------------------------
    // Email validation
    // -------------------------------------

    function validateEmail() {
        const email = emailInput.value.trim();

        if (!email) {
            showFieldError(
                emailInput,
                emailError,
                "Please enter your email address."
            );
            return false;
        }

        // A practical client-side format check.
        // The backend must perform authoritative validation later.
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showFieldError(
                emailInput,
                emailError,
                "Please enter a valid email address."
            );
            return false;
        }

        clearFieldError(emailInput, emailError);
        return true;
    }

    // -------------------------------------
    // Password validation
    // -------------------------------------

    function validatePassword() {
        if (!passwordInput.value) {
            showFieldError(
                passwordInput,
                passwordError,
                "Please enter your password."
            );
            return false;
        }

        clearFieldError(passwordInput, passwordError);
        return true;
    }

    // -------------------------------------
    // Show / hide password
    // -------------------------------------

    togglePassword.addEventListener("click", () => {
        const shouldShow = passwordInput.type === "password";

        passwordInput.type = shouldShow ? "text" : "password";
        togglePassword.textContent = shouldShow ? "Hide" : "Show";

        togglePassword.setAttribute(
            "aria-label",
            shouldShow ? "Hide password" : "Show password"
        );

        togglePassword.setAttribute(
            "aria-pressed",
            String(shouldShow)
        );
    });

    // -------------------------------------
    // Clear errors while editing
    // -------------------------------------

    emailInput.addEventListener("input", () => {
        if (emailInput.hasAttribute("aria-invalid")) {
            validateEmail();
        }

        clearStatus();
    });

    passwordInput.addEventListener("input", () => {
        if (passwordInput.hasAttribute("aria-invalid")) {
            validatePassword();
        }

        clearStatus();
    });

    // -------------------------------------
    // Form submission
    // -------------------------------------

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        clearStatus();

        const emailIsValid = validateEmail();
        const passwordIsValid = validatePassword();

        if (!emailIsValid || !passwordIsValid) {
            showStatus(
                "Please correct the highlighted fields.",
                "error"
            );

            if (!emailIsValid) {
                emailInput.focus();
            } else {
                passwordInput.focus();
            }

            return;
        }

        isSubmitting = true;
        loginButton.disabled = true;
        loginButton.setAttribute("aria-busy", "true");

        if (googleButton) {
            googleButton.disabled = true;
        }

        const buttonText =
            loginButton.querySelector(".button-text");

        if (buttonText) {
            buttonText.textContent = "Checking...";
        }

        showStatus(
            "Validating your account details...",
            "info"
        );

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to sign in.');
            }

            localStorage.setItem('creatoriq_token', data.token);
            localStorage.setItem('creatoriq_user', JSON.stringify(data.user));

            showStatus(
                'Login successful. Redirecting to your dashboard...',
                'success'
            );

            window.setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } catch (error) {
            showStatus(
                error.message || 'Something went wrong. Please try again.',
                'error'
            );
        } finally {
            isSubmitting = false;

            loginButton.disabled = false;
            loginButton.removeAttribute("aria-busy");

            if (googleButton) {
                googleButton.disabled = false;
            }

            if (buttonText) {
                buttonText.textContent = originalButtonText;
            }
        }
    });

    // -------------------------------------
    // Google sign-in prototype
    // -------------------------------------

    if (googleButton) {
        googleButton.addEventListener("click", () => {
            clearStatus();

            showStatus(
                "Google sign-in is not configured yet. " +
                "A real OAuth flow will be added in Phase 2.",
                "info"
            );
        });
    }
});
