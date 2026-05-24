import crypto from "crypto";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "dev-admin-key";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database file path
const DB_FILE = path.join(process.cwd(), "db.json");

// Expose static directory for anti-gravity pre-rendered frame assets
app.use("/final_frame", express.static(path.join(process.cwd(), "final_frame")));

// Helper to initialize or read db.json
function getDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (e) {
      console.error("Error reading database file, resetting", e);
    }
  }

  // Initial Seed Data
  const initialData = {
    products: [
      {
        id: "prod-001",
        name: "Bone Minimalist",
        price: 9900, // In INR (e.g., ₹9,900)
        currency: "INR",
        gsm: 400,
        fabric: "Heavyweight 100% Cotton",
        description: "Bespoke 400GSM cotton in a warm bone off-white layout. Premium minimal embroidery at the left crest.",
        longDescription: "The absolute standard of rugged luxury streetwear. Formulated with a structural oversized collar, customized dropped shoulder drape, and reinforced double-needle stitched seams. Preshrunk and enhanced with gold-ion dust finishing.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0LjigyUqFqUMhszKwl26dxTk8q6x3GFUFtvY8xyHWldmmxQeOXyMKBVx4KxR8JfIBzWhlwdYy27ZlQcO07iZ3PmtF6ySerOT0pVMEQ2dWq9qxOKeEu0eev_cv5X5y55VhgFeQlBIYOKTHgthV0evbBKndyXgsjEqi2DsWG8UqD4fPscSj4wMHMRyZI-xtq0Ib92loNi71H_cW0mHPA1pWv4IBGcy7Gk_Fx4BUge3R2HowscYG48GYvhwKMVD6Ze1-a8YVYn4gyvg",
        sizes: ["S", "M", "L", "XL"],
        stock: 12,
        rating: 4.9,
        category: "Heavyweight Tee",
        features: ["400GSM Heavyweight cotton", "Oversized structural fit", "Gold-ion yarn coating", "Clean Bone shade"]
      },
      {
        id: "prod-002",
        name: "Obsidian Gold",
        price: 11900,
        currency: "INR",
        gsm: 420,
        fabric: "Interlock French Terry",
        description: "Midnight deep black canvas showcasing an embossed gold-foil geometric collar and sleeve insignia.",
        longDescription: "Engineered specifically to demand absolute attention without making a sound. Features high-density metallic weave on heavy 420GSM luxury French Terry cotton, granting an rich matte structure and smooth thermal breathing.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCEQOYPc9CwKelOQRVh0AKSjdBhyapoMlBz34Ovau0-fMl1HM718kv-564vB4fNr7KhsQ2O15gKj5QXXM4aDcjGgCgo5LO8KVRQo_nPae54Cfgcrv0jSpO40x2Kc5s55ekQFDyVuuEbW2FrTAbFyiYv-Rit7xmRxnKSW39L-mc8EYsFwHa71qDPZS9o_sXycBKmai9DDi1DjSjE9_YTGpcT9RJPijDPxEuoTkTs3w74x7RNKDXJtqOU_2rlaDI9ywkMrgsRQkQ7chY",
        sizes: ["S", "M", "L"],
        stock: 8,
        rating: 5.0,
        category: "Metallic Luxe",
        features: ["420GSM Luxury Terry", "Metallic Gold insignia", "Seamless shoulder drape", "Matte Black premium tone"]
      },
      {
        id: "prod-003",
        name: "Desert Sage",
        price: 9900,
        currency: "INR",
        gsm: 400,
        fabric: "Organic Heavyweight Pique",
        description: "An elegant, muted sage-green layout providing a tranquil, architectural drape with drop-shoulder silhouette.",
        longDescription: "The definitive minimal wardrobe anchor. Ethically-harvested organic desert pique weave, granting subtle physical texture while showcasing exceptional breathability. Embossed tone-on-tone stamp at the lower hem.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAS4wnWjNFdlfDF6CCJNh4upaKC9JXGJmLyDi26WTxUklpFh2GMz9u6U1kdmwHWSHAPvbK_C52dBiFxjtFLFoN38LwVSUpt13jgm6pT18OcqYNCpvFYXfn_18CciiMKiRFAC8XGWGg0rJUUc46XNbNcQFHGTVMXHKZvJR7F0mCuIp_M1j3xqTiXygC1tMeLBDwMqQkQNtSJq1gpvRrmEBZOeA4xOMdp_x_QvjLlUHDaZ_j7s-fzjxQYhTA-_pn9CAoMAACJAHjiE1E",
        sizes: ["M", "L", "XL"],
        stock: 15,
        rating: 4.8,
        category: "Heavyweight Tee",
        features: ["400GSM Organic Pique", "Architectural drape construct", "Desert Sage dye process", "Signature debossed hem stamp"]
      },
      {
        id: "prod-004",
        name: "Shadow Stealth",
        price: 12900,
        currency: "INR",
        gsm: 450,
        fabric: "Double Face Premium Cotton",
        description: "Double-layered structured streetwear tee in signature charcoal obsidian with invisible zipper side seam pockets.",
        longDescription: "A monumental achievement in practical fashion. Seamless side slits containing micro-zipper utility structures embedded in ultra-heavy 450GSM double-faced cotton. Perfect for streamlined, modular outfits.",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-Evnd4oyFSHMVTTeKka1-3PUPfd0_dp5_txY5tplMcivgu2HJVBdF4_uQi7sto_z9RZQB7SBzUWS9pz6Zxv3s4YBNBJ0CapsBHGyl9lpixik0FMrKlpuumUJQe0Rn0iykMYpC7EOglorfyLMnKUhs8-ghweKnX2uGOEU-75tkodoWlv5S5fNm5XxRafRXnDmVrO3nnfPoakdqMHjhsj9-DEdd1E960mTJHKnrKHUPuJYWZFZVezj6Hew-fm0QVjSCFAdt-dLuPkw",
        sizes: ["S", "M", "L", "XL"],
        stock: 5,
        rating: 4.9,
        category: "Tactical Luxe",
        features: ["450GSM Double Faced Cotton", "Invisible technical zipper slots", "Oversized drop-neck trim", "Structured structural drape"]
      }
    ],
    orders: [],
    reviews: [
      {
        id: "rev-1",
        productId: "prod-001",
        userId: "user-1",
        userName: "Aarav Mehta",
        rating: 5,
        comment: "This is easily the thickest and most structured t-shirt I own. The collar holds its shape perfectly even after multiple washes. The bone white color is stunning.",
        createdAt: "2026-05-18T14:22:00Z"
      },
      {
        id: "rev-2",
        productId: "prod-002",
        userId: "user-2",
        userName: "Karan Johar",
        rating: 5,
        comment: "Premium materials indeed, the gold embossing shines beautifully in ambient light. Worth every single rupee. A masterpiece.",
        createdAt: "2026-05-19T09:15:00Z"
      }
    ],
    coupons: [],
    users: [
      {
        id: "user-admin",
        name: "APNAFIT Director",
        email: "admin@apnafit.com",
        role: "ADMIN"
      }
    ],
    cms: {
      heroTitle: "Wear Your Identity",
      heroSubtitle: "Explore Series 01",
      philosophyText: "In an era of disposable fashion, APNAFIT stands for permanent relevance. We craft each garment from bespoke 400GSM cotton, treated with gold-ion finishes."
    }
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  return initialData;
}

