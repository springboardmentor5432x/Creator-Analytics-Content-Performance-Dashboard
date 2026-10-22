"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".liq-page");
  if (!page) return;

  const token = localStorage.getItem("creatoriq_token");
  if (!token) {
    window.location.replace("index.html");
    return;
  }

  const toast = document.getElementById("liqToast");
  const overlay = document.getElementById("liqOverlay");
  const menuToggle = document.getElementById("liqMenuToggle");
  const searchInput = document.getElementById("liqSearch");
  const postsBody = document.getElementById("liqPostsBody");
  const agencyCreatorsBody = document.getElementById("agencyCreatorsBody");
  const campaignsBody = document.getElementById("campaignsBody");
  const adminUsersBody = document.getElementById("adminUsersBody");
  const platformButtons = [...document.querySelectorAll("[data-liq-platform]")];
  const metricButtons = [...document.querySelectorAll("[data-liq-metric]")];
  const demographicButtons = [...document.querySelectorAll("[data-liq-demo]")];
  const dateRange = document.getElementById("liqDateRange");

  let selectedPlatform = "All";
  let selectedMetric = "Views";
  let toastTimeout;

  const platformSummaries = {
    All: { followers: "24,816", views: "1.8M", likes: "98,240", comments: "8,932", shares: "6,120", engagement: "6.8%" },
    YouTube: { followers: "9,420", views: "820K", likes: "42,100", comments: "3,270", shares: "1,600", engagement: "7.1%" },
    Instagram: { followers: "8,164", views: "512K", likes: "31,480", comments: "3,920", shares: "2,500", engagement: "8.4%" },
    TikTok: { followers: "5,201", views: "398K", likes: "21,360", comments: "1,540", shares: "1,700", engagement: "6.7%" },
    LinkedIn: { followers: "2,031", views: "70K", likes: "3,300", comments: "202", shares: "320", engagement: "5.2%" }
  };

  const platformBarFactors = { All: 1, YouTube: 0.84, Instagram: 0.78, TikTok: 0.94, LinkedIn: 0.58 };
  const growthFactors = { YouTube: 1, Instagram: 0.88, TikTok: 0.96, LinkedIn: 0.62 };
  const roleDashboards = {
    creator: {
      workspace: "CREATOR WORKSPACE",
      overview: "CREATOR OVERVIEW",
      description: "Here’s what’s happening with your content and audience.",
      sections: ["Follower Growth", "Growth across your social channels", "Content Performance", "Compare engagement by metric", "Top Performing Posts", "Your best recent content", "Audience Demographics", "Understand your audience", "Revenue Overview", "Illustrative creator earnings"],
      metrics: ["Total Followers", "Total Views", "Total Likes", "Comments", "Shares", "Engagement Rate"]
    },
    agency: {
      workspace: "AGENCY WORKSPACE",
      overview: "AGENCY PORTFOLIO",
      description: "Monitor creator accounts, delivery, and portfolio performance.",
      sections: ["Portfolio Growth", "Audience growth across managed creators", "Creator Performance", "Compare portfolio engagement by metric", "Top Portfolio Content", "Best recent content across your roster", "Audience Overview", "Compare audiences across creators", "Campaign Revenue", "Illustrative portfolio campaign earnings"],
      metrics: ["Managed Creators", "Portfolio Views", "Active Campaigns", "Deliverables Due", "Completed Deliverables", "Average Engagement"]
    },
    marketing: {
      workspace: "MARKETING WORKSPACE",
      overview: "CAMPAIGN PERFORMANCE",
      description: "Track campaign reach, audience response, and attributed results.",
      sections: ["Campaign Reach", "Reach trend across active campaigns", "Creative Performance", "Compare campaign response by metric", "Top Campaign Creatives", "Best recent campaign content", "Target Audience", "Understand campaign audience mix", "Campaign Attribution", "Illustrative attributed revenue"],
      metrics: ["Campaign Impressions", "Link Clicks", "Conversions", "Campaign Spend", "Attributed Revenue", "Return on Ad Spend"]
    },
    administrator: {
      workspace: "ADMIN WORKSPACE",
      overview: "PLATFORM OPERATIONS",
      description: "Review account access and the health of your CreatorIQ workspace.",
      sections: ["Account Growth", "Registered workspace accounts", "Platform Activity", "Sample activity by channel", "Recent Content", "Recent content across the workspace", "Account Mix", "Registered account role distribution", "Workspace Summary", "Illustrative workspace activity"],
      metrics: ["Registered Accounts", "Creator Accounts", "Agency Accounts", "Marketing Accounts", "Administrator Accounts", "Role Types"]
    }
  };

  const roleMetricValues = {
    agency: ["18", "2.4M", "12", "8", "64", "7.8%"],
    marketing: ["3.2M", "42.6K", "8,420", "₹2.4L", "₹8.7L", "3.6x"],
    administrator: ["—", "—", "—", "—", "—", "4"]
  };
  const roleChartValues = {
    agency: {
      7: [[24, 31, 40, 54, 62, 78, 91], [11, 18, 28, 38, 50, 61, 72], [5, 11, 20, 29, 37, 48, 58]],
      30: [[18, 27, 39, 48, 56, 72, 82, 94], [8, 14, 25, 34, 43, 56, 68, 79], [3, 8, 16, 25, 32, 41, 49, 60]],
      90: [[12, 19, 28, 36, 43, 56, 64, 72, 81, 88, 94, 100], [5, 9, 15, 23, 31, 39, 48, 55, 63, 70, 76, 82], [2, 5, 10, 17, 24, 30, 37, 43, 49, 55, 61, 68]]
    },
    marketing: {
      7: [[22, 30, 42, 52, 65, 77, 90], [8, 15, 25, 35, 43, 56, 68], [3, 8, 15, 23, 32, 41, 52]],
      30: [[16, 25, 33, 41, 50, 59, 67, 79], [5, 11, 19, 27, 33, 42, 54, 63], [2, 6, 12, 18, 25, 32, 39, 47]],
      90: [[10, 16, 24, 31, 38, 46, 54, 61, 68, 77, 86, 96], [3, 7, 13, 19, 25, 32, 39, 45, 51, 59, 67, 75], [1, 3, 8, 13, 18, 23, 29, 34, 39, 45, 51, 58]]
    },
    administrator: {
      7: [[15, 22, 33, 44, 57, 68, 82], [5, 10, 17, 25, 32, 39, 49], [2, 4, 8, 13, 18, 24, 32]],
      30: [[8, 15, 24, 34, 45, 56, 67, 78], [3, 7, 13, 19, 27, 33, 39, 47], [1, 3, 6, 10, 14, 19, 24, 31]],
      90: [[4, 8, 14, 20, 27, 35, 42, 50, 58, 66, 74, 83], [1, 3, 7, 11, 16, 21, 26, 31, 36, 41, 46, 52], [1, 2, 4, 7, 10, 13, 17, 20, 24, 28, 32, 37]]
    }
  };

  function updateRoleChart(role, range) {
    const chart = document.querySelector(`[data-role-chart='${role}']`);
    if (!chart) return;

    chart.dataset.range = range;
    chart.setAttribute("aria-label", `${role} performance over the last ${range} days`);
    const seriesValues = roleChartValues[role]?.[range] || [];
    chart.querySelectorAll("[data-role-series]").forEach((series) => {
      const values = seriesValues[Number(series.dataset.roleSeries)];
      if (!values) return;
      const points = values.map((value, index) => {
        const x = (640 * index) / (values.length - 1);
        const y = 201 - (value / 100) * 185;
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      series.setAttribute("d", `M${points.join(" L")}`);
    });
  }

  function updatePlatformSummary() {
    const summary = platformSummaries[selectedPlatform] || platformSummaries.All;
    const values = {
      liqFollowers: summary.followers,
      liqViews: summary.views,
      liqLikes: summary.likes,
      liqComments: summary.comments,
      liqShares: summary.shares,
      liqEngagement: summary.engagement
    };

    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }

  function readUser() {
    for (const key of ["creatoriq_user", "creatoriq_session"]) {
      try {
        const user = JSON.parse(localStorage.getItem(key) || "null");
        if (user && typeof user === "object") return user;
      } catch (error) {
        localStorage.removeItem(key);
      }
    }

    return {};
  }

  function getInitials(name) {
    return String(name || "Creator")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "C";
  }

  function getGreeting(hour) {
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  }

  function populateAccount(user = readUser()) {
    const name = user.name || "Creator";
    const firstName = name.trim().split(/\s+/)[0] || "Creator";
    const role = user.role || "creator";
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    const dashboard = roleDashboards[role] || roleDashboards.creator;
    const initials = getInitials(name);

    page.dataset.role = role;
    document.getElementById("liqWorkspaceLabel").textContent = dashboard.workspace;
    document.getElementById("liqOverviewLabel").textContent = dashboard.overview;
    document.getElementById("liqOverviewDescription").textContent = dashboard.description;
    ["liqGrowthTitle", "liqGrowthDescription", "liqPerformanceTitle", "liqPerformanceDescription", "liqContentTitle", "liqContentDescription", "liqAudienceTitle", "liqAudienceDescription", "liqRevenueTitle", "liqRevenueDescription"].forEach((id, index) => {
      document.getElementById(id).textContent = dashboard.sections[index];
    });
    document.querySelectorAll("[data-liq-kpi-label]").forEach((label, index) => {
      label.textContent = dashboard.metrics[index];
    });
    if (roleMetricValues[role]) {
      ["liqFollowers", "liqViews", "liqLikes", "liqComments", "liqShares", "liqEngagement"].forEach((id, index) => {
        document.getElementById(id).textContent = roleMetricValues[role][index];
      });
    }

    ["liqUserName", "liqTopName"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = name;
    });
    ["liqUserRole", "liqTopRole"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = `${roleLabel} account`;
    });
    ["liqAvatar", "liqTopAvatar"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = initials;
    });

    const greeting = document.getElementById("liqFirstName");
    if (greeting) greeting.textContent = firstName;
    document.getElementById("liqGreeting").textContent = getGreeting(new Date().getHours());
  }

  async function refreshAccountFromServer() {
    try {
      const response = await fetch("/api/profile/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Session expired.");

      localStorage.setItem("creatoriq_user", JSON.stringify(data.user));
      populateAccount(data.user);

      const isAdministrator = data.user.role === "administrator";
      const adminPanel = document.getElementById("adminOverview");
      adminPanel.hidden = !isAdministrator;
      document.querySelectorAll("[data-role-dashboard]").forEach((view) => {
        view.hidden = view.dataset.roleDashboard !== data.user.role;
      });
      document.querySelectorAll("[data-role-navigation]").forEach((navigation) => {
        navigation.hidden = navigation.dataset.roleNavigation !== data.user.role;
      });
      const searchPlaceholders = {
        creator: "Search content, analytics, reports...",
        agency: "Search creators and portfolio...",
        marketing: "Search campaigns and creators...",
        administrator: "Search users and roles..."
      };
      searchInput.placeholder = searchPlaceholders[data.user.role] || searchPlaceholders.creator;

      if (isAdministrator) {
        const roleCounts = document.getElementById("liqAdminRoleCounts");
        try {
          const adminResponse = await fetch("/api/admin/overview", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const overview = await adminResponse.json();
          if (!adminResponse.ok) throw new Error(overview.message || "Admin overview unavailable.");

          document.getElementById("liqAdminAccountCount").textContent = String(overview.totalAccounts);
          document.getElementById("adminTotalUsers").textContent = String(overview.totalAccounts);
          document.getElementById("adminCreatorCount").textContent = String(overview.roleCounts.creator || 0);
          document.getElementById("adminAgencyCount").textContent = String(overview.roleCounts.agency || 0);
          document.getElementById("adminMarketingCount").textContent = String(overview.roleCounts.marketing || 0);
          document.getElementById("adminActiveCount").textContent = String(overview.totalAccounts);
          roleCounts.replaceChildren(...Object.entries(overview.roleCounts || {}).map(([role, count]) => {
            const item = document.createElement("div");
            const label = document.createElement("span");
            const value = document.createElement("strong");
            label.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            value.textContent = String(count);
            item.append(label, value);
            return item;
          }));
          adminUsersBody.replaceChildren(...(overview.users || [])
            .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
            .slice(0, 8)
            .map((user) => {
              const row = document.createElement("tr");
              row.dataset.role = user.role;
              [user.name, user.email, user.role, new Date(user.createdAt).toLocaleDateString(), "Active"].forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = value || "—";
                row.append(cell);
              });
              return row;
            }));
        } catch (error) {
          roleCounts.textContent = "Administrator overview could not be loaded.";
        }
      }
    } catch (error) {
      ["creatoriq_token", "creatoriq_user", "creatoriq_session"].forEach((key) => localStorage.removeItem(key));
      window.location.replace("index.html");
    }
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("liq-toast-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      toast.classList.remove("liq-toast-visible");
    }, 2800);
  }

  function setMenuOpen(isOpen) {
    page.classList.toggle("liq-menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    overlay.setAttribute("aria-hidden", String(!isOpen));
  }

  function applyPostFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const activeRole = page.dataset.role || "creator";
    const tableBody = activeRole === "agency" ? agencyCreatorsBody
      : activeRole === "marketing" ? campaignsBody
        : activeRole === "administrator" ? adminUsersBody : postsBody;
    if (!tableBody) return 0;
    const rows = [...tableBody.querySelectorAll("tr")].filter((row) => !row.dataset.emptyRow);
    const selectedAgencyPlatform = document.getElementById("agencyPlatformFilter")?.value || "All";
    const selectedCampaignStatus = document.getElementById("campaignStatusFilter")?.value || "All";
    const selectedAdminRole = document.getElementById("adminRoleFilter")?.value || "All";
    let visibleCount = 0;

    rows.forEach((row) => {
      const matchesFilter = activeRole === "creator"
        ? selectedPlatform === "All" || row.dataset.platform === selectedPlatform
        : activeRole === "agency"
          ? selectedAgencyPlatform === "All" || row.dataset.platform === selectedAgencyPlatform
          : activeRole === "marketing"
            ? selectedCampaignStatus === "All" || row.dataset.status === selectedCampaignStatus
            : selectedAdminRole === "All" || row.dataset.role === selectedAdminRole;
      const matchesSearch = !query || row.textContent.toLowerCase().includes(query);
      const isVisible = matchesFilter && matchesSearch;
      row.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    let emptyRow = tableBody.querySelector("[data-empty-row]");
    if (visibleCount === 0 && !emptyRow) {
      emptyRow = document.createElement("tr");
      emptyRow.dataset.emptyRow = "true";
      const message = activeRole === "agency" ? "No creators match these filters."
        : activeRole === "marketing" ? "No campaigns match these filters."
          : activeRole === "administrator" ? "No users match these filters." : "No posts match these filters.";
      const cell = document.createElement("td");
      cell.className = "liq-empty-state";
      cell.colSpan = tableBody.closest("table").querySelectorAll("thead th").length;
      cell.textContent = message;
      emptyRow.append(cell);
      tableBody.append(emptyRow);
    } else if (visibleCount > 0 && emptyRow) {
      emptyRow.remove();
    }

    return visibleCount;
  }

  const metricValues = {
    Views: [32, 49, 38, 72, 91, 63, 42],
    Likes: [26, 54, 43, 68, 84, 72, 51],
    Comments: [18, 34, 28, 56, 74, 61, 45],
    Shares: [22, 42, 36, 62, 78, 55, 39]
  };

  function updatePerformanceChart() {
    const values = metricValues[selectedMetric] || metricValues.Views;
    const factor = platformBarFactors[selectedPlatform] || 1;
    document.querySelectorAll(".liq-bar-column i").forEach((bar, index) => {
      bar.style.height = `${Math.max(4, Math.round(values[index] * factor))}%`;
    });
    document.getElementById("liqBarChart").setAttribute("aria-label", `Sample ${selectedPlatform} content performance for ${selectedMetric}`);
  }

  metricButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const metric = button.dataset.liqMetric;
      const values = metricValues[metric];
      if (!values) return;

      metricButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("liq-tab-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
        selectedMetric = metric;
        updatePerformanceChart();
      showToast(`${metric} chart selected.`);
    });
  });

  const demographicData = {
    Age: {
      colors: ["#d66b57", "#547d78", "#6c94b7", "#cf9d57"],
      rows: [["18-24", 42], ["25-34", 32], ["35-44", 15], ["45+", 11]]
    },
    Gender: {
      colors: ["#d66b57", "#547d78", "#6c94b7"],
      rows: [["Women", 49], ["Men", 48], ["Nonbinary / other", 3]]
    },
    Location: {
      colors: ["#d66b57", "#547d78", "#6c94b7", "#cf9d57"],
      rows: [["India", 38], ["United States", 24], ["United Kingdom", 16], ["Other", 22]]
    },
    Device: {
      colors: ["#d66b57", "#547d78", "#6c94b7"],
      rows: [["Mobile", 71], ["Desktop", 23], ["Tablet", 6]]
    }
  };

  function renderDemographic(key, notify = false) {
    const data = demographicData[key];
    if (!data) return;

    let cursor = 0;
    const segments = data.rows.map((row, index) => {
      const start = cursor;
      cursor += row[1];
      return `${data.colors[index]} ${start}% ${cursor}%`;
    });

    document.getElementById("liqDonut").style.setProperty("--liq-donut", `conic-gradient(${segments.join(", ")})`);
    document.getElementById("liqDemographicLegend").innerHTML = data.rows.map((row, index) => (
      `<div><i style="background:${data.colors[index]}"></i><span>${row[0]}</span><b>${row[1]}%</b></div>`
    )).join("");

    demographicButtons.forEach((button) => {
      const isActive = button.dataset.liqDemo === key;
      button.classList.toggle("liq-tab-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    if (notify) showToast(`${key} demographics selected.`);
  }

  demographicButtons.forEach((button) => {
    button.addEventListener("click", () => renderDemographic(button.dataset.liqDemo, true));
  });

  const chartData = {
    7: { values: [20, 29, 26, 43, 38, 59, 72], labels: ["Oct 8", "Oct 9", "Oct 10", "Oct 11", "Oct 12", "Oct 13", "Oct 14"] },
    30: { values: [8, 14, 20, 27, 33, 45, 57, 68, 77, 91, 100], labels: ["Sep 14", "Sep 19", "Sep 24", "Sep 29", "Oct 4", "Oct 9", "Oct 14"] },
    90: { values: [5, 13, 16, 26, 31, 39, 46, 52, 66, 73, 82, 100], labels: ["Jul 17", "Aug 1", "Aug 16", "Aug 31", "Sep 15", "Sep 30", "Oct 14"] }
  };

  function updateGrowthChart(range) {
    const data = chartData[range];
    if (!data) return;

    const selectedLine = selectedPlatform === "All" ? null : selectedPlatform;
    const area = document.getElementById("liqGrowthArea");
    area.style.display = !selectedLine || selectedLine === "YouTube" ? "" : "none";
    document.querySelectorAll("[data-liq-growth]").forEach((series) => {
      const platform = series.dataset.liqGrowth;
      const visible = !selectedLine || platform === selectedLine;
      series.style.display = visible ? "" : "none";
      if (!visible) return;

      const factor = growthFactors[platform] || 1;
      const points = data.values.map((value, index) => {
        const x = (640 * index) / (data.values.length - 1);
        const y = 201 - (value * factor / 100) * 185;
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
      });
      const line = `M${points.join(" L")}`;
      series.setAttribute("d", line);

      if (platform === "YouTube") {
        area.setAttribute("d", `${line} L640 201 L0 201Z`);
      }
    });
    document.getElementById("liqChartLabels").innerHTML = data.labels.map((label) => `<span>${label}</span>`).join("");
    const platformLabel = selectedPlatform === "All" ? "all platforms" : selectedPlatform;
    document.getElementById("liqGrowthChart").setAttribute("aria-label", `Illustrative follower growth for ${platformLabel} over the last ${range} days`);
  }

  platformButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlatform = button.dataset.liqPlatform;
      platformButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("liq-platform-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      applyPostFilters();
      updatePlatformSummary();
      updateGrowthChart(dateRange.value);
      updatePerformanceChart();
      showToast(selectedPlatform === "All" ? "Showing all sample posts." : `${selectedPlatform} posts selected.`);
    });
  });

  searchInput.addEventListener("input", applyPostFilters);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const count = applyPostFilters();
      showToast(`${count} post${count === 1 ? "" : "s"} match your search.`);
    }
  });

  dateRange.addEventListener("change", () => {
    updateGrowthChart(dateRange.value);
    updateRoleChart(page.dataset.role, dateRange.value);
    showToast(`Chart range changed to the last ${dateRange.value} days.`);
  });

  ["agencyPlatformFilter", "campaignStatusFilter", "adminRoleFilter"].forEach((id) => {
    document.getElementById(id).addEventListener("change", applyPostFilters);
  });

  document.querySelectorAll("[data-role-range]").forEach((control) => {
    control.addEventListener("change", () => {
      const role = control.dataset.roleRange;
      updateRoleChart(role, control.value);
      showToast(`Showing ${role} performance for the last ${control.value} days.`);
    });
  });

  document.querySelectorAll("[data-liq-feature]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      showToast(`${element.dataset.liqFeature} is not connected in this demo.`);
      setMenuOpen(false);
    });
  });

  document.querySelectorAll("[data-liq-notifications]").forEach((element) => {
    element.addEventListener("click", () => {
      showToast("You’re all caught up.");
      setMenuOpen(false);
    });
  });

  menuToggle.addEventListener("click", () => {
    setMenuOpen(!page.classList.contains("liq-menu-open"));
  });
  overlay.addEventListener("click", () => setMenuOpen(false));
  document.querySelectorAll(".liq-navigation a:not([data-liq-feature])").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.getElementById("liqSignOut").addEventListener("click", async () => {
    try {
      const currentToken = localStorage.getItem("creatoriq_token");
      if (currentToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      }
    } catch (error) {
      showToast("Server sign-out could not be confirmed; local session was cleared.");
    } finally {
      ["creatoriq_token", "creatoriq_user", "creatoriq_session"].forEach((key) => localStorage.removeItem(key));
      window.location.replace("index.html");
    }
  });

  function exportReport() {
    const role = page.dataset.role || "creator";
    const roleView = document.querySelector(`[data-role-dashboard='${role}']`);
    const activeTable = roleView?.querySelector("tbody");
    const metrics = [...(roleView?.querySelectorAll(".liq-kpi-card") || [])].map((card) => [
      card.querySelector(".liq-kpi-heading")?.textContent.trim() || "Metric",
      card.querySelector(".liq-kpi-value")?.textContent.trim() || ""
    ]);
    const headers = activeTable
      ? [...activeTable.closest("table").querySelectorAll("thead th")].map((cell) => cell.textContent.trim())
      : [];
    const report = [
      [`CreatorIQ ${role} Report`, new Date().toLocaleDateString()],
      ["Date range", dateRange.options[dateRange.selectedIndex].text],
      ["Metric", "Value"],
      ...metrics,
      [],
      headers,
      ...[...(activeTable?.querySelectorAll("tr") || [])]
        .filter((row) => !row.hidden && !row.dataset.emptyRow)
        .map((row) => [...row.cells].map((cell) => cell.textContent.trim()))
    ];
    const csv = report.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creatoriq-${role}-report.csv`;
    link.style.position = "fixed";
    link.style.left = "-10000px";
    link.style.top = "0";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Your report has been exported.");
    setMenuOpen(false);
  }

  document.getElementById("liqExport").addEventListener("click", exportReport);
  document.querySelectorAll("[data-liq-export]").forEach((button) => {
    button.addEventListener("click", exportReport);
  });

  document.getElementById("liqAdminCreateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const status = document.getElementById("liqAdminCreateStatus");
    const formData = new FormData(form);
    submitButton.disabled = true;
    status.textContent = "Creating administrator account...";

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to create account.");
      form.reset();
      status.textContent = `${data.user.name} can now sign in as an administrator.`;
      await refreshAccountFromServer();
    } catch (error) {
      status.textContent = error.message || "Unable to create account.";
    } finally {
      submitButton.disabled = false;
    }
  });

  populateAccount();
  const cachedRole = readUser().role || "creator";
  document.querySelectorAll("[data-role-dashboard]").forEach((view) => {
    view.hidden = view.dataset.roleDashboard !== cachedRole;
  });
  document.querySelectorAll("[data-role-navigation]").forEach((navigation) => {
    navigation.hidden = navigation.dataset.roleNavigation !== cachedRole;
  });
  renderDemographic("Age");
  updateGrowthChart(dateRange.value);
  updatePlatformSummary();
  updatePerformanceChart();
  refreshAccountFromServer();
});
