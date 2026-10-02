export interface UserProfile {
  uid: string;
  phoneNumber: string;
  displayName?: string;
  createdAt: number;
}

export type DeliveryStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type MagazineFormat = 'digital' | 'print' | 'both';

export interface Magazine {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  pricePrint: number;
  priceDigital: number;
  publishedDate: number;
  format: MagazineFormat;
  heyzineLink?: string; // Link to the digital version on heyzine
  issueNumber: string;
  category?: string;
  pages?: number;
  pdfUrl?: string;
  source?: 'heyzine';
  // Set on paid issues; their links are withheld until bought (see /api/read)
  price?: number;
  locked?: boolean;
}

export interface Order {
  id: string;
  userId: string;
  magazineId: string;
  format: 'digital' | 'print' | 'both';
  totalPrice: number;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  createdAt: number;
  phoneNumber: string;
  shippingAddress?: {
    city: string;
    district: string;
    khoroo?: string;
    addressLine: string;
    placeType?: 'home' | 'office';
    lat?: number | null;
    lng?: number | null;
    phone: string;
  };
}

// Шинэ: Сэтгүүл захиалгын мэдээлэл (Улирал, Хагас жил, Жил)
export interface SubscriptionOrder {
  id: string;
  userId: string;
  plan: 'quarterly' | 'half-year' | 'yearly';
  price: number;
  // User info
  fullName: string;
  phone: string;
  email: string;
  // Delivery
  city: string;
  district: string;
  khoroo?: string;
  addressDetail: string;
  placeType?: 'home' | 'office';
  lat?: number | null;
  lng?: number | null;
  // E-barimt
  ebarimtType: 'personal' | 'company';
  companyName?: string;
  registerNumber?: string;
  // Payment
  paymentMethod: 'qpay' | 'socialpay' | 'invoice';
  paymentStatus: PaymentStatus;
  deliveryStatus: 'pending' | 'delivering' | 'delivered';
  // Dates
  createdAt: number;
  startDate?: number;
  endDate?: number;
  // Optional: Free reading code given by admin
  digitalCode?: string;
}

// «Амины орон сууц» каталогийн захиалга. Document id нь захиалгын код өөрөө —
// олон нийт зөвхөн кодоор нь нэг захиалгыг уншиж чадна (firestore.rules).
export type CatalogOrderStatus = 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type CatalogPaymentStatus = 'unpaid' | 'paid';

export interface CatalogOrder {
  code: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number | null;
  // 0 for pickup; set by the database from settings.house_catalog.deliveryFee
  deliveryFee: number;
  fullName: string;
  phone: string;
  deliveryMethod: 'delivery' | 'pickup';
  // «Улаанбаатар» or the aimag; district is the UB district or the sum
  city?: string;
  district: string;
  khoroo?: string;
  address: string;
  placeType?: 'home' | 'office';
  lat?: number | null;
  lng?: number | null;
  note: string;
  status: CatalogOrderStatus;
  paymentStatus: CatalogPaymentStatus;
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
}

// Цахим дугаарын худалдан авалт. Document id нь нэхэмжлэхийн дугаар (гүйлгээний утга).
export type PurchaseStatus = 'pending' | 'paid' | 'cancelled';
export type PurchaseMethod = 'qpay' | 'transfer';

export interface Purchase {
  id: string;
  uid: string;
  phone: string;
  issueId: string;
  issueTitle: string;
  coverImage: string;
  amount: number;
  method: PurchaseMethod;
  status: PurchaseStatus;
  createdAt: number;
  paidAt?: number;
  paidVia?: 'qpay' | 'admin';
  qpay?: QPayInvoiceInfo;
}

export interface QPayInvoiceInfo {
  invoiceId: string;
  qrImage: string;
  shortUrl: string;
  urls: { name: string; description?: string; logo?: string; link: string }[];
}

export interface BankSettings {
  bankName: string;
  accountNumber: string;
  accountName: string;
  // International form of the account, for transfers from other banks
  iban?: string;
}
