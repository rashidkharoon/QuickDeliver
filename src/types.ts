export type ServiceType = 'Printing' | 'Stationery' | 'Binding';

export type OrderStatus = 'Pending' | 'Processing' | 'Ready' | 'Delivered';

export interface UserDetails {
  name: string;
  phone: string;
  department: string;
  deliveryLocation: string;
}

export interface PrintingDetails {
  printType: 'B&W' | 'Colour';
  paperSize: 'A4' | 'A3' | 'Letter';
  copies: number;
  sides: 'Single Sided' | 'Double Sided';
  fileData?: string; // Base64 data
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  instructions: string;
}

export interface StationeryItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice: number; // For pricing calculation
}

export interface StationeryDetails {
  items: StationeryItem[];
  notes: string;
}

export interface BindingDetails {
  bindingType: 'Spiral Binding' | 'Comb Binding' | 'Hard Cover' | 'Soft Cover';
  pages: number;
  copies: number;
  notes: string;
}

export interface Order {
  id: string; // QD-1001 etc
  timestamp: string;
  customerName: string;
  phone: string;
  department: string;
  deliveryLocation: string;
  serviceType: ServiceType;
  details: string; // Plain English description of the items/print/binding
  status: OrderStatus;
  estimatedPrice: number;
  fileUrl?: string; // Google Drive url, set by script
  fileName?: string;
  rawDetails?: string; // JSON string representation for detailed admin viewing
  paymentMethod?: 'Cash on Delivery' | 'Paid Online (UPI)';
  paymentStatus?: 'Pending' | 'Paid' | 'Failed';
  paymentReference?: string;
}
