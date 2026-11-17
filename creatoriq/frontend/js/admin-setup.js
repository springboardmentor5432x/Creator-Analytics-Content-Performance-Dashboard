"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("admin-setup-form");
  const status = document.getElementById("setup-status");
  const button = document.getElementById("setup-submit");
  const buttonText = button.querySelector(".button-text");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const setupKey = values.setupKey;
    delete values.setupKey;
    button.disabled = true;
    buttonText.textContent = "Creating...";
    status.textContent = "Provisioning administrator account...";
    status.className = "form-status info";

    try {
      const response = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-setup-key": setupKey
        },
        body: JSON.stringify(values)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Administrator setup failed.");
      form.reset();
      status.textContent = "Administrator created. Redirecting to sign in...";
      status.className = "form-status success";
      window.setTimeout(() => window.location.assign("index.html"), 700);
    } catch (error) {
      status.textContent = error.message || "Administrator setup failed.";
      status.className = "form-status error";
    } finally {
      button.disabled = false;
      buttonText.textContent = "Create administrator";
    }
  });
});