import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  ShoppingBag, 
  Users, 
  Tag, 
  Settings, 
  Plus, 
  Save, 
  Trash, 
  Truck, 
  X, 
  PlusCircle 
} from "lucide-react";
import { Product, Order } from "../types";

interface AdminPanelProps {
  products: Product[];
  onRefreshProducts: () => void;
  onClose: () => void;
}

export default function AdminPanel({ products, onRefreshProducts, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "PRODUCTS" | "ORDERS" | "CMS" | "COUPONS">("ANALYTICS");
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("apnafit_admin_key") || "dev-admin-key");

  // Analytics states
  const [analytics, setAnalytics] = useState<{
    totalSales: number;
    ordersCount: number;
    pendingCount: number;
    shippedCount: number;
    productSales: { name: string; quantity: number; revenue: number }[];
    recentOrders: Order[];
  } | null>(null);

  // Orders states
  const [allOrders, setAllOrders] = useState<Order[]>([]);

  // CMS editable fields
  const [cms, setCms] = useState({
    heroTitle: "Wear Your Identity",
    heroSubtitle: "Explore Series 01",
    philosophyText: "In an era of disposable fashion, APNAFIT stands for permanent relevance. We craft each garment from bespoke 400GSM cotton, treated with gold-ion finishes."
  });

  // Coupons editable fields
  const [allCoupons, setAllCoupons] = useState<{ code: string; discountPercent: number }[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState(20);

  // New product states
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState(699);
  const [newProdGsm, setNewProdGsm] = useState(400);
  const [newProdFabric, setNewProdFabric] = useState("Heavyweight Cotton");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdLongDesc, setNewProdLongDesc] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdSizes, setNewProdSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [newProdStock, setNewProdStock] = useState(10);
  const [newProdCategory, setNewProdCategory] = useState("Heavyweight Tee");

  // Edit stock/price map
  const [editProductStock, setEditProductStock] = useState<Record<string, number>>({});
  const [editProductPrice, setEditProductPrice] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAnalytics();
    fetchOrders();
    fetchCMS();
    fetchCoupons();
  }, []);

  const adminHeaders = () => ({
    "Content-Type": "application/json",
    "x-admin-key": adminKey
  });

  const handleAdminAuthFailure = (res: Response) => {
    if (res.status !== 401) return false;
    const nextKey = prompt("Enter APNAFIT admin key");
    if (nextKey) {
      localStorage.setItem("apnafit_admin_key", nextKey);
      setAdminKey(nextKey);
    }
    return true;
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics", { headers: adminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders", { headers: adminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        const data = await res.json();
        setAllOrders(data);
      }
    } catch (err) {
      console.error("Failed to load orders list", err);
    }
  };

  const fetchCMS = async () => {
    try {
      const res = await fetch("/api/cms");
      if (res.ok) {
        const data = await res.json();
        setCms(data);
      }
    } catch (err) {
      console.error("Failed to load CMS values", err);
    }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/admin/coupons", { headers: adminHeaders() });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        const data = await res.json();
        setAllCoupons(data);
      }
    } catch (err) {
      console.error("Failed to load active coupons", err);
    }
  };

  // Create Product handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdGsm) {
      alert("Please provide Product Name, Price, and fabric GSM");
      return;
    }

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          name: newProdName,
          price: Number(newProdPrice),
          gsm: Number(newProdGsm),
          fabric: newProdFabric,
          description: newProdDesc,
          longDescription: newProdLongDesc,
          image: newProdImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuAzJPrFJh4ow7QFQoT2EpgfP8UZU4_TOtjRvGaatZkaCQZQPg1BzgjjJfp0agPs7Js2LbaWafQ7OuaffiYvLo6KnmYvCbIJXZt2Lal605axA60F3IMVOvyd-WO3iMQAzanOgGPL_l2yYUVZtld4TDHHLYnQvVi6kEQYeOy9UdIBdOKDpOtJRRFrscNEJEueeCmpLjdL15YEmyfUhCgB9l4dMPvDsbaaK9_98dUTtR07_5TARL2WcqKEZifJS97iySxpSAiyge6KBfU",
          sizes: newProdSizes,
          stock: Number(newProdStock),
          category: newProdCategory
        })
      });

      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        alert("Apparel design registered into product index!");
        onRefreshProducts();
        // Reset states
        setNewProdName("");
        setNewProdDesc("");
        setNewProdLongDesc("");
        setNewProdImage("");
      }
    } catch {
      alert("Failed to submit new product.");
    }
  };

  // Save modified product Stock / Price changes
  const handleUpdateProduct = async (productId: string) => {
    const updatedStock = editProductStock[productId];
    const updatedPrice = editProductPrice[productId];

    if (updatedStock === undefined && updatedPrice === undefined) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({
          stock: updatedStock,
          price: updatedPrice
        })
      });

      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        alert("Apparel attributes updated!");
        onRefreshProducts();
      }
    } catch {
      alert("Failed to sync apparel update.");
    }
  };

  // Delete product Record
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this design template from the catalog?")) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        headers: { "x-admin-key": adminKey },
        method: "DELETE"
      });

      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        alert("Template successfully deleted.");
        onRefreshProducts();
      }
    } catch {
      alert("Failed deleting design template.");
    }
  };

  // Translate Order Statuses
  const handleTransitionOrder = async (orderId: string, currentStatus: string) => {
    let nextStatus = "PREPARING";
    if (currentStatus === "PREPARING") nextStatus = "SHIPPED";
    else if (currentStatus === "SHIPPED") nextStatus = "DELIVERED";

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ orderStatus: nextStatus })
      });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        alert(`Order ${orderId} status changed to ${nextStatus}!`);
        fetchOrders();
        fetchAnalytics();
      }
    } catch {
      alert("Failed to update status on remote network.");
    }
  };

  // Save Brand Content CMS updates
  const handleSaveCMS = async () => {
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(cms)
      });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        alert("Brand philosophy guidelines updated. Refresh page to inspect.");
      }
    } catch {
      alert("Error saving CMS data.");
    }
  };

  // Manage Coupons
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ code: newCouponCode, discountPercent: newCouponDiscount })
      });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        alert("Promotional coupon ledger updated!");
        setNewCouponCode("");
        fetchCoupons();
      }
    } catch {
      alert("Failed to generate code ledger.");
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    try {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, {
        headers: { "x-admin-key": adminKey },
        method: "DELETE"
      });
      if (handleAdminAuthFailure(res)) return;
      if (res.ok) {
        fetchCoupons();
      }
    } catch {
      alert("Gateway error deleting coupon index.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto font-body-md text-on-surface flex flex-col p-4 sm:p-8 md:p-12">
      
      {/* Header and Close */}
      <div className="flex justify-between items-center pb-6 border-b border-outline-variant/20 mb-8">
        <div>
          <h1 className="font-display-lg text-2xl sm:text-3xl text-secondary tracking-widest uppercase">
            ADMINISTRATOR DIRECTORY
          </h1>
          <p className="text-xs text-outline tracking-wider uppercase mt-1">APNAFIT Core Ledger Management Platform</p>
        </div>
        <button 
          onClick={onClose}
          className="p-3 border border-outline-variant hover:border-secondary text-outline hover:text-secondary rounded transition-colors flex items-center gap-2 text-xs font-label-caps uppercase"
        >
          <X className="w-4 h-4" />
          <span>Exit Ledger</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2 flex flex-col justify-start">
          <button
            onClick={() => setActiveTab("ANALYTICS")}
            className={`w-full py-4 px-4 text-left font-label-caps text-xs uppercase tracking-wider flex items-center gap-3 rounded border transition-all ${
              activeTab === "ANALYTICS"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-outline-variant/10 hover:border-outline/30 text-outline-variant hover:text-on-surface"
            }`}
          >
            <BarChart className="w-4 h-4" />
            Financial Analytics
          </button>
          
          <button
            onClick={() => setActiveTab("PRODUCTS")}
            className={`w-full py-4 px-4 text-left font-label-caps text-xs uppercase tracking-wider flex items-center gap-3 rounded border transition-all ${
              activeTab === "PRODUCTS"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-outline-variant/10 hover:border-outline/30 text-outline-variant hover:text-on-surface"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Apparel Catalog Editor
          </button>

          <button
            onClick={() => setActiveTab("ORDERS")}
            className={`w-full py-4 px-4 text-left font-label-caps text-xs uppercase tracking-wider flex items-center gap-3 rounded border transition-all ${
              activeTab === "ORDERS"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-outline-variant/10 hover:border-outline/30 text-outline-variant hover:text-on-surface"
            }`}
          >
            <Users className="w-4 h-4" />
            Active Client Orders ({allOrders.length})
          </button>

          <button
            onClick={() => setActiveTab("COUPONS")}
            className={`w-full py-4 px-4 text-left font-label-caps text-xs uppercase tracking-wider flex items-center gap-3 rounded border transition-all ${
              activeTab === "COUPONS"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-outline-variant/10 hover:border-outline/30 text-outline-variant hover:text-on-surface"
            }`}
          >
            <Tag className="w-4 h-4" />
            Promo Coupons Ledgers
          </button>

          <button
            onClick={() => setActiveTab("CMS")}
            className={`w-full py-4 px-4 text-left font-label-caps text-xs uppercase tracking-wider flex items-center gap-3 rounded border transition-all ${
              activeTab === "CMS"
                ? "border-secondary bg-secondary/5 text-secondary"
                : "border-outline-variant/10 hover:border-outline/30 text-outline-variant hover:text-on-surface"
            }`}
          >
            <Settings className="w-4 h-4" />
            Copywriting & Narrative
          </button>
        </div>


        {/* Content Pane */}
        <div className="lg:col-span-9 bg-surface-container/30 border border-outline-variant/20 rounded p-6 sm:p-8 space-y-6">
          
          {/* ANALYTICS TAB */}
          {activeTab === "ANALYTICS" && analytics && (
            <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
              <h2 className="text-sm font-label-caps text-secondary font-bold uppercase tracking-widest pl-2 border-l-2 border-secondary">
                APNAFIT CORE ACCOUNTING LEDGER
              </h2>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 bg-background rounded border border-outline-variant/10">
                  <p className="text-[10px] font-label-caps text-outline tracking-wider uppercase mb-1">TOTAL SALES REVENUE</p>
                  <p className="text-3xl font-bold font-mono text-secondary">₹{analytics.totalSales.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-6 bg-background rounded border border-outline-variant/10">
                  <p className="text-[10px] font-label-caps text-outline tracking-wider uppercase mb-1">ORDERS INGESTED</p>
                  <p className="text-3xl font-bold font-mono">{analytics.ordersCount}</p>
                </div>
                <div className="p-6 bg-background rounded border border-outline-variant/10">
                  <p className="text-[10px] font-label-caps text-outline tracking-wider uppercase mb-1">PENDING FOR WAREHOUSE</p>
                  <p className="text-3xl font-bold font-mono text-error">{analytics.pendingCount}</p>
                </div>
                <div className="p-6 bg-background rounded border border-outline-variant/10 sm:col-span-3">
                  <p className="text-[10px] font-label-caps text-outline tracking-wider uppercase mb-1">SHIPPED ORDERS</p>
                  <p className="text-3xl font-bold font-mono text-secondary">{analytics.shippedCount}</p>
                </div>
              </div>

              {/* Product Revenue Table */}
              <div className="space-y-4">
                <h3 className="text-xs font-label-caps uppercase tracking-wider text-outline">Product Demand Mapping</h3>
                <div className="border border-outline-variant/15 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-background border-b border-outline-variant/20 text-outline">
                        <th className="p-4 uppercase">Apparel Model</th>
                        <th className="p-4 uppercase">Units sold</th>
                        <th className="p-4 uppercase">Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {analytics.productSales.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-outline">No sales metrics recorded yet.</td>
                        </tr>
                      ) : (
                        analytics.productSales.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="p-4 font-semibold text-on-surface uppercase">{item.name}</td>
                            <td className="p-4 font-mono">{item.quantity}</td>
                            <td className="p-4 font-mono text-secondary">₹{item.revenue.toLocaleString("en-IN")}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS EDITING MANAGER TAB */}
          {activeTab === "PRODUCTS" && (
            <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
              
              {/* Product registers */}
              <form onSubmit={handleCreateProduct} className="p-6 bg-background border border-outline-variant/20 rounded space-y-4">
                <div className="flex gap-2 items-center text-secondary mb-2">
                  <PlusCircle className="w-5 h-5" />
                  <h3 className="text-sm font-label-caps tracking-widest uppercase font-semibold">Register New Luxury Template</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Apparel Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bone Minimalist"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Price (in INR) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 9900"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(Number(e.target.value))}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Weight (GSM value) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 400"
                      value={newProdGsm}
                      onChange={(e) => setNewProdGsm(Number(e.target.value))}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Fabric weave construct</label>
                    <input
                      type="text"
                      placeholder="e.g. Heavyweight 100% Cotton"
                      value={newProdFabric}
                      onChange={(e) => setNewProdFabric(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Apparel Image URL</label>
                    <input
                      type="text"
                      placeholder="Paste high-res model image link"
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Short Pitch</label>
                    <input
                      type="text"
                      placeholder="Bespoke 400GSM cotton in warm bone layout..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-outline uppercase font-label-caps">Total Warehouse Stock</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(Number(e.target.value))}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-secondary text-on-secondary font-label-caps text-xs uppercase tracking-[0.15em] rounded transition-transform font-bold"
                >
                  Create design template
                </button>
              </form>

              {/* Product edit table list */}
              <div className="space-y-4">
                <h3 className="text-xs font-label-caps text-outline uppercase tracking-wider">Active Design Catalog templates</h3>
                <div className="border border-outline-variant/15 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-background border-b border-outline-variant/20 text-outline">
                        <th className="p-4 uppercase">Design</th>
                        <th className="p-4 uppercase">Pricing (INR)</th>
                        <th className="p-4 uppercase">Stock Units</th>
                        <th className="p-4 uppercase">GSM weight</th>
                        <th className="p-2 uppercase text-center">Save</th>
                        <th className="p-2 uppercase text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.01]">
                          <td className="p-4 font-semibold uppercase flex items-center gap-3">
                            <img src={p.image} className="w-10 h-12 object-cover rounded" />
                            <span>{p.name}</span>
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              defaultValue={p.price}
                              onChange={(e) => setEditProductPrice({ ...editProductPrice, [p.id]: Number(e.target.value) })}
                              className="w-20 bg-background border border-outline-variant/20 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              type="number"
                              defaultValue={p.stock}
                              onChange={(e) => setEditProductStock({ ...editProductStock, [p.id]: Number(e.target.value) })}
                              className="w-16 bg-background border border-outline-variant/20 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-4 font-mono">{p.gsm}GSM</td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleUpdateProduct(p.id)}
                              className="p-1.5 border border-secondary/40 text-secondary hover:bg-secondary/10 rounded transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 border border-error/40 text-error hover:bg-error/10 rounded transition-all"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* ACTIVE CLIENT ORDERS TAB */}
          {activeTab === "ORDERS" && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              <h3 className="text-xs font-label-caps text-outline uppercase tracking-wider pl-2 border-l-2 border-secondary">
                WAREHOUSE ORDER DIRECTORY
              </h3>

              <div className="space-y-4">
                {allOrders.length === 0 ? (
                  <p className="text-sm text-outline p-6 text-center">No orders have entered the ledger databases yet.</p>
                ) : (
                  allOrders.map((ord) => (
                    <div key={ord.id} className="p-5 bg-background border border-outline-variant/10 rounded space-y-4 text-xs">
                      <div className="flex flex-wrap justify-between items-center border-b border-outline-variant/10 pb-3 gap-2">
                        <div>
                          <span className="text-secondary font-bold text-sm tracking-wider font-mono uppercase">{ord.id}</span>
                          <span className="text-[10px] text-outline ml-4 uppercase">Ingested: {new Date(ord.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ord.orderStatus === "DELIVERED"
                              ? "bg-secondary-fixed-dim/10 text-secondary-fixed-dim border border-secondary/20"
                              : ord.orderStatus === "SHIPPED"
                              ? "bg-primary-fixed/10 text-primary-fixed border"
                              : "bg-error-container/15 text-error border border-error/20"
                          }`}>
                            {ord.orderStatus}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-outline uppercase font-label-caps">Shipping Recipient</p>
                          <p className="text-on-surface font-semibold text-sm">{ord.shippingAddress.fullName}</p>
                          <p className="text-on-surface-variant leading-relaxed">
                            {ord.shippingAddress.addressLine1}, {ord.shippingAddress.city}, {ord.shippingAddress.postalCode}<br />
                            Ph: {ord.shippingAddress.phone} | {ord.shippingAddress.email}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-outline uppercase font-label-caps">Order Items</p>
                          {ord.items.map((it, idx) => (
                            <p key={idx} className="text-on-surface">
                              - <span className="font-semibold uppercase">{it.name}</span> (Size: {it.size}) × {it.quantity}
                            </p>
                          ))}
                          <div className="h-[1px] bg-outline-variant/10 my-1" />
                          <p className="text-on-surface leading-normal text-sm">
                            Aggregate: <strong className="text-secondary">₹{ord.totalAmount.toLocaleString("en-IN")}</strong> via {ord.paymentMethod}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/10 flex justify-between items-center flex-wrap gap-2">
                        <span className="font-mono text-[10px] text-outline">
                          VPA/Txn: {ord.paymentDetails?.transactionId || "MANUAL_ENTRY"}
                        </span>
                        
                        {ord.orderStatus !== "DELIVERED" && (
                          <button
                            onClick={() => handleTransitionOrder(ord.id, ord.orderStatus)}
                            className="px-4 py-2 bg-secondary text-on-secondary text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5 text-on-secondary" />
                            {ord.orderStatus === "PREPARING" ? "Transition to SHIPPED" : "Transition to DELIVERED"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}


          {/* PROMO COUPONS LEDGERS */}
          {activeTab === "COUPONS" && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              <form onSubmit={handleCreateCoupon} className="p-4 bg-background border border-outline-variant/20 rounded flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] text-outline uppercase font-label-caps">Coupon code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ULTRA50"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-outline uppercase font-label-caps">Discount % *</label>
                  <input
                    type="number"
                    max={100}
                    min={1}
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="bg-surface-container border border-outline-variant/20 rounded px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-secondary text-on-secondary font-label-caps text-xs uppercase rounded"
                >
                  Generate Coupon
                </button>
              </form>

              <div className="border border-outline-variant/15 rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-background border-b border-outline-variant/20 text-outline">
                      <th className="p-4 uppercase">Coupon Identifier</th>
                      <th className="p-4 uppercase">Percentage Discount</th>
                      <th className="p-4 uppercase text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCoupons.map((c) => (
                      <tr key={c.code} className="hover:bg-white/[0.01]">
                        <td className="p-4 font-mono font-bold text-secondary uppercase">{c.code}</td>
                        <td className="p-4">{c.discountPercent}%</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteCoupon(c.code)}
                            className="p-1 text-error hover:bg-error/5 border border-error/20 rounded"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* CMS BRAND TEXT MANAGEMENT TAB */}
          {activeTab === "CMS" && (
            <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
              <h3 className="text-xs font-label-caps text-outline uppercase tracking-wider pl-2 border-l-2 border-secondary">
                BRAND GRAPHIC IDENTITY COPYWRITING
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-outline uppercase font-label-caps">Main Hero Headline</label>
                  <input
                    type="text"
                    value={cms.heroTitle}
                    onChange={(e) => setCms({ ...cms, heroTitle: e.target.value })}
                    className="w-full bg-background border border-outline-variant/25 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-outline uppercase font-label-caps">Hero Subtitle CTA Button</label>
                  <input
                    type="text"
                    value={cms.heroSubtitle}
                    onChange={(e) => setCms({ ...cms, heroSubtitle: e.target.value })}
                    className="w-full bg-background border border-outline-variant/25 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-outline uppercase font-label-caps">Philosophical Narrative copy</label>
                  <textarea
                    rows={4}
                    value={cms.philosophyText}
                    onChange={(e) => setCms({ ...cms, philosophyText: e.target.value })}
                    className="w-full bg-background border border-outline-variant/25 rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                </div>

                <button
                  onClick={handleSaveCMS}
                  className="px-6 py-3 bg-secondary text-on-secondary font-label-caps text-xs uppercase tracking-[0.15em] rounded transition-transform font-bold"
                >
                  Save narrative guidelines
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
