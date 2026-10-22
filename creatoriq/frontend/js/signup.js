/* =========================================
   CreatorIQ — Registration Form Logic
   File: frontend/js/signup.js
   Mode: Frontend prototype only
   ========================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("signup-form");

    // Allow this script to load safely on other pages.
    if (!form) return;

    const nameInput = document.getElementById("full-name");
    const emailInput = document.getElementById("signup-email");
    const passwordInput = document.getElementById("signup-password");
    const confirmInput = document.getElementById("confirm-password");
    const termsInput = document.getElementById("accept-terms");

    const nameError = document.getElementById("name-error");
    const emailError = document.getElementById("signup-email-error");
    const passwordError = document.getElementById("password-error");
    const confirmError = document.getElementById("confirm-password-error");
    const roleError = document.getElementById("role-error");
    const termsError = document.getElementById("terms-error");

    const roleGrid = document.getElementById("role-grid");
    const roleCards = [...roleGrid.querySelectorAll("[data-role]")];

    const strengthBars = [
        ...document.querySelectorAll("#password-strength span")
    ];
    const strengthText = document.getElementById("password-strength-text");

    const status = document.getElementById("signup-status");
    const submitButton = document.getElementById("signup-button");
    const googleButton = document.getElementById("signup-google");

    const originalButtonText =
        submitButton.querySelector(".button-text").textContent;

    let selectedRole = "";
    let isSubmitting = false;

    // -------------------------------------
    // Accessible errors and status
    // -------------------------------------

    function showError(input, errorElement, message) {
        errorElement.textContent = message;

        if (input) {
            input.setAttribute("aria-invalid", "true");
        }
    }

    function clearError(input, errorElement) {
        errorElement.textContent = "";

        if (input) {
            input.removeAttribute("aria-invalid");
        }
    }

    function showStatus(message, type = "info") {
        status.textContent = message;
        status.className = `form-status ${type}`;
    }

    function clearStatus() {
        status.textContent = "";
        status.className = "form-status";
    }

    // -------------------------------------
    // Full name validation
    // -------------------------------------

    function validateName() {
        const name = nameInput.value.trim();

        if (!name) {
            showError(
                nameInput,
                nameError,
                "Please enter your full name."
            );
            return false;
        }

        if (name.length < 2) {
            showError(
                nameInput,
                nameError,
                "Your name must contain at least 2 characters."
            );
            return false;
        }

        clearError(nameInput, nameError);
        return true;
    }

    // -------------------------------------
    // Email validation
    // -------------------------------------

    function validateEmail() {
        const email = emailInput.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            showError(
                emailInput,
                emailError,
                "Please enter your email address."
            );
            return false;
        }

        if (!emailPattern.test(email)) {
            showError(
                emailInput,
                emailError,
                "Please enter a valid email address."
            );
            return false;
        }

        clearError(emailInput, emailError);
        return true;
    }

    // -------------------------------------
    // Password requirements and strength
    // -------------------------------------

    function getPasswordChecks(password) {
        return [
            password.length >= 8,
            /[A-Z]/.test(password),
            /[a-z]/.test(password),
            /[0-9]/.test(password),
            /[^A-Za-z0-9]/.test(password)
        ];
    }

    function updatePasswordStrength() {
        const password = passwordInput.value;
        const checks = getPasswordChecks(password);
        const score = checks.filter(Boolean).length;

        // Four visual bars; no password is stored.
        const barCount = Math.min(
            4,
            Math.max(0, score - 1)
        );

        strengthBars.forEach((bar, index) => {
            bar.classList.toggle("active", index < barCount);
        });

        let label = "Not entered";

        if (password.length > 0) {
            if (score <= 2) {
                label = "Weak";
            } else if (score <= 4) {
                label = "Moderate";
            } else {
                label = "Strong";
            }
        }

        strengthText.textContent = `Password strength: ${label}`;
    }

    function validatePassword() {
        const password = passwordInput.value;
        const checks = getPasswordChecks(password);

        if (!password) {
            showError(
                passwordInput,
                passwordError,
                "Please create a password."
            );
            return false;
        }

        if (checks.some(check => !check)) {
            showError(
                passwordInput,
                passwordError,
                "Use at least 8 characters with uppercase, lowercase, " +
                "a number, and a special character."
            );
            return false;
        }

        clearError(passwordInput, passwordError);
        return true;
    }

    // -------------------------------------
    // Password confirmation
    // -------------------------------------

    function validateConfirmation() {
        if (!confirmInput.value) {
            showError(
                confirmInput,
                confirmError,
                "Please confirm your password."
            );
            return false;
        }

        if (confirmInput.value !== passwordInput.value) {
            showError(
                confirmInput,
                confirmError,
                "Passwords do not match."
            );
            return false;
        }

        clearError(confirmInput, confirmError);
        return true;
    }

    // -------------------------------------
    // Show / hide password controls
    // -------------------------------------

    document.querySelectorAll("[data-toggle-password]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const inputId =
                    button.getAttribute("data-toggle-password");
                const input = document.getElementById(inputId);

                if (!input) return;

                const shouldShow = input.type === "password";

                input.type = shouldShow ? "text" : "password";
                button.textContent = shouldShow ? "Hide" : "Show";
                button.setAttribute(
                    "aria-pressed",
                    String(shouldShow)
                );

                const label = inputId === "confirm-password"
                    ? "confirmation password"
                    : "password";

                button.setAttribute(
                    "aria-label",
                    `${shouldShow ? "Hide" : "Show"} ${label}`
                );
            });
        });

    // -------------------------------------
    // Accessible role-card selection
    // -------------------------------------

    function selectRole(role) {
        selectedRole = role;

        roleCards.forEach(card => {
            const isSelected =
                card.getAttribute("data-role") === role;

            card.classList.toggle("selected", isSelected);
            card.setAttribute(
                "aria-pressed",
                String(isSelected)
            );
        });

        clearError(null, roleError);
        clearStatus();
    }

    roleCards.forEach(card => {
        card.addEventListener("click", () => {
            selectRole(card.getAttribute("data-role"));
        });
    });

    function validateRole() {
        const allowedRoles = ["creator", "agency", "marketing"];

        if (!allowedRoles.includes(selectedRole)) {
            showError(
                null,
                roleError,
                "Please select a workspace role."
            );
            return false;
        }

        clearError(null, roleError);
        return true;
    }

    // -------------------------------------
    // Terms acceptance
    // -------------------------------------

    function validateTerms() {
        if (!termsInput.checked) {
            showError(
                termsInput,
                termsError,
                "You must accept the Terms of Service and Privacy Policy."
            );
            return false;
        }

        clearError(termsInput, termsError);
        return true;
    }

    // -------------------------------------
    // Validate while the user edits fields
    // -------------------------------------

    nameInput.addEventListener("input", () => {
        if (nameInput.hasAttribute("aria-invalid")) {
            validateName();
        }
        clearStatus();
    });

    emailInput.addEventListener("input", () => {
        if (emailInput.hasAttribute("aria-invalid")) {
            validateEmail();
        }
        clearStatus();
    });

    passwordInput.addEventListener("input", () => {
        updatePasswordStrength();

        if (passwordInput.hasAttribute("aria-invalid")) {
            validatePassword();
        }

        if (
            confirmInput.value &&
            confirmInput.hasAttribute("aria-invalid")
        ) {
            validateConfirmation();
        }

        clearStatus();
    });

    confirmInput.addEventListener("input", () => {
        if (confirmInput.hasAttribute("aria-invalid")) {
            validateConfirmation();
        }
        clearStatus();
    });

    termsInput.addEventListener("change", () => {
        if (termsInput.hasAttribute("aria-invalid")) {
            validateTerms();
        }
        clearStatus();
    });

    // -------------------------------------
    // Form submission
    // -------------------------------------

    form.addEventListener("submit", async event => {
        event.preventDefault();

        if (isSubmitting) return;

        clearStatus();

        const results = [
            { valid: validateName(), input: nameInput },
            { valid: validateEmail(), input: emailInput },
            { valid: validatePassword(), input: passwordInput },
            { valid: validateConfirmation(), input: confirmInput },
            { valid: validateRole(), input: roleCards[0] },
            { valid: validateTerms(), input: termsInput }
        ];

        const firstInvalid = results.find(result => !result.valid);

        if (firstInvalid) {
            showStatus(
                "Please correct the highlighted fields.",
                "error"
            );

            firstInvalid.input.focus();
            return;
        }

        isSubmitting = true;
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        googleButton.disabled = true;

        submitButton.querySelector(".button-text").textContent =
            "Creating...";

        showStatus(
            "Creating your account...",
            "info"
        );

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value,
                    role: selectedRole
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to create account.');
            }

            localStorage.removeItem('creatoriq_token');
            localStorage.removeItem('creatoriq_user');

            showStatus(
                'Account created successfully. Redirecting to sign in...',
                'success'
            );

            window.setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } catch (error) {
            showStatus(
                error.message || 'Something went wrong. Please try again.',
                'error'
            );
        } finally {
            isSubmitting = false;

            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            googleButton.disabled = false;

            submitButton.querySelector(".button-text").textContent =
                originalButtonText;
        }
    });

    // -------------------------------------
    // Google registration prototype
    // -------------------------------------

    googleButton.addEventListener("click", () => {
        showStatus(
            "Google registration is not configured yet. " +
            "A real OAuth flow will be added in Phase 2.",
            "info"
        );
    });

    // -------------------------------------
    // Policy links are placeholders for now
    // -------------------------------------

    document.getElementById("terms-link")
        .addEventListener("click", event => {
            event.preventDefault();
            showStatus(
                "The Terms of Service page has not been created yet.",
                "info"
            );
        });

    document.getElementById("privacy-link")
        .addEventListener("click", event => {
            event.preventDefault();
            showStatus(
                "The Privacy Policy page has not been created yet.",
                "info"
            );
        });

    // Initial strength indicator
    updatePasswordStrength();
});
