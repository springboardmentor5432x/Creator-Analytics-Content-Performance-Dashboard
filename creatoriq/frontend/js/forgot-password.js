"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reset-form");
    if (!form) return;

    const email = document.getElementById("reset-email");
    const error = document.getElementById("reset-email-error");
    const status = document.getElementById("reset-status");
    const button = document.getElementById("reset-button");
    const buttonText = button.querySelector(".button-text");

    let submitting = false;

    function validateEmail() {
        const value = email.value.trim();
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        if (!value) {
            error.textContent = "Please enter your email address.";
        } else if (!valid) {
            error.textContent = "Please enter a valid email address.";
        } else {
            error.textContent = "";
        }

        email.setAttribute("aria-invalid", String(!valid));
        return valid;
    }

    email.addEventListener("input", () => {
        if (email.hasAttribute("aria-invalid")) validateEmail();
        status.textContent = "";
        status.className = "form-status";
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (submitting) return;

        status.textContent = "";
        status.className = "form-status";

        if (!validateEmail()) {
            email.focus();
            return;
        }

        submitting = true;
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        buttonText.textContent = "Processing...";

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.value.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to process request.');
            }

            status.textContent = data.message;
            status.className = 'form-status success';
        } catch (error) {
            status.textContent = error.message || 'Something went wrong. Please try again.';
            status.className = 'form-status error';
        } finally {
            submitting = false;
            button.disabled = false;
            button.removeAttribute("aria-busy");
            buttonText.textContent = "Send Reset Link";
        }
    });
});