function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function generateSecureCoupon(length = 16) {
  return crypto.randomBytes(length).toString("hex").toUpperCase();
}

function hashCoupon(code: string) {
  return crypto
    .createHash("sha256")
    .update(code.trim().toUpperCase())
    .digest("hex");
}

const db = getDB();

function getUpiConfig() {
  const hasExplicitUpi = Boolean(process.env.UPI_ID && process.env.UPI_MERCHANT_NAME);
  return {
    upiId: process.env.UPI_ID || "apnafit@paytm",
    merchantName: process.env.UPI_MERCHANT_NAME || "APNAFIT LABS",
    configured: hasExplicitUpi
  };
}

function getGmailConfig() {
  return {
    from: process.env.GMAIL_FROM || "",
    to: process.env.GMAIL_TO || process.env.GMAIL_FROM || "",
    accessToken: process.env.GMAIL_ACCESS_TOKEN || ""
  };
}

function createRawEmail(to: string, from: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendGmailNotification(subject: string, body: string) {
  const gmail = getGmailConfig();
  if (!gmail.from || !gmail.to || !gmail.accessToken) {
    console.log(`[gmail:skipped] ${subject}\n${body}`);
    return {
      configured: false,
      sent: false,
      reason: "Gmail credentials missing. Set GMAIL_FROM, GMAIL_TO, and GMAIL_ACCESS_TOKEN."
    };
  }

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gmail.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: createRawEmail(gmail.to, gmail.from, subject, body)
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API rejected notification: ${error}`);
  }

  return {
    configured: true,
    sent: true,
    id: (await response.json()).id
  };
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const providedKey = req.get("x-admin-key");
  if (!providedKey || providedKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: "Admin authorization required" });
  }
  next();
}

function asPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function asNonNegativeInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function asPositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFeatures(features: unknown) {
  if (Array.isArray(features)) {
    return features.map((f) => String(f).trim()).filter(Boolean);
  }
  return [];
}

function normalizeSizes(sizes: unknown) {
  if (Array.isArray(sizes)) {
    const clean = sizes.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
    return clean.length > 0 ? Array.from(new Set(clean)) : ["S", "M", "L", "XL"];
  }
  return ["S", "M", "L", "XL"];
}

function normalizeImages(images: unknown, fallbackImage: string) {
  const clean = Array.isArray(images)
    ? images.map((src) => String(src).trim()).filter(Boolean)
    : [];
  return Array.from(new Set([fallbackImage, ...clean].filter(Boolean)));
}

async function buildOrderFromPayload(reqBody: any) {
  dbRefresh();
  const { shippingAddress, items, paymentMethod, transactionId, upiId, couponCode } = reqBody;

  if (!shippingAddress || !Array.isArray(items) || items.length === 0) {
    return { error: "Missing order components" };
  }

  const requiredAddressFields = ["fullName", "email", "phone", "addressLine1", "city", "postalCode"];
  for (const field of requiredAddressFields) {
    if (!String(shippingAddress[field] || "").trim()) {
      return { error: `Missing shipping field: ${field}` };
    }
  }

  if (!["UPI_QR", "UPI_INTENT"].includes(paymentMethod)) {
    return { error: "Unsupported payment method" };
  }

  const updatedProducts = [...db.products];
  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const quantity = asPositiveInteger(item.quantity);
    if (!quantity) return { error: "Invalid item quantity" };

    const product = updatedProducts.find((p: any) => p.id === item.productId);
    if (!product) return { error: `Unknown product: ${item.productId}` };

    const size = String(item.size || "").trim().toUpperCase();
    if (!product.sizes.includes(size)) {
      return { error: `Invalid size ${size || "(empty)"} for ${product.name}` };
    }

    if (product.stock < quantity) {
      return { error: `Not enough stock for ${product.name}` };
    }

    product.stock -= quantity;
    subtotal += product.price * quantity;
    normalizedItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      size
    });
  }

  let discountPercent = 0;

const normalizedCoupon = String(couponCode || "")
  .trim()
  .toUpperCase();

if (normalizedCoupon) {

  const hashedInput = hashCoupon(normalizedCoupon);

  const coupon = db.coupons.find((c: any) => {
    return (
      c.codeHash === hashedInput &&
      c.isActive === true &&
      c.isUsed === false &&
      new Date(c.expiresAt).getTime() > Date.now()
    );
  });

  if (!coupon) {
    return { error: "Invalid or expired coupon" };
  }

  discountPercent = Number(coupon.discountPercent) || 0;

  // Mark used instantly
  coupon.isUsed = true;
}

  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const totalAmount = Math.max(0, subtotal - discountAmount);

  return {
    updatedProducts,
    order: {
      id: `ORD-${Math.floor(Math.random() * 90000 + 10000)}`,
      userId: "guest",
      shippingAddress: {
        fullName: String(shippingAddress.fullName).trim(),
        email: String(shippingAddress.email).trim(),
        phone: String(shippingAddress.phone).trim(),
        addressLine1: String(shippingAddress.addressLine1).trim(),
        addressLine2: String(shippingAddress.addressLine2 || "").trim(),
        city: String(shippingAddress.city).trim(),
        state: String(shippingAddress.state || "Delhi").trim(),
        postalCode: String(shippingAddress.postalCode).trim()
      },
      items: normalizedItems,
      subtotal,
      discountPercent,
      couponCode: normalizedCoupon || null,
      totalAmount,
      paymentMethod,
      paymentDetails: {
        upiId: upiId || getUpiConfig().upiId,
        transactionId: transactionId || `TXN-${Date.now()}`
      },
      paymentStatus: "SUCCESS",
      orderStatus: "PREPARING",
      createdAt: new Date().toISOString()
    }
  };
}

// Setup Lazy-Initialized server side Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Ensure database folders or keys exist safely on memory
function dbRefresh() {
  const current = getDB();
  db.products = (current.products || []).map((product: any) => ({
    ...product,
    images: normalizeImages(product.images, product.image)
  }));
  db.orders = current.orders || [];
  db.reviews = current.reviews || [];
  db.coupons = current.coupons || [];
  db.users = current.users || [];
  db.cms = current.cms || {};
}


// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

app.get("/api/integrations/status", (req, res) => {
  const upi = getUpiConfig();
  const gmail = getGmailConfig();
  res.json({
    upi: {
      configured: upi.configured,
      upiId: upi.upiId,
      merchantName: upi.merchantName
    },
    gmail: {
      configured: Boolean(gmail.from && gmail.to && gmail.accessToken),
      from: gmail.from || null,
      to: gmail.to || null
    }
  });
});

app.get("/api/admin/status", requireAdmin, (req, res) => {
  res.json({ authorized: true });
});

// Products API
app.get("/api/products", (req, res) => {
  dbRefresh();
  res.json(db.products);
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, price, gsm, fabric, description, longDescription, image, images, sizes, stock, category, features } = req.body;
  const parsedPrice = asPositiveNumber(price);
  const parsedGsm = asPositiveInteger(gsm);
  const parsedStock = asNonNegativeInteger(stock !== undefined ? stock : 10);

  if (!String(name || "").trim() || !parsedPrice || !parsedGsm || parsedStock === null) {
    return res.status(400).json({ error: "Missing required product fields" });
  }

  const productImage = image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAzJPrFJh4ow7QFQoT2EpgfP8UZU4_TOtjRvGaatZkaCQZQPg1BzgjjJfp0agPs7Js2LbaWafQ7OuaffiYvLo6KnmYvCbIJXZt2Lal605axA60F3IMVOvyd-WO3iMQAzanOgGPL_l2yYUVZtld4TDHHLYnQvVi6kEQYeOy9UdIBdOKDpOtJRRFrscNEJEueeCmpLjdL15YEmyfUhCgB9l4dMPvDsbaaK9_98dUTtR07_5TARL2WcqKEZifJS97iySxpSAiyge6KBfU";

  const newProduct = {
    id: `prod-${Date.now()}`,
    name: String(name).trim(),
    price: parsedPrice,
    currency: "INR",
    gsm: parsedGsm,
    fabric: fabric || "Heavyweight Cotton",
    description: description || "",
    longDescription: longDescription || "",
    image: productImage,
    images: normalizeImages(images, productImage),
    sizes: normalizeSizes(sizes),
    stock: parsedStock,
    rating: 5.0,
    category: category || "Heavyweight Tee",
    features: normalizeFeatures(features)
  };

  db.products.push(newProduct);
  saveDB(db);
  res.json({ success: true, product: newProduct });
});

// Edit Product
app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = db.products.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const nextPrice = req.body.price !== undefined ? asPositiveNumber(req.body.price) : db.products[index].price;
  const nextGsm = req.body.gsm !== undefined ? asPositiveInteger(req.body.gsm) : db.products[index].gsm;
  const nextStock = req.body.stock !== undefined ? asNonNegativeInteger(req.body.stock) : db.products[index].stock;

  if (!nextPrice || !nextGsm || nextStock === null) {
    return res.status(400).json({ error: "Invalid product numeric fields" });
  }

  db.products[index] = {
    ...db.products[index],
    ...req.body,
    price: nextPrice,
    gsm: nextGsm,
    stock: nextStock,
    sizes: req.body.sizes ? normalizeSizes(req.body.sizes) : db.products[index].sizes,
    features: req.body.features ? normalizeFeatures(req.body.features) : db.products[index].features,
    images: req.body.images ? normalizeImages(req.body.images, req.body.image || db.products[index].image) : db.products[index].images
  };

  saveDB(db);
  res.json({ success: true, product: db.products[index] });
});

// Delete Product
app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const index = db.products.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  db.products.splice(index, 1);
  saveDB(db);
  res.json({ success: true });
});

// CMS Content Management
app.get("/api/cms", (req, res) => {
  res.json(db.cms || {});
});

app.post("/api/admin/cms", requireAdmin, (req, res) => {
  db.cms = {
    ...db.cms,
    ...req.body
  };
  saveDB(db);
  res.json({ success: true, cms: db.cms });
});

// Reviews API
app.get("/api/reviews/:productId", (req, res) => {
  dbRefresh();
  const productReviews = db.reviews.filter((r: any) => r.productId === req.params.productId);
  res.json(productReviews);
});

app.post("/api/reviews", (req, res) => {
  const { productId, userName, rating, comment } = req.body;
  if (!productId || !rating || !comment) {
    return res.status(400).json({ error: "Missing review fields" });
  }

  const newReview = {
    id: `rev-${Date.now()}`,
    productId,
    userId: `user-${Date.now()}`,
    userName: userName || "Anonymous Cultist",
    rating: Number(rating),
    comment,
    createdAt: new Date().toISOString()
  };

  db.reviews.push(newReview);
  saveDB(db);
  res.json({ success: true, review: newReview });
});

// UPI Payment & QR Generator Deep Link Simulator
// Generates accurate standard compliant UPI links and dynamic states
app.post("/api/payment/generate-qr", (req, res) => {
  const { amount, phone, name } = req.body;
  const parsedAmount = asPositiveNumber(amount);
  if (!parsedAmount) {
    return res.status(400).json({ error: "Amount required for UPI code" });
  }

  const transactionId = `TXN-${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
  
  // Format Indian standard UPI Deep Links for dynamic scanners
  // pa = Payment Address (UPI ID)
  // pn = Payee Name
  // am = Amount
  // cu = Currency
  // tn = Transaction Note
  // tr = Reference ID / Merchant transaction reference
  const { upiId, merchantName } = getUpiConfig();
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${parsedAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`APNAFIT Brand Purchase ${transactionId}`)}&tr=${transactionId}`;

  res.json({
    transactionId,
    upiUrl,
    upiId,
    merchantName,
    qrCodeMockUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`,
    amount: parsedAmount,
    expiresInSeconds: 300
  });
});

