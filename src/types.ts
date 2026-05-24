export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  gsm: number;
  fabric: string;
  description: string;
  longDescription: string;
  image: string;
  images?: string[];
  hoverImage?: string;
  sizes: string[];
  stock: number;
  rating: number;
  category: string;
  features: string[];
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
}

export interface Order {
  id: string;
  userId: string;
  shippingAddress: {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size: string;
  }[];
  subtotal?: number;
  discountPercent?: number;
  couponCode?: string | null;
  totalAmount: number;
  paymentMethod: 'UPI_INTENT' | 'UPI_QR';
  paymentDetails: {
    upiId?: string;
    transactionId: string;
    qrPayload?: string;
    provider?: string;
  };
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  orderStatus: 'PREPARING' | 'SHIPPED' | 'DELIVERED';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  token?: string;
}

export interface UPIConfig {
  upiId: string;
  merchantName: string;
  transactionNote: string;
}
