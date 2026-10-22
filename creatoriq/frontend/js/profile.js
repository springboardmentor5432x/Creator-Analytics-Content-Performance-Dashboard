"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("profile-form");
    if (!form) return;

    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    const roleInput = document.getElementById("profile-role");
    const roleNote = document.getElementById("profile-role-note");
    const heading = document.getElementById("profile-heading");
    const avatar = document.getElementById("profile-avatar");
    const status = document.getElementById("profile-status");
    const notificationButton = document.getElementById("profile-notifications");

    const editButton = document.getElementById("edit-profile");
    const passwordButton = document.getElementById("change-password");
    const signOutButton = document.getElementById("sign-out");

    const passwordForm = document.getElementById("password-form");
    const newPassword = document.getElementById("new-password");
    const confirmPassword = document.getElementById("new-password-confirm");

    let editing = false;
    let currentRole = "creator";

    function showStatus(message, type = "info") {
        status.textContent = message;
        status.className = `form-status ${type}`;
    }

    notificationButton.addEventListener("click", () => {
        showStatus("You’re all caught up.", "info");
    });

    function getInitials(name) {
        return name.trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0].toUpperCase())
            .join("");
    }

    function refreshPreview() {
        const name = nameInput.value.trim() || "Sample User";
        heading.textContent = name;
        avatar.textContent = getInitials(name) || "SU";
    }

    async function saveProfile({ name, email, role = currentRole, password = null }) {
        const token = localStorage.getItem('creatoriq_token');

        if (!token) {
            throw new Error('You must be signed in to update your profile.');
        }

        const response = await fetch('/api/profile/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                email,
                role,
                ...(password ? { password } : {})
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Profile update failed.');
        }

        localStorage.setItem("creatoriq_user", JSON.stringify(data.user));
        return data.user;
    }

    async function loadProfile() {
        const token = localStorage.getItem('creatoriq_token');

        if (!token) {
            nameInput.value = 'Sample User';
            emailInput.value = 'sample@example.com';
            refreshPreview();
            showStatus('Please sign in to view your saved profile.', 'info');
            return;
        }

        try {
            const response = await fetch('/api/profile/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Profile could not be loaded.');
            }

            nameInput.value = data.user.name;
            emailInput.value = data.user.email;
            currentRole = data.user.role || "creator";
            if (currentRole === "administrator" && !roleInput.querySelector("option[value='administrator']")) {
                roleInput.add(new Option("Administrator", "administrator"));
            }
            roleInput.value = currentRole;
            roleNote.hidden = currentRole !== "administrator";
            roleInput.disabled = true;
            refreshPreview();
            showStatus('Profile loaded successfully.', 'success');
        } catch (error) {
            showStatus(error.message || 'Unable to load profile.', 'error');
        }
    }

    editButton.addEventListener("click", async () => {
        status.textContent = "";
        status.className = "form-status";

        if (!editing) {
            nameInput.disabled = false;
            emailInput.disabled = false;
            roleInput.disabled = currentRole === "administrator";
            editing = true;
            editButton.textContent = "Save profile";
            showStatus("Edit mode enabled.");
            nameInput.focus();
            return;
        }

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (name.length < 2) {
            showStatus("Enter a name with at least 2 characters.", "error");
            nameInput.focus();
            return;
        }

        if (!validEmail) {
            showStatus("Enter a valid email address.", "error");
            emailInput.focus();
            return;
        }

        try {
            const user = await saveProfile({ name, email, role: roleInput.value });
            nameInput.disabled = true;
            emailInput.disabled = true;
            roleInput.disabled = true;
            editing = false;
            editButton.textContent = "Edit profile";
            nameInput.value = user.name;
            emailInput.value = user.email;
            currentRole = user.role;
            roleInput.value = user.role;
            refreshPreview();
            showStatus('Profile and role saved successfully.', 'success');
        } catch (error) {
            showStatus(error.message || 'Unable to save your profile.', 'error');
        }
    });

    passwordButton.addEventListener("click", () => {
        passwordForm.hidden = false;
        newPassword.focus();
        showStatus("Update your password below.", "info");
    });

    document.getElementById("cancel-password").addEventListener("click", () => {
        passwordForm.reset();
        passwordForm.hidden = true;

        document.getElementById("new-password-error").textContent = "";
        document.getElementById("new-password-confirm-error").textContent = "";
        newPassword.removeAttribute("aria-invalid");
        confirmPassword.removeAttribute("aria-invalid");
    });

    passwordForm.addEventListener("submit", async event => {
        event.preventDefault();

        const password = newPassword.value;
        const confirmation = confirmPassword.value;
        const passwordError = document.getElementById("new-password-error");
        const confirmationError =
            document.getElementById("new-password-confirm-error");

        passwordError.textContent = "";
        confirmationError.textContent = "";
        newPassword.removeAttribute("aria-invalid");
        confirmPassword.removeAttribute("aria-invalid");

        const strongEnough =
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        if (!strongEnough) {
            passwordError.textContent =
                "Use at least 8 characters with uppercase, lowercase, a number, and a special character.";
            newPassword.setAttribute("aria-invalid", "true");
            newPassword.focus();
            return;
        }

        if (password !== confirmation) {
            confirmationError.textContent = "Passwords do not match.";
            confirmPassword.setAttribute("aria-invalid", "true");
            confirmPassword.focus();
            return;
        }

        try {
            await saveProfile({
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                password
            });

            showStatus('Password updated successfully.', 'success');
            passwordForm.reset();
            passwordForm.hidden = true;
        } catch (error) {
            showStatus(error.message || 'Unable to update your password.', 'error');
        }
    });

    signOutButton.addEventListener("click", async () => {
        const token = localStorage.getItem("creatoriq_token");

        try {
            if (token) {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (error) {
            showStatus("Server sign-out could not be confirmed; local session was cleared.", "error");
        } finally {
            ["creatoriq_token", "creatoriq_user", "creatoriq_session"].forEach((key) => localStorage.removeItem(key));
            window.location.replace("index.html");
        }
    });

    loadProfile();
});