app.post("/api/newsletter/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const gmail = await sendGmailNotification(
      "APNAFIT archive subscription",
      `New archive subscription request:\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`
    );

    res.json({ success: true, gmail });
  } catch (error: any) {
    console.error("Newsletter Gmail notification failed", error);
    res.status(502).json({ error: error.message || "Gmail notification failed" });
  }
});

// Simulate Order placement
app.post("/api/orders", async (req, res) => {
  const built = await buildOrderFromPayload(req.body);
  if ("error" in built) return res.status(400).json({ error: built.error });

  const newOrder = built.order;

  db.products = built.updatedProducts;
  db.orders.push(newOrder);
  saveDB(db);

  let gmailStatus: any = null;
  try {
    gmailStatus = await sendGmailNotification(
      `APNAFIT order ${newOrder.id}`,
      [
        `Order: ${newOrder.id}`,
        `Customer: ${newOrder.shippingAddress.fullName}`,
        `Email: ${newOrder.shippingAddress.email}`,
        `Phone: ${newOrder.shippingAddress.phone}`,
        `Amount: INR ${newOrder.totalAmount}`,
        `Payment: ${newOrder.paymentMethod}`,
        `Transaction: ${newOrder.paymentDetails.transactionId}`,
        "",
        "Items:",
        ...newOrder.items.map((item: any) => `- ${item.name} / ${item.size} x ${item.quantity}`)
      ].join("\n")
    );
  } catch (error) {
    console.error("Order Gmail notification failed", error);
    gmailStatus = { configured: true, sent: false, reason: "Gmail API call failed" };
  }

  res.json({ success: true, order: newOrder, gmail: gmailStatus });
});

