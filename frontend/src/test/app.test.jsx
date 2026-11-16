// Integration test: renders the real app and talks to the RUNNING backend (python -m app.seed must have been run).
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";

beforeAll(() => { global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; });
beforeEach(() => { cleanup(); localStorage.clear(); window.confirm = () => true; });

const mount = (path) => render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);

async function signIn(email = "creator@creatoriq.demo", pw = "Demo@12345") {
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText("Email"), email);
  await u.type(screen.getByLabelText("Password"), pw);
  await u.click(screen.getByRole("button", { name: /sign in/i }));
  return u;
}

describe("CreatorIQ UI", () => {
  it("protected route redirects to login when logged out", async () => {
    mount("/dashboard");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeTruthy();
  });

  it("shows client-side validation errors", async () => {
    const u = userEvent.setup(); mount("/login");
    await u.click(await screen.findByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
  });

  it("shows server error for wrong password", async () => {
    mount("/login"); await signIn("creator@creatoriq.demo", "WrongPass1");
    expect(await screen.findByText("Incorrect email or password.")).toBeTruthy();
  });

  it("logs in and renders the dashboard with real API data + DEMO label", async () => {
    mount("/login"); await signIn();
    expect(await screen.findByText("Total followers", {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findAllByText("DEMO DATA")).toBeTruthy();
    expect(screen.getByText("Engagement rate")).toBeTruthy();
    expect(localStorage.getItem("ciq_token")).toBeTruthy();
  });

  it("content page: lists rows from API and adds a record through the form", async () => {
    mount("/login"); const u = await signIn();
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Content Analytics/ })[0]);
    expect(await screen.findByText("All content", {}, { timeout: 10000 })).toBeTruthy();
    await u.click(screen.getByRole("button", { name: /add content/i }));
    await u.type(await screen.findByLabelText("Title"), "UI integration test post");
    await u.clear(screen.getByLabelText("Reach")); await u.type(screen.getByLabelText("Reach"), "100");
    await u.clear(screen.getByLabelText("Likes")); await u.type(screen.getByLabelText("Likes"), "10");
    await u.click(screen.getAllByRole("button", { name: /add content/i }).pop());
    expect(await screen.findByText("Content added.", {}, { timeout: 10000 })).toBeTruthy();
    await u.type(screen.getByLabelText("Search titles"), "UI integration test");
    expect(await screen.findByText("UI integration test post", {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByText("10.00%").length).toBeGreaterThan(0); // (10 likes / 100 reach)
    await u.click(screen.getByLabelText("Delete UI integration test post"));  // confirm() is stubbed below
  });

  it("audience and connections pages render API data", async () => {
    mount("/login"); const u = await signIn();
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Audience Analytics/ })[0]);
    expect(await screen.findByText("Growth trend analysis", {}, { timeout: 10000 })).toBeTruthy();
    await u.click(screen.getAllByRole("link", { name: /Social Connections/ })[0]);
    expect((await screen.findAllByText("NOT CONNECTED", {}, { timeout: 10000 })).length).toBe(6);
  });

  it("agency role: logs in and routes to Agency Dashboard", async () => {
    mount("/login");
    await signIn("agency@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Talent Agency Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Top Performing Creators/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Creator Roster Management/i, {}, { timeout: 10000 })).toBeTruthy();
  });

  it("marketing role: logs in and routes to Marketing Dashboard", async () => {
    mount("/login");
    await signIn("marketing@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Marketing Intelligence Suite/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Marketing Campaign Dashboard/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Campaign Management/i, {}, { timeout: 10000 })).toBeTruthy();
  });

  it("administrator role: logs in and routes to Administrator Dashboard", async () => {
    mount("/login");
    await signIn("admin@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Platform Governance Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Administrator Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/User Account Management/i, {}, { timeout: 10000 })).toBeTruthy();
  });

  it("registration page: includes Administrator in role dropdown without authorization key field and routes to Administrator Dashboard", async () => {
    mount("/register");
    const u = userEvent.setup();
    const roleSelect = await screen.findByLabelText("Role");
    const options = Array.from(roleSelect.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toContain("Creator");
    expect(options).toContain("Agency");
    expect(options).toContain("Marketing Team");
    expect(options).toContain("Administrator");

    // Verify warning message and authorization key field are NOT present in UI
    expect(screen.queryByText(/Administrator Access Restricted/i)).toBeNull();
    expect(screen.queryByLabelText(/Admin authorization key/i)).toBeNull();

    // Select Administrator
    await u.selectOptions(roleSelect, "administrator");
    expect(screen.queryByText(/Administrator Access Restricted/i)).toBeNull();
    expect(screen.queryByLabelText(/Admin authorization key/i)).toBeNull();

    // Fill standard registration form and submit
    const adminEmail = `ui_admin_${Date.now()}@test.com`;
    await u.type(screen.getByLabelText("Full name"), "New Administrator");
    await u.type(screen.getByLabelText("Email"), adminEmail);
    await u.type(screen.getByLabelText("Password"), "AdminPass123");
    await u.type(screen.getByLabelText("Confirm password"), "AdminPass123");
    await u.click(screen.getByRole("button", { name: /create account/i }));

    // Successfully routes to Administrator Dashboard
    expect(await screen.findByText(/Platform Governance Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Administrator Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/User Account Management/i, {}, { timeout: 10000 })).toBeTruthy();
  });

  it("Module 2: Content Analytics displays overview cards, top-performing reports, and content comparison", async () => {
    mount("/login");
    const u = await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Content Analytics/ })[0]);
    expect(await screen.findByText("All content", {}, { timeout: 10000 })).toBeTruthy();

    // Check Module 2 required overview metrics
    expect(await screen.findByText("Total Views", {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText("Total Reach")).toBeTruthy();
    expect(screen.getByText("Total Likes")).toBeTruthy();
    expect(screen.getByText("Total Comments")).toBeTruthy();
    expect(screen.getByText("Total Shares")).toBeTruthy();
    expect(screen.getByText("Avg Engagement Rate")).toBeTruthy();

    // Check Top-Performing Content Reports section
    expect(await screen.findByText("Top-Performing Content Reports", {}, { timeout: 10000 })).toBeTruthy();

    // Check Content Comparison button opens the Comparison Dashboard modal
    const compareBtn = screen.getByRole("button", { name: /compare content/i });
    expect(compareBtn).toBeTruthy();
    await u.click(compareBtn);

    // Verify comparison dashboard modal renders
    expect(await screen.findByText(/Content Comparison Dashboard/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Engagement Rate Formula Selected/i, {}, { timeout: 10000 })).toBeTruthy();
    await u.click(screen.getByRole("button", { name: /done/i }));
  });

  it("Administrator dashboard displays Platform-Wide Content Analytics overview", async () => {
    mount("/login");
    await signIn("admin@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Platform-Wide Content Analytics/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Cross-Platform Content Distribution/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Top Content on Platform/i, {}, { timeout: 10000 })).toBeTruthy();
  });

  it("Module 5: Revenue Analytics displays overview KPI cards, charts, and transaction records", async () => {
    mount("/login");
    const u = await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Revenue Analytics/ })[0]);
    expect(await screen.findByText("Revenue Analytics", {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText("Total Revenue")).toBeTruthy();
    expect(screen.getByText("Monthly Revenue (MTD)")).toBeTruthy();
    expect(screen.getByText("MoM Growth")).toBeTruthy();
    expect(screen.getByText("Revenue Transactions")).toBeTruthy();
    expect(screen.getByText("Monetization Streams")).toBeTruthy();
    expect(screen.getByText("Add Revenue Record")).toBeTruthy();
  });

  it("Module 4: Growth & Trend Forecasting displays predictions, regression metrics, and hashtag table", async () => {
    mount("/login");
    const u = await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Growth Forecasting/ })[0]);
    expect(await screen.findByText("Growth & Trend Forecasting", {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText("Current Followers")).toBeTruthy();
    expect(screen.getByText("Historical Growth Rate")).toBeTruthy();
    expect(screen.getByText("Engagement Velocity")).toBeTruthy();
    expect(screen.getByText("Hashtag Performance & Reach Ranking")).toBeTruthy();
    expect(screen.getByText(/Follower Trajectory: Historical vs Statistical Forecast/i)).toBeTruthy();
  });

  it("Phase 3 Multi-Role Access: Agency, Marketing, and Admin navigation include Growth Forecasting and Revenue Analytics", async () => {
    // 1. Agency role
    mount("/login");
    await signIn("agency@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Talent Agency Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Growth Forecasting/ })[0]).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Revenue Analytics/ })[0]).toBeTruthy();

    // 2. Marketing role
    cleanup();
    mount("/login");
    await signIn("marketing@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Marketing Intelligence Suite/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Growth Forecasting/ })[0]).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Revenue Analytics/ })[0]).toBeTruthy();

    // 3. Admin role
    cleanup();
    mount("/login");
    await signIn("admin@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Platform Governance Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Growth Forecasting/ })[0]).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Revenue Analytics/ })[0]).toBeTruthy();
  });

  it("Module 6: Notifications & Alert System displays notification center, categories, and header bell popover", async () => {
    mount("/login");
    const u = await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });

    // 1. Verify header bell button is present
    const bellBtn = await screen.findByRole("button", { name: /notifications/i });
    expect(bellBtn).toBeTruthy();

    // 2. Open Notification Popover via bell
    await u.click(bellBtn);
    expect(await screen.findByText(/View all notifications/i, {}, { timeout: 10000 })).toBeTruthy();

    // 3. Navigate to full Notification Center
    await u.click(screen.getAllByRole("link", { name: /Notifications/ })[0]);
    expect(await screen.findByText(/Notification Center/i, {}, { timeout: 10000 })).toBeTruthy();

    // 4. Verify category tabs exist
    expect(screen.getByRole("tab", { name: /All/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Unread/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Performance/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Engagement/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Revenue/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /System/i })).toBeTruthy();
  });

  it("Phase 4 Multi-Role Access: All 4 roles have access to Notifications Center and navigation links", async () => {
    // 1. Creator
    mount("/login");
    await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    expect(screen.getAllByRole("link", { name: /Notifications/ })[0]).toBeTruthy();

    // 2. Agency
    cleanup();
    mount("/login");
    await signIn("agency@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Talent Agency Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Notifications/ })[0]).toBeTruthy();

    // 3. Marketing
    cleanup();
    mount("/login");
    await signIn("marketing@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Marketing Intelligence Suite/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Notifications/ })[0]).toBeTruthy();

    // 4. Admin
    cleanup();
    mount("/login");
    await signIn("admin@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Platform Governance Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Notifications/ })[0]).toBeTruthy();
  });

  it("Module 3: Audience Demographics displays age, gender, geographic, and device breakdowns", async () => {
    mount("/login");
    const u = await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Audience Analytics/ })[0]);
    expect(await screen.findByText(/Audience Demographics & Deep Insights/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(await screen.findByText(/Growth trend analysis/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText(/Age Distribution/i)).toBeTruthy();
    expect(screen.getByText(/Gender Distribution/i)).toBeTruthy();
    expect(screen.getByText(/Top Geographic Markets/i)).toBeTruthy();
    expect(screen.getByText(/Device Breakdown/i)).toBeTruthy();
    expect(screen.getByText(/Active Hours & Best Posting Windows/i)).toBeTruthy();
    expect(screen.getByText(/Cross-Platform Comparison/i)).toBeTruthy();
  });

  it("Phase 5 Multi-Role Access: All 4 roles can access Audience Analytics via sidebar navigation", async () => {
    // 1. Creator
    mount("/login");
    await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    expect(screen.getAllByRole("link", { name: /Audience Analytics/ })[0]).toBeTruthy();

    // 2. Agency
    cleanup();
    mount("/login");
    await signIn("agency@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Talent Agency Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Audience Analytics/ })[0]).toBeTruthy();

    // 3. Marketing
    cleanup();
    mount("/login");
    await signIn("marketing@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Marketing Intelligence Suite/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Audience Analytics/ })[0]).toBeTruthy();

    // 4. Admin
    cleanup();
    mount("/login");
    await signIn("admin@creatoriq.demo", "Demo@12345");
    expect(await screen.findByText(/Platform Governance Console/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Audience Analytics/ })[0]).toBeTruthy();
  });

  it("Module 7: Social Connections renders YouTube connector and connect modal", async () => {
    mount("/login");
    const u = await signIn("creator@creatoriq.demo", "Demo@12345");
    await screen.findByText("Total followers", {}, { timeout: 10000 });
    await u.click(screen.getAllByRole("link", { name: /Social Connections/ })[0]);
    expect(await screen.findByText(/Social Media Connections/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText("YouTube")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Connect Real Channel/i })).toBeTruthy();
    await u.click(screen.getByRole("button", { name: /Connect Real Channel/i }));
    expect(await screen.findByText(/Connect YouTube Channel/i, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText(/YouTube Data API v3/i)).toBeTruthy();
  });
});
