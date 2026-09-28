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
    addressLine: string;
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
  addressDetail: string;
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