app.get("/api/orders", requireAdmin, (req, res) => {
  dbRefresh();
  res.json(db.orders);
});

// Update Order Status (Admin Dashboard)
app.put("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { orderStatus, paymentStatus } = req.body;
  const orderIndex = db.orders.findIndex((o: any) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (orderStatus) {
    if (!["PREPARING", "SHIPPED", "DELIVERED"].includes(orderStatus)) {
      return res.status(400).json({ error: "Invalid order status" });
    }
    db.orders[orderIndex].orderStatus = orderStatus;
  }
  if (paymentStatus) {
    if (!["PENDING", "SUCCESS", "FAILED"].includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }
    db.orders[orderIndex].paymentStatus = paymentStatus;
  }

  saveDB(db);
  res.json({ success: true, order: db.orders[orderIndex] });
});

// Coupons Analytics / Validation
app.post("/api/coupons/validate", (req, res) => {

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      error: "Coupon required"
    });
  }

  const hashedInput = hashCoupon(code);

  const coupon = db.coupons.find((c: any) => {
    return (
      c.codeHash === hashedInput &&
      c.isActive === true &&
      c.isUsed === false &&
      new Date(c.expiresAt).getTime() > Date.now()
    );
  });

  if (!coupon) {
    return res.status(404).json({
      error: "Invalid or expired coupon"
    });
  }

  res.json({
    success: true,
    discountPercent: coupon.discountPercent
  });
});

