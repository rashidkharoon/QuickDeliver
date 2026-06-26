import React, { useState, useEffect } from "react";
import {
  Search,
  Database,
  Save,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  ListFilter,
  Trash2,
  HelpCircle,
  ArrowUpRight,
  Check,
  Copy,
  X,
  ShieldAlert,
} from "lucide-react";
import { Order, OrderStatus } from "../types";
import {
  getAppsScriptUrl,
  saveAppsScriptUrl,
  getAllOrdersLocal,
  saveAllOrdersLocal,
  updateOrderStatusLocal,
  updateOrderPaymentStatusLocal,
} from "../utils/storage";

interface AdminPanelProps {
  addToast: (
    text: string,
    type: "success" | "warning" | "error" | "info",
  ) => void;
  onRefreshStatus: () => void;
}

export default function AdminPanel({
  addToast,
  onRefreshStatus,
}: AdminPanelProps) {
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>("");
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [isConnSuccessful, setIsConnSuccessful] = useState<boolean | null>(
    null,
  );

  // UPI Config states
  const [upiId, setUpiId] = useState<string>("merchant@upi");

  // Authentication states
  const [password, setPassword] = useState<string>("");
  const [newAdminPassword, setNewAdminPassword] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("qd_admin_auth") === "true";
  });
  const [loginError, setLoginError] = useState<string>("");

  // Orders list state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Load orders and config
  const loadData = async () => {
    let savedUrl = getAppsScriptUrl();
    let savedUpi = localStorage.getItem("qd_admin_upi_id") || "merchant@upi";

    try {
      // Load current settings from server first to be in sync
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        if (data.appsScriptUrl) {
          savedUrl = data.appsScriptUrl;
          saveAppsScriptUrl(savedUrl);
        }
        if (data.upiId) {
          savedUpi = data.upiId;
          localStorage.setItem("qd_admin_upi_id", savedUpi);
        }
      }
    } catch (err) {
      console.error("Failed to sync settings with cloud server on load:", err);
    }

    setAppsScriptUrl(savedUrl);
    setUpiId(savedUpi);

    if (savedUrl) {
      setIsLoadingOrders(true);
      try {
        const response = await fetch("/api/proxy-apps-script", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appsScriptUrl: savedUrl,
            method: "GET",
            payload: { action: "getOrders" },
          }),
        });
        const data = await response.json();
        if (data.success && data.orders) {
          setOrders(data.orders);
          saveAllOrdersLocal(data.orders); // Sync to local cache
          setIsConnSuccessful(true);
        } else {
          throw new Error("API failed to respond successfully");
        }
      } catch (e) {
        console.error(
          "Failed to fetch orders from Apps Script. Loading local copy.",
          e,
        );
        setOrders(getAllOrdersLocal());
        setIsConnSuccessful(false);
      } finally {
        setIsLoadingOrders(false);
      }
    } else {
      setOrders(getAllOrdersLocal());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Apps Script URL
  const handleSaveUrl = async () => {
    setIsSavingUrl(true);
    try {
      saveAppsScriptUrl(appsScriptUrl);
      
      // Save settings to cloud server
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appsScriptUrl }),
      });

      addToast("Apps Script Web App URL updated in Cloud!", "success");
      onRefreshStatus();
      loadData();
    } catch (e) {
      addToast("Failed to save URL to cloud", "error");
    } finally {
      setIsSavingUrl(false);
    }
  };

  // Test Web App Connection
  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) {
      addToast(
        "Please enter a Google Apps Script Web App URL first!",
        "warning",
      );
      return;
    }

    setIsTestingConn(true);
    setIsConnSuccessful(null);
    try {
      const response = await fetch(appsScriptUrl.trim(), {
        method: "GET",
        mode: "cors",
      });
      const data = await response.json();
      if (data.success) {
        setIsConnSuccessful(true);
        addToast(
          "Connection successful! Google Sheets database is active and linked.",
          "success",
        );
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      setIsConnSuccessful(false);
      addToast(
        'Connection failed. Please ensure the Web App is deployed as "Anyone" and CORS is enabled.',
        "error",
      );
    } finally {
      setIsTestingConn(false);
    }
  };

  // Clear URL
  const handleClearUrl = () => {
    setAppsScriptUrl("");
    saveAppsScriptUrl("");
    setIsConnSuccessful(null);
    onRefreshStatus();
    loadData();
    addToast(
      "Apps Script URL cleared. Reverting to Local Sandbox Database.",
      "info",
    );
  };

  // Change Order Status
  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    const savedUrl = getAppsScriptUrl();

    // Optimistic UI update
    const updatedOrders = orders.map((o) =>
      o.id === orderId ? { ...o, status: newStatus } : o,
    );
    setOrders(updatedOrders);
    updateOrderStatusLocal(orderId, newStatus);

    if (savedUrl) {
      try {
        const response = await fetch("/api/proxy-apps-script", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appsScriptUrl: savedUrl,
            method: "POST",
            payload: {
              action: "updateStatus",
              orderId: orderId,
              status: newStatus,
            },
          }),
        });
        const data = await response.json();
        if (data.success) {
          addToast(
            `Order ${orderId} updated to "${newStatus}" in Google Sheets!`,
            "success",
          );
        } else {
          throw new Error(data.error);
        }
      } catch (e) {
        console.error("Failed to sync status with Google Sheets", e);
        addToast(
          `Saved locally! (Offline / Sheets failed to sync Status: ${newStatus})`,
          "warning",
        );
      }
    } else {
      addToast(
        `Order ${orderId} updated to "${newStatus}" (Local sandbox cache)`,
        "success",
      );
    }
  };

  // Change Payment Status
  const handlePaymentStatusChange = async (
    orderId: string,
    newPaymentStatus: "Pending" | "Paid",
  ) => {
    const savedUrl = getAppsScriptUrl();

    // Optimistic UI update
    const updatedOrders = orders.map((o) =>
      o.id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o,
    );
    setOrders(updatedOrders);
    updateOrderPaymentStatusLocal(orderId, newPaymentStatus);

    if (savedUrl) {
      try {
        const response = await fetch("/api/proxy-apps-script", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appsScriptUrl: savedUrl,
            method: "POST",
            payload: {
              action: "updatePaymentStatus",
              orderId: orderId,
              paymentStatus: newPaymentStatus,
            },
          }),
        });
        const data = await response.json();
        if (data.success) {
          addToast(
            `Order ${orderId} payment updated to "${newPaymentStatus}" in Google Sheets!`,
            "success",
          );
        } else {
          throw new Error(data.error);
        }
      } catch (e) {
        console.error("Failed to sync payment status with Google Sheets", e);
        addToast(
          `Saved locally! (Offline / Sheets failed to sync Payment Status: ${newPaymentStatus})`,
          "warning",
        );
      }
    } else {
      addToast(
        `Order ${orderId} payment updated to "${newPaymentStatus}" (Local sandbox cache)`,
        "success",
      );
    }
  };

  // Delete/Archive order locally
  const handleDeleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    saveAllOrdersLocal(updated);
    addToast(`Order ${orderId} removed from dashboard view.`, "info");
  };

  // Stats calculations
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const processingOrders = orders.filter(
    (o) => o.status === "Processing",
  ).length;
  const readyOrders = orders.filter((o) => o.status === "Ready").length;
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;

  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((sum, o) => sum + o.estimatedPrice, 0);

  const potentialRevenue = orders
    .filter((o) => o.status !== "Delivered")
    .reduce((sum, o) => sum + o.estimatedPrice, 0);

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.deliveryLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesService =
      selectedService === "All" || o.serviceType === selectedService;
    const matchesStatus =
      selectedStatus === "All" || o.status === selectedStatus;

    return matchesSearch && matchesService && matchesStatus;
  });

  // Export CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      addToast("No orders found to export!", "warning");
      return;
    }

    const headers = [
      "Order ID",
      "Timestamp",
      "Customer Name",
      "Phone",
      "Department",
      "Location",
      "Service Type",
      "Details",
      "Status",
      "Estimated Price (INR)",
      "File URL",
    ];

    const escapeCSVCell = (val: any) => {
      if (val === null || val === undefined) return "";
      const stringVal = String(val);
      const escaped = stringVal.replace(/"/g, '""');
      if (
        escaped.includes(",") ||
        escaped.includes('"') ||
        escaped.includes("\n") ||
        escaped.includes("\r")
      ) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const rows = filteredOrders.map((o) => {
      const absoluteFileUrl = o.fileUrl
        ? (o.fileUrl.startsWith("http") ? o.fileUrl : `${window.location.origin}${o.fileUrl}`)
        : "";
      
      const fileCellValue = absoluteFileUrl
        ? `=HYPERLINK("${absoluteFileUrl}", "View File")`
        : "";

      // Format numeric phone numbers to prevent scientific notation (e.g., 8.3E+09)
      const phoneCellValue = (o.phone && /^\+?\d+$/.test(o.phone.trim()))
        ? `="${o.phone.trim()}"`
        : o.phone;

      return [
        o.id,
        o.timestamp,
        o.customerName,
        phoneCellValue,
        o.department,
        o.deliveryLocation,
        o.serviceType,
        o.details,
        o.status,
        o.estimatedPrice,
        fileCellValue,
      ].map(escapeCSVCell);
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `quickdeliver_orders_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Successfully downloaded CSV of filtered orders!", "success");
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("qd_admin_auth", "true");
        addToast("Authenticated successfully as Admin!", "success");
        loadData();
      } else {
        throw new Error();
      }
    } catch (err) {
      // Local fallback in case the server can't be reached or settings are offline
      const correctPassword = localStorage.getItem("qd_admin_password") || "ad_123";
      if (password === correctPassword) {
        setIsAuthenticated(true);
        sessionStorage.setItem("qd_admin_auth", "true");
        addToast("Authenticated successfully as Admin! (Offline Mode)", "success");
        loadData();
      } else {
        setLoginError("Invalid Administrator Password. Access Denied.");
        addToast("Access Denied: Incorrect password.", "error");
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    sessionStorage.removeItem("qd_admin_auth");
    addToast("Logged out of Admin Control Center.", "info");
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-6 text-left">
        <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-100">
            Admin Authentication
          </h2>
          <p className="text-stone-400 text-xs leading-relaxed">
            Authorized personnel only. Please enter the master access code to
            manage orders, update print schedules, and link spreadsheets.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-pass"
              className="block text-xs font-semibold text-stone-400"
            >
              Master Password
            </label>
            <input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError("");
              }}
              placeholder="Enter password"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-700 font-mono transition-colors"
              required
              autoFocus
            />
          </div>

          {loginError && (
            <div className="text-[11px] font-bold text-rose-500 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-stone-950 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98]"
          >
            Authorize & Unlock Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left max-w-7xl mx-auto px-1">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-stone-900 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-100 flex items-center gap-2">
            Admin Control Center
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Manage orders, update dispatch statuses, export data logs, and
            configure sheets integration.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="py-2 px-3 bg-stone-900 border border-stone-800 hover:bg-stone-850 hover:text-stone-200 text-stone-400 text-xs font-semibold rounded-xl transition-all"
        >
          Secure Logout
        </button>
      </div>

      {/* STATS BENTO GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
            Total Queue
          </span>
          <p className="text-3xl font-bold font-mono text-orange-500">
            {totalOrders}
          </p>
          <span className="text-[10px] text-stone-400 block">
            Active + historic orders
          </span>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">
            Pending Confirmation
          </span>
          <p className="text-3xl font-bold font-mono text-amber-500">
            {pendingOrders}
          </p>
          <span className="text-[10px] text-stone-400 block">
            Needs pack & dispatch
          </span>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
            In Production
          </span>
          <p className="text-3xl font-bold font-mono text-blue-400">
            {processingOrders + readyOrders}
          </p>
          <span className="text-[10px] text-stone-400 block">
            Printing / Binding / Sorting
          </span>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">
            Completed / Delivered
          </span>
          <p className="text-3xl font-bold font-mono text-emerald-500">
            {deliveredOrders}
          </p>
          <span className="text-[10px] text-stone-400 block">
            Successfully dispatched
          </span>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-2">
          <span className="text-[10px] uppercase font-bold text-stone-300 tracking-wider">
            Realized Revenue
          </span>
          <p className="text-3xl font-bold font-mono text-orange-500">
            ₹{totalRevenue.toFixed(0)}
          </p>
          <span className="text-[10px] text-amber-500 block">
            ₹{potentialRevenue.toFixed(0)} pending collections
          </span>
        </div>
      </div>

      {/* CONFIGURATION & SETUP INSTRUCTIONS ACCORDION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* URL CONFIGURATION CARD */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3 justify-between">
            <div className="flex items-center gap-2">
              <Database className="text-orange-500" size={18} />
              <h3 className="font-sans font-semibold text-stone-200">
                Google Sheets Integration Settings
              </h3>
            </div>
            {isConnSuccessful === true && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                Connected
              </span>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-stone-400 leading-relaxed">
              Connect this PWA directly to your personal Google Spreadsheet.
              Copy-paste the deployed Web App URL from your Google Apps Script
              editor.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-3 pr-8 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-750 font-mono transition-colors"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveUrl}
                  disabled={isSavingUrl}
                  className="py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-800 text-stone-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{isSavingUrl ? "Saving..." : "Save URL"}</span>
                </button>
                {appsScriptUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingConn}
                      className="py-2.5 px-3 bg-stone-850 hover:bg-stone-800 text-stone-300 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <RefreshCw
                        size={12}
                        className={isTestingConn ? "animate-spin" : ""}
                      />
                      <span>
                        {isTestingConn ? "Testing..." : "Test Connection"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearUrl}
                      className="py-2.5 px-3 bg-stone-950 border border-stone-850 hover:bg-stone-900 text-rose-500 hover:text-rose-400 text-xs font-semibold rounded-xl transition-all"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Connection Feedback Banner */}
            {isConnSuccessful === false && (
              <div className="flex items-start gap-2 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                <ShieldAlert
                  className="text-rose-500 shrink-0 mt-0.5"
                  size={14}
                />
                <p className="text-[10px] text-rose-400 leading-normal">
                  Connection Failed. Ensure your Apps Script Web App is deployed
                  as **Execute as: Me** and **Who has access: Anyone**. Also,
                  double check that CORS headers are set!
                </p>
              </div>
            )}
            {isConnSuccessful === true && (
              <div className="flex items-start gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                <CheckCircle2
                  className="text-emerald-500 shrink-0 mt-0.5"
                  size={14}
                />
                <p className="text-[10px] text-emerald-400 leading-normal">
                  Integration Verified! Your college delivery app is
                  successfully synched live with Google Drive and Google Sheets.
                  Customers can place unlimited submissions without signing in!
                </p>
              </div>
            )}

            {/* UPI ID Configuration Field */}
            <div className="border-t border-stone-850 pt-4 mt-2 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                Merchant / Payment Config
              </span>
              <p className="text-xs text-stone-400">
                Specify your active merchant UPI ID for generating scan-to-pay dynamic QR codes.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. merchant@upi"
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-orange-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={async () => {
                    localStorage.setItem("qd_admin_upi_id", upiId.trim());
                    try {
                      await fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ upiId: upiId.trim() }),
                      });
                      addToast(
                        `UPI ID updated to "${upiId.trim()}" in Cloud! Dynamic QR codes will redirect to this merchant.`,
                        "success",
                      );
                    } catch (err) {
                      addToast("Failed to save UPI ID to cloud", "error");
                    }
                  }}
                  className="py-2.5 px-4 bg-stone-850 hover:bg-stone-800 text-stone-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Save UPI ID
                </button>
              </div>
            </div>

            {/* Admin Password Configuration */}
            <div className="border-t border-stone-850 pt-4 mt-2 space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                Security Config
              </span>
              <p className="text-xs text-stone-400">
                Update your Administrator master password to secure your Admin Control Center access.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter new master password"
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-orange-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (newAdminPassword.trim()) {
                      localStorage.setItem("qd_admin_password", newAdminPassword.trim());
                      try {
                        await fetch("/api/settings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ adminPassword: newAdminPassword.trim() }),
                        });
                        addToast("Master password updated in cloud! Only you can access the admin panel now.", "success");
                        setNewAdminPassword("");
                      } catch (err) {
                        addToast("Failed to save password to cloud", "error");
                      }
                    } else {
                      addToast("Please enter a valid password.", "warning");
                    }
                  }}
                  className="py-2.5 px-4 bg-stone-850 hover:bg-stone-800 text-stone-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Save Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE SETUP GUIDE CARD */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] bg-orange-500/10 text-orange-400 font-bold px-2.5 py-1 rounded-full border border-orange-500/20 inline-block uppercase">
              Free Guide Included
            </span>
            <h3 className="text-lg font-bold text-stone-200">
              How to set up Google Sheets
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              We have generated a pre-configured Google Apps Script template
              code inside this app's project root as:
              <span className="block mt-1 font-mono text-[10px] bg-stone-950 p-1.5 rounded border border-stone-850 text-orange-400">
                /google-apps-script.js
              </span>
            </p>
          </div>
          <a
            href="https://script.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-4 py-2.5 px-3 bg-stone-950 border border-stone-850 text-stone-300 hover:text-stone-100 hover:bg-stone-900 text-xs font-semibold rounded-xl flex items-center justify-between transition-all"
          >
            <span>Open Google Apps Script Dashboard</span>
            <ArrowUpRight size={14} className="text-orange-500" />
          </a>
        </div>
      </div>

      {/* DATABASE GRID / TABLE BLOCK */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="font-sans font-bold text-stone-100 text-lg">
              Orders Database Logs
            </h3>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="self-start md:self-center py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-stone-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/5"
          >
            <FileSpreadsheet size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-stone-950 p-3 rounded-xl border border-stone-850">
          {/* Search bar */}
          <div className="sm:col-span-2 relative">
            <Search
              className="absolute left-3 top-3 text-stone-600"
              size={15}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Customer Name, ID, Department, Loc..."
              className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-9 pr-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Service Type Filter */}
          <div className="flex items-center gap-1.5 bg-stone-900 px-2 rounded-lg border border-stone-800">
            <ListFilter size={13} className="text-stone-500" />
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="flex-1 bg-transparent text-xs text-stone-300 focus:outline-none py-1.5"
              aria-label="Filter by Service Type"
            >
              <option value="All">All Services</option>
              <option value="Printing">Printing</option>
              <option value="Stationery">Stationery</option>
              <option value="Binding">Binding</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-stone-900 px-2 rounded-lg border border-stone-800">
            <ListFilter size={13} className="text-stone-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="flex-1 bg-transparent text-xs text-stone-300 focus:outline-none py-1.5"
              aria-label="Filter by Order Status"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>
        </div>

        {/* DATABASE TABLE */}
        {isLoadingOrders ? (
          <div className="py-20 text-center space-y-3">
            <svg
              className="animate-spin h-8 w-8 text-orange-500 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-xs text-stone-400 font-medium">
              Fetching real-time order logs from Google Sheets...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-stone-950 rounded-xl border border-stone-850">
            <Database size={24} className="text-stone-750 mx-auto mb-2" />
            <p className="text-xs font-semibold text-stone-400">
              No orders match your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-850 bg-stone-950">
            <table className="w-full border-collapse text-left text-xs text-stone-300">
              <thead className="bg-stone-900 border-b border-stone-850 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">ID / Time</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Order Specs</th>
                  <th className="p-4 text-center">Status Control</th>
                  <th className="p-4 text-right">Price</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-850">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-stone-900/30 transition-colors"
                  >
                    {/* ID / Time */}
                    <td className="p-4 align-top space-y-1">
                      <span className="font-mono font-bold text-orange-500 text-sm block">
                        {order.id}
                      </span>
                      <span className="text-[10px] text-stone-500 block font-mono">
                        {formatDate(order.timestamp)}
                      </span>
                      <span
                        className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          order.serviceType === "Printing"
                            ? "bg-orange-500/10 text-orange-400 border border-orange-500/25"
                            : order.serviceType === "Stationery"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/25"
                        }`}
                      >
                        {order.serviceType}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="p-4 align-top space-y-1">
                      <p className="font-semibold text-stone-200 text-sm">
                        {order.customerName}
                      </p>
                      <p className="text-stone-400 font-mono text-[11px]">
                        {order.phone}
                      </p>
                      <p className="text-stone-500 font-medium text-[11px]">
                        {order.department}
                      </p>
                      <p
                        className="text-stone-500 text-[11px] leading-tight max-w-[160px] truncate"
                        title={order.deliveryLocation}
                      >
                        📍 {order.deliveryLocation}
                      </p>

                      {/* Payment Badge Info */}
                      <div className="pt-1 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              order.paymentMethod === "Paid Online (UPI)"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-stone-900 text-stone-500 border border-stone-800"
                            }`}
                          >
                            {order.paymentMethod === "Paid Online (UPI)"
                              ? "UPI Online"
                              : "Cash on Delivery"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus =
                                order.paymentStatus === "Paid"
                                  ? "Pending"
                                  : "Paid";
                              handlePaymentStatusChange(order.id, nextStatus);
                            }}
                            title="Click to toggle payment status"
                            className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded transition-all active:scale-[0.97] cursor-pointer ${
                              order.paymentStatus === "Paid"
                                ? "bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black"
                                : order.paymentStatus === "Failed"
                                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20"
                            }`}
                          >
                            {order.paymentStatus || "Pending"} 🔄
                          </button>
                        </div>
                        {order.paymentReference && (
                          <p className="text-[9px] font-mono text-stone-500 leading-none">
                            UTR: {order.paymentReference}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Order Specs */}
                    <td className="p-4 align-top max-w-xs">
                      <p className="text-stone-300 leading-relaxed font-medium text-[11px]">
                        {order.details}
                      </p>
                      {(order.fileName || order.fileUrl) && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {order.fileName && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                              <span className="font-bold text-stone-500">File:</span>
                              <span className="truncate max-w-[180px] text-stone-300 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-850">{order.fileName}</span>
                            </div>
                          )}
                          {order.fileUrl && (
                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                              <a
                                href={order.fileUrl.startsWith('http') ? order.fileUrl : `${window.location.origin}${order.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-[10px] font-bold text-orange-500 border border-orange-500/20 hover:border-orange-500/30 transition-all shadow-sm"
                              >
                                <span>Open File</span>
                                <ArrowUpRight size={11} />
                              </a>
                              <button
                                onClick={() => {
                                  const absUrl = order.fileUrl!.startsWith('http') ? order.fileUrl! : `${window.location.origin}${order.fileUrl}`;
                                  navigator.clipboard.writeText(absUrl);
                                  addToast("Link copied to clipboard!", "success");
                                }}
                                className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10px] font-bold text-stone-300 border border-stone-700 transition-all shadow-sm cursor-pointer"
                                title="Copy direct link to clipboard"
                              >
                                <Copy size={11} />
                                <span>Copy Link</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Control */}
                    <td className="p-4 align-top text-center">
                      <div className="inline-block relative">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(
                              order.id,
                              e.target.value as OrderStatus,
                            )
                          }
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border outline-none text-center cursor-pointer transition-colors ${
                            order.status === "Pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/25 hover:bg-amber-500/20"
                              : order.status === "Processing"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20"
                                : order.status === "Ready"
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25 hover:bg-indigo-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/20"
                          }`}
                          aria-label="Change Order Status"
                        >
                          <option
                            value="Pending"
                            className="bg-stone-900 text-stone-200"
                          >
                            Pending
                          </option>
                          <option
                            value="Processing"
                            className="bg-stone-900 text-stone-200"
                          >
                            Processing
                          </option>
                          <option
                            value="Ready"
                            className="bg-stone-900 text-stone-200"
                          >
                            Ready
                          </option>
                          <option
                            value="Delivered"
                            className="bg-stone-900 text-stone-200"
                          >
                            Delivered
                          </option>
                        </select>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="p-4 align-top text-right font-mono font-bold text-sm text-stone-200">
                      ₹{order.estimatedPrice.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 align-top text-center">
                      <div className="flex items-center justify-center gap-1">
                        {order.status !== "Delivered" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(order.id, "Delivered")
                            }
                            className="p-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
                            title="Mark Delivered"
                            aria-label="Mark order as delivered"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1.5 bg-stone-900 hover:bg-rose-500/10 hover:text-rose-500 text-stone-500 border border-stone-850 rounded-lg transition-all"
                          title="Archive Order"
                          aria-label="Archive or delete order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
