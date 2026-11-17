"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const segments = [...document.querySelectorAll(".segment")];
  const tableHead = document.getElementById("analyzer-table-head");
  const tableBody = document.getElementById("analyzer-table-body");
  const filterButton = document.getElementById("analyzer-filter");
  const filterRow = document.getElementById("analyzer-filter-row");
  const platformFilter = document.getElementById("analyzer-platform-filter");
  const notificationsButton = document.getElementById("analyzer-notifications");
  const launchButton = document.getElementById("analyzer-launch");
  const toast = document.getElementById("analyzer-toast");

  const records = [
    { asset: "Creator story arc", format: "Short video", platform: "Instagram", reach: "38.4K", ctr: "6.4%", lift: "+24%", impressions: "91.2K", views: "38.4K", clicks: "2.4K", conversions: "190", revenue: "₹28.4K" },
    { asset: "UGC testimonial", format: "Carousel", platform: "YouTube", reach: "26.2K", ctr: "5.1%", lift: "+18%", impressions: "64.8K", views: "26.2K", clicks: "1.7K", conversions: "142", revenue: "₹19.6K" },
    { asset: "Launch countdown", format: "Feed post", platform: "TikTok", reach: "31.5K", ctr: "5.8%", lift: "+14%", impressions: "73.1K", views: "31.5K", clicks: "1.9K", conversions: "128", revenue: "₹16.2K" },
    { asset: "Educational reel", format: "Reel", platform: "Instagram", reach: "42.1K", ctr: "4.9%", lift: "+9%", impressions: "106K", views: "42.1K", clicks: "2.1K", conversions: "116", revenue: "₹14.8K" }
  ];

  const views = {
    engagement: {
      headers: ["Asset", "Format", "Platform", "Reach", "CTR", "Lift"],
      fields: ["asset", "format", "platform", "reach", "ctr", "lift"]
    },
    reach: {
      headers: ["Asset", "Format", "Platform", "Impressions", "Views", "Lift"],
      fields: ["asset", "format", "platform", "impressions", "views", "lift"]
    },
    conversion: {
      headers: ["Asset", "Format", "Platform", "Link clicks", "Conversions", "Revenue"],
      fields: ["asset", "format", "platform", "clicks", "conversions", "revenue"]
    }
  };

  let currentView = "engagement";
  let toastTimeout;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("liq-toast-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("liq-toast-visible"), 2800);
  }

  function renderTable() {
    const view = views[currentView];
    const platform = platformFilter.value;
    const filteredRecords = records.filter((record) => platform === "All" || record.platform === platform);

    const headerRow = document.createElement("tr");
    view.headers.forEach((label) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      headerRow.append(cell);
    });
    tableHead.replaceChildren(headerRow);

    if (filteredRecords.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = view.headers.length;
      cell.textContent = "No analyzer records match this platform.";
      row.append(cell);
      tableBody.replaceChildren(row);
      return;
    }

    const rows = filteredRecords.map((record) => {
      const row = document.createElement("tr");
      view.fields.forEach((field, index) => {
        const cell = document.createElement("td");
        cell.textContent = record[field];
        if (index === view.fields.length - 1 && currentView !== "conversion") {
          cell.className = "positive";
        }
        row.append(cell);
      });
      return row;
    });
    tableBody.replaceChildren(...rows);
  }

  segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      currentView = segment.dataset.view;
      segments.forEach((item) => {
        const isActive = item === segment;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      renderTable();
    });
  });

  filterButton.addEventListener("click", () => {
    const isOpening = filterRow.hidden;
    filterRow.hidden = !isOpening;
    filterButton.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) platformFilter.focus();
  });

  platformFilter.addEventListener("change", renderTable);
  notificationsButton.addEventListener("click", () => showToast("You’re all caught up."));
  launchButton.addEventListener("click", () => showToast("Sample test prepared. Connect a platform to launch a live test."));

  renderTable();
});