// Admin coupon creator
app.post("/api/admin/coupons", requireAdmin, (req, res) => {

  const {
    code,
    discountPercent,
    expiresInDays,
    assignedUserId
  } = req.body;

  const parsedDiscount = asPositiveInteger(discountPercent);

  if (!parsedDiscount || parsedDiscount > 100) {
    return res.status(400).json({
      error: "Invalid discount"
    });
  }

  // ADMIN CUSTOM CODE OR AUTO GENERATED
  const realCoupon = code
    ? String(code)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
    : generateSecureCoupon(8);

  // Basic validation
  if (realCoupon.length < 6) {
    return res.status(400).json({
      error: "Coupon code too short"
    });
  }

  const hashedCoupon = hashCoupon(realCoupon);

  // Prevent duplicate coupons
  const alreadyExists = db.coupons.some(
    (c: any) => c.codeHash === hashedCoupon
  );

  if (alreadyExists) {
    return res.status(409).json({
      error: "Coupon already exists"
    });
  }

  const expiresAt = new Date(
    Date.now() + (Number(expiresInDays || 30) * 86400000)
  ).toISOString();

  const newCoupon = {
    id: `coupon-${Date.now()}`,
    codeHash: hashedCoupon,
    discountPercent: parsedDiscount,
    assignedUserId: assignedUserId || null,
    isUsed: false,
    isActive: true,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  db.coupons.push(newCoupon);

  saveDB(db);

  res.json({
    success: true,

    // SHOW REAL CODE ONLY HERE
    couponCode: realCoupon,

    coupon: {
      id: newCoupon.id,
      discountPercent: newCoupon.discountPercent,
      expiresAt: newCoupon.expiresAt
    }
  });
});
app.get("/api/admin/coupons", requireAdmin, (req, res) => {
  res.json(db.coupons);
});

app.delete("/api/admin/coupons/:id", requireAdmin, (req, res) => {

  const { id } = req.params;

  db.coupons = db.coupons.filter(
    (c: any) => c.id !== id
  );

  saveDB(db);

  res.json({
    success: true
  });
});

// AI Fashion Director assist styling advisor route
app.post("/api/gemini/assist", async (req, res) => {
  const { personality, vibe, colorPreference } = req.body;
  dbRefresh();

  const prompt = `You are the AI Fashion Director of APNAFIT, an ultra-premium quiet luxury fashion house specializing in heavy fabric structural drapes.
A customer has consulted you with their preferences:
- Streetwear Persona: ${personality}
- Aesthetic Vibe: ${vibe}
- Color/Style Search: ${colorPreference}

Available products in our vault:
${JSON.stringify(db.products.map((p: any) => ({ id: p.id, name: p.name, fabric: p.fabric, gsm: p.gsm, color: p.description })))}

Write a single, highly sophisticated, luxurious, and concise editorial design memorandum (2 paragraphs max) addressing the customer directly. Tone should be quiet authority, intelligent, avant-garde, and high-fashion editorial.
Then, choose 1 or 2 matching product IDs from our vault that fit their criteria.

Output your response EXACTLY as a raw JSON object with this schema:
{
  "stylistReply": "Your editorial memo...",
  "recommendedProductIds": ["prod-001", "prod-003"]
}`;

  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MOCK_KEY" && !process.env.GEMINI_API_KEY.startsWith("MOCK");
  if (hasKey) {
    try {
      const ai = getGeminiClient();
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = result.text || "";
      const parsed = JSON.parse(text);
      return res.json({
        stylistReply: parsed.stylistReply || "Select Bone Minimalist for unmatched structural silhouette.",
        recommendedProductIds: parsed.recommendedProductIds || ["prod-001"]
      });
    } catch (err) {
      console.error("Gemini assist API call failed, falling back to mock response", err);
    }
  }

  // Graceful Mock Fallback (extremely premium and curated!)
  let mockReply = "";
  let mockIds: string[] = [];

  const lowerVibe = String(vibe || "").toLowerCase();
  const lowerColor = String(colorPreference || "").toLowerCase();

  if (personality.includes("Scholar") || lowerVibe.includes("minimal") || lowerColor.includes("bone") || lowerColor.includes("white")) {
    mockReply = `A design persona anchored in Quiet Authority commands silhouettes that speak through volume and weave rather than branding noise.\n\nWe suggest aligning your wardrobe around our bespoke Off-White Bone Minimalist. The structural 400GSM cotton and drop-shoulder architectural lines establish permanent relevance, while our organic Desert Sage pique introduces an elegant, muted texture that balances natural tranquility with technical rigor.`;
    mockIds = ["prod-001", "prod-003"];
  } else if (personality.includes("Cyber") || lowerVibe.includes("street") || lowerVibe.includes("obsidian") || lowerColor.includes("gold") || lowerColor.includes("black")) {
    mockReply = `Tactical premium streetwear demands absolute density and silent dominance. Your design preferences require structural obsidian and French Terry weaves.\n\nWe recommend our Shadow Stealth and Obsidian Gold cuts. Formulated at 450GSM and 420GSM respectively, these heavy garments maintain their geometric presence eternally. The Obsidian Gold features seamless metallic shoulders, while the Shadow Stealth implements hidden zipper channels, executing silent utility with zero visual friction.`;
    mockIds = ["prod-002", "prod-004"];
  } else {
    mockReply = `The avant-garde runway aesthetic relies on dramatic, heavy drapes and shape retention. Form and weight become your primary creative media.\n\nWe curate our Shadow Stealth (450GSM Double Face) and Desert Sage (400GSM Pique) as your primary armor. Together, they create an exceptional volumetric layering posture that commands immediate respect in any space, finished with seamless double-needle seams.`;
    mockIds = ["prod-004", "prod-003"];
  }

  res.json({
    stylistReply: mockReply,
    recommendedProductIds: mockIds
  });
});

// Sales analytics aggregation
app.get("/api/admin/analytics", requireAdmin, (req, res) => {
  dbRefresh();
  const orders = db.orders || [];
  const totalSales = orders
    .filter((o: any) => o.paymentStatus === "SUCCESS")
    .reduce((acc: number, o: any) => acc + o.totalAmount, 0);

  const pendingOrdersCount = orders.filter((o: any) => o.orderStatus === "PREPARING").length;
  const shippedOrdersCount = orders.filter((o: any) => o.orderStatus === "SHIPPED").length;

  // Aggregate product sales
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orders.forEach((o: any) => {
    if (o.paymentStatus === "SUCCESS") {
      o.items.forEach((item: any) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.price * item.quantity;
      });
    }
  });

  res.json({
    totalSales,
    ordersCount: orders.length,
    pendingCount: pendingOrdersCount,
    shippedCount: shippedOrdersCount,
    productSales: Object.values(productSalesMap),
    recentOrders: orders.slice(-5).reverse()
  });
});


// Start Express + Vite Dev or Production systems
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware for development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up Express static files for production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Apna-Fit Live: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot full-stack server instance", err);
});
