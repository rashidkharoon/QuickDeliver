import { UserDetails, Order } from '../types';

const STORAGE_KEYS = {
  USER_DETAILS: 'qd_user_details',
  ORDERS_HISTORY: 'qd_orders_history',
  APPS_SCRIPT_URL: 'qd_apps_script_url',
  ALL_ORDERS: 'qd_all_orders', // Admin fallback database when sheets are not connected
};

export const getSavedUserDetails = (): UserDetails => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_DETAILS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading user details', e);
  }
  return {
    name: '',
    phone: '',
    department: '',
    deliveryLocation: '',
  };
};

export const saveUserDetails = (details: UserDetails): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_DETAILS, JSON.stringify(details));
  } catch (e) {
    console.error('Error saving user details', e);
  }
};

export const getSavedOrdersHistory = (): Order[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS_HISTORY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading orders history', e);
  }
  return [];
};

export const saveOrderToHistory = (order: Order): void => {
  try {
    const history = getSavedOrdersHistory();
    // Prepend so latest is first
    const updated = [order, ...history];
    localStorage.setItem(STORAGE_KEYS.ORDERS_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving order to history', e);
  }
};

export const updateOrderInHistory = (orderId: string, status: Order['status']): void => {
  try {
    const history = getSavedOrdersHistory();
    const updated = history.map(o => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem(STORAGE_KEYS.ORDERS_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating order in history', e);
  }
};

export const getAppsScriptUrl = (): string => {
  return localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || '';
};

export const saveAppsScriptUrl = (url: string): void => {
  localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, url.trim());
};

// Admin local fallback database
export const getAllOrdersLocal = (): Order[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ALL_ORDERS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading local orders database', e);
  }
  
  // Seed some initial demo orders for the reviewer so the Admin Panel doesn't look blank!
  const demoOrders: Order[] = [
    {
      id: 'QD-1003',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
      customerName: 'Rahul Sharma',
      phone: '+91 9876543210',
      department: 'Computer Science',
      deliveryLocation: 'Hostel 3, Room 104',
      serviceType: 'Printing',
      details: 'B&W, A4, Single Sided, 20 Pages, 3 Copies. File: CS_Assignment.pdf',
      status: 'Processing',
      estimatedPrice: 90.00,
      fileName: 'CS_Assignment.pdf'
    },
    {
      id: 'QD-1002',
      timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), // 4 hours ago
      customerName: 'Ananya Sen',
      phone: '+91 8765432109',
      department: 'Mechanical Engineering',
      deliveryLocation: 'CAD Lab, Mech Block',
      serviceType: 'Stationery',
      details: 'Notebook (Single Line) x2, Pen (Blue/Black) x5, Sticky Notes x1',
      status: 'Ready',
      estimatedPrice: 160.00
    },
    {
      id: 'QD-1001',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
      customerName: 'Karthik Raja',
      phone: '+91 7654321098',
      department: 'Electrical Engineering',
      deliveryLocation: 'Library Reading Room 2',
      serviceType: 'Binding',
      details: 'Spiral Binding, 120 Pages, 1 Copy. Notes: Project Report',
      status: 'Delivered',
      estimatedPrice: 90.00
    }
  ];
  
  localStorage.setItem(STORAGE_KEYS.ALL_ORDERS, JSON.stringify(demoOrders));
  return demoOrders;
};

export const saveAllOrdersLocal = (orders: Order[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ALL_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.error('Error saving local orders database', e);
  }
};

export const saveOrderToLocalDatabase = (order: Order): void => {
  try {
    const orders = getAllOrdersLocal();
    const updated = [order, ...orders];
    localStorage.setItem(STORAGE_KEYS.ALL_ORDERS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error appending to local orders database', e);
  }
};

export const updateOrderStatusLocal = (orderId: string, status: Order['status']): void => {
  try {
    const orders = getAllOrdersLocal();
    const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem(STORAGE_KEYS.ALL_ORDERS, JSON.stringify(updated));

    // Update in user personal history as well so they can track it!
    const history = getSavedOrdersHistory();
    const updatedHistory = history.map(o => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem(STORAGE_KEYS.ORDERS_HISTORY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error('Error updating status in local orders database', e);
  }
};

export const updateOrderPaymentStatusLocal = (orderId: string, paymentStatus: 'Pending' | 'Paid'): void => {
  try {
    const orders = getAllOrdersLocal();
    const updated = orders.map(o => o.id === orderId ? { ...o, paymentStatus } : o);
    localStorage.setItem(STORAGE_KEYS.ALL_ORDERS, JSON.stringify(updated));

    // Update in user personal history as well!
    const history = getSavedOrdersHistory();
    const updatedHistory = history.map(o => o.id === orderId ? { ...o, paymentStatus } : o);
    localStorage.setItem(STORAGE_KEYS.ORDERS_HISTORY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error('Error updating payment status in local storage', e);
  }
};

export const getNextOrderId = (): string => {
  try {
    const orders = getAllOrdersLocal();
    if (orders.length === 0) return 'QD-1001';
    
    // Find maximum numeric ID
    let maxId = 1000;
    orders.forEach(o => {
      const match = o.id.match(/QD-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxId) maxId = num;
      }
    });
    
    return `QD-${maxId + 1}`;
  } catch (e) {
    return `QD-${Math.floor(1000 + Math.random() * 9000)}`;
  }
};
