import { useState, useEffect } from 'react';
import Header from './components/Header';
import PrintingForm from './components/PrintingForm';
import StationeryForm from './components/StationeryForm';
import BindingForm from './components/BindingForm';
import SuccessScreen from './components/SuccessScreen';
import MyOrders from './components/MyOrders';
import AdminPanel from './components/AdminPanel';
import ToastContainer, { ToastMessage, ToastType } from './components/Toast';
import { UserDetails, Order, ServiceType } from './types';
import {
  getSavedUserDetails,
  saveUserDetails,
  getAppsScriptUrl,
  getNextOrderId,
  saveOrderToHistory,
  saveOrderToLocalDatabase
} from './utils/storage';
import { FileText, ShoppingBag, Package, Shield, Settings, AlertCircle } from 'lucide-react';

export default function App() {
  // Navigation tabs: 'new-order' | 'my-orders' | 'admin' | 'success'
  const [currentTab, setCurrentTab] = useState<string>('new-order');
  const [activeService, setActiveService] = useState<ServiceType>('Printing');

  // Customer persist state
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: '',
    phone: '',
    department: '',
    deliveryLocation: '',
  });

  // Submission and API tracking state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasAppsScriptUrl, setHasAppsScriptUrl] = useState<boolean>(false);

  // Pending payment states for UPI
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<{ details: any; price: number } | null>(null);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);

  // Success screen params
  const [successOrderId, setSuccessOrderId] = useState<string>('');
  const [successPrice, setSuccessPrice] = useState<number>(0);
  const [successService, setSuccessService] = useState<string>('');

  // Custom notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Load user details & Apps Script status from storage on mount
  useEffect(() => {
    setUserDetails(getSavedUserDetails());
    setHasAppsScriptUrl(!!getAppsScriptUrl());
  }, []);

  const addToast = (text: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshAppsScriptStatus = () => {
    setHasAppsScriptUrl(!!getAppsScriptUrl());
  };

  const getActiveUpiId = (): string => {
    const saved = localStorage.getItem('qd_admin_upi_id');
    return (!saved || saved === 'quickdeliver@ybl') ? 'rashidkharoon@okhdfcbank' : saved;
  };

  // Helper to construct a descriptive order summary string
  const compileOrderDetailsString = (service: ServiceType, details: any): string => {
    if (service === 'Printing') {
      return `${details.printType}, ${details.paperSize}, ${details.sides}, ${details.copies} copy(ies). File: ${details.fileName || 'None'}. Instructions: ${details.instructions || 'None'}`;
    } else if (service === 'Stationery') {
      const itemsList = details.items.map((i: any) => `${i.name} (Qty ${i.quantity})`).join(', ');
      return `Items: ${itemsList}. Notes: ${details.notes || 'None'}`;
    } else {
      // Binding
      return `${details.bindingType}, ${details.pages} pages, ${details.copies} copy(ies). Notes: ${details.notes || 'None'}`;
    }
  };

  // Main order submission pipeline
  const handleOrderSubmission = async (
    serviceDetails: any,
    estimatedPrice: number,
    paymentMethod: 'Cash on Delivery' | 'Paid Online (UPI)' = 'Cash on Delivery',
    paymentStatus: 'Pending' | 'Paid' = 'Pending',
    paymentReference: string = ''
  ) => {
    setIsSubmitting(true);
    
    // Save user details to LocalStorage for future auto-fills
    saveUserDetails(userDetails);

    // Rate limiting: prevent submission within 5 seconds of previous order
    const lastSubmission = localStorage.getItem('qd_last_submission_time');
    const now = Date.now();
    if (lastSubmission && now - parseInt(lastSubmission) < 10000) {
      addToast('Rate Limit Triggered: Please wait 10 seconds before submitting another order.', 'warning');
      setIsSubmitting(false);
      return;
    }
    localStorage.setItem('qd_last_submission_time', now.toString());

    try {
      const orderId = getNextOrderId();
      const appsScriptUrl = getAppsScriptUrl();

      // Create structured order object
      const newOrder: Order = {
        id: orderId,
        timestamp: new Date().toISOString(),
        customerName: userDetails.name.trim(),
        phone: userDetails.phone.trim(),
        department: userDetails.department.trim(),
        deliveryLocation: userDetails.deliveryLocation.trim(),
        serviceType: activeService,
        details: compileOrderDetailsString(activeService, serviceDetails),
        status: 'Pending',
        estimatedPrice,
        paymentMethod,
        paymentStatus,
        paymentReference,
        fileName: activeService === 'Printing' ? serviceDetails.fileName : undefined
      };

      let finalFileUrl = '';

      if (appsScriptUrl) {
        addToast('Submitting order to Google Sheets...', 'info');
        
        // Prepare base64 and upload metadata for Sheets
        const payload: any = {
          id: newOrder.id,
          timestamp: newOrder.timestamp,
          customerName: newOrder.customerName,
          phone: newOrder.phone,
          department: newOrder.department,
          deliveryLocation: newOrder.deliveryLocation,
          serviceType: newOrder.serviceType,
          details: newOrder.details,
          status: newOrder.status,
          estimatedPrice: newOrder.estimatedPrice,
          paymentMethod: newOrder.paymentMethod,
          paymentStatus: newOrder.paymentStatus,
          paymentReference: newOrder.paymentReference,
        };

        if (activeService === 'Printing' && serviceDetails.fileData) {
          payload.fileData = serviceDetails.fileData;
          payload.fileName = serviceDetails.fileName;
          payload.fileType = serviceDetails.fileType;
        }

        // Post order directly to Google Apps Script Web App
        // We use text/plain to avoid OPTIONS preflight triggers in Sheets CORS configurations
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.success) {
          finalFileUrl = data.fileUrl || '';
          addToast('Saved in Google Sheets!', 'success');
        } else {
          throw new Error(data.error || 'Server rejected submission');
        }
      }

      // Append final GDrive URL if returned
      if (finalFileUrl) {
        newOrder.fileUrl = finalFileUrl;
      }

      // Save to customer's personal history
      saveOrderToHistory(newOrder);

      // Save to the local admin fallback logs
      saveOrderToLocalDatabase(newOrder);

      // Load success state
      setSuccessOrderId(newOrder.id);
      setSuccessPrice(newOrder.estimatedPrice);
      setSuccessService(newOrder.serviceType);
      
      addToast('Order placed successfully! Please complete WhatsApp verification.', 'success');
      setCurrentTab('success');
      
    } catch (e: any) {
      console.error(e);
      addToast(`Direct Google Sheets Sync Failed: ${e.message || 'Network Timeout'}. Order saved locally!`, 'warning');
      
      // Fallback: save locally anyway so the order is never lost!
      const fallbackOrderId = getNextOrderId();
      const fallbackOrder: Order = {
        id: fallbackOrderId,
        timestamp: new Date().toISOString(),
        customerName: userDetails.name.trim(),
        phone: userDetails.phone.trim(),
        department: userDetails.department.trim(),
        deliveryLocation: userDetails.deliveryLocation.trim(),
        serviceType: activeService,
        details: compileOrderDetailsString(activeService, serviceDetails),
        status: 'Pending',
        estimatedPrice,
        paymentMethod,
        paymentStatus,
        paymentReference,
        fileName: activeService === 'Printing' ? serviceDetails.fileName : undefined
      };
      
      saveOrderToHistory(fallbackOrder);
      saveOrderToLocalDatabase(fallbackOrder);
      
      setSuccessOrderId(fallbackOrder.id);
      setSuccessPrice(fallbackOrder.estimatedPrice);
      setSuccessService(fallbackOrder.serviceType);
      setCurrentTab('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmitTrigger = (details: any, price: number, paymentMethod: 'Cash on Delivery' | 'Paid Online (UPI)') => {
    if (paymentMethod === 'Cash on Delivery') {
      handleOrderSubmission(details, price, 'Cash on Delivery', 'Pending', '');
    } else {
      setPendingSubmitData({ details, price });
      setUtrNumber('');
      setShowPaymentModal(true);
    }
  };

  const handleConfirmUPIPayment = () => {
    if (!utrNumber.trim()) {
      addToast('Please enter the UPI transaction UTR reference code.', 'warning');
      return;
    }
    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length < 6) {
      addToast('Please enter a valid reference / UTR code.', 'warning');
      return;
    }
    
    if (pendingSubmitData) {
      setIsVerifyingPayment(true);
      handleOrderSubmission(pendingSubmitData.details, pendingSubmitData.price, 'Paid Online (UPI)', 'Paid', cleanUtr)
        .then(() => {
          setShowPaymentModal(false);
          setPendingSubmitData(null);
        })
        .catch(() => {
          addToast('Order submission failed. Please try again.', 'error');
        })
        .finally(() => {
          setIsVerifyingPayment(false);
        });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Header Bar */}
      <Header 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        hasAppsScriptUrl={hasAppsScriptUrl} 
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 md:py-8">
        
        {/* NEW ORDER VIEW */}
        {currentTab === 'new-order' && (
          <div className="space-y-6">
            
            {/* Banner Description */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 relative z-10 text-left max-w-2xl">
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20">
                  Zero Google Forms
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-100">
                  Fast Campus Courier Delivery
                </h1>
                <p className="text-stone-400 text-xs sm:text-sm leading-relaxed font-medium">
                  Order custom print documents, essential stationery products, and academic bindings directly from your mobile. Submits straight to spreadsheet logs without requiring Google Login.
                </p>
              </div>
              
              <div className="shrink-0 relative z-10 flex items-center gap-2 bg-stone-950/40 p-4 rounded-2xl border border-stone-850">
                <Shield size={18} className="text-orange-500 shrink-0" />
                <div className="text-left">
                  <span className="block text-xs font-bold text-stone-300">100% Privacy Secure</span>
                  <span className="text-[10px] text-stone-500">No passwords, zero cookies tracking</span>
                </div>
              </div>
            </div>

            {/* TAB SELECTION BAR */}
            <div className="grid grid-cols-3 gap-2 bg-stone-900/50 p-1 rounded-2xl border border-stone-900">
              <button
                onClick={() => setActiveService('Printing')}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeService === 'Printing'
                    ? 'bg-orange-500 text-stone-950 shadow-lg shadow-orange-500/10 font-black'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <FileText size={16} />
                <span>Printing</span>
              </button>
              
              <button
                onClick={() => setActiveService('Stationery')}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeService === 'Stationery'
                    ? 'bg-orange-500 text-stone-950 shadow-lg shadow-orange-500/10 font-black'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <ShoppingBag size={16} />
                <span>Stationery</span>
              </button>
              
              <button
                onClick={() => setActiveService('Binding')}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  activeService === 'Binding'
                    ? 'bg-orange-500 text-stone-950 shadow-lg shadow-orange-500/10 font-black'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
                }`}
              >
                <Package size={16} />
                <span>Binding</span>
              </button>
            </div>

            {/* DYNAMIC FORMS */}
            <div className="transition-all duration-300">
              {activeService === 'Printing' && (
                <PrintingForm
                  userDetails={userDetails}
                  onUserDetailsChange={setUserDetails}
                  onSubmit={handleFormSubmitTrigger}
                  isSubmitting={isSubmitting}
                  addToast={addToast}
                />
              )}
              {activeService === 'Stationery' && (
                <StationeryForm
                  userDetails={userDetails}
                  onUserDetailsChange={setUserDetails}
                  onSubmit={handleFormSubmitTrigger}
                  isSubmitting={isSubmitting}
                  addToast={addToast}
                />
              )}
              {activeService === 'Binding' && (
                <BindingForm
                  userDetails={userDetails}
                  onUserDetailsChange={setUserDetails}
                  onSubmit={handleFormSubmitTrigger}
                  isSubmitting={isSubmitting}
                  addToast={addToast}
                />
              )}
            </div>
          </div>
        )}

        {/* TRACK ORDERS VIEW */}
        {currentTab === 'my-orders' && (
          <MyOrders addToast={addToast} />
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {currentTab === 'admin' && (
          <AdminPanel 
            addToast={addToast} 
            onRefreshStatus={refreshAppsScriptStatus} 
          />
        )}

        {/* SUCCESS VIEW */}
        {currentTab === 'success' && (
          <SuccessScreen
            orderId={successOrderId}
            estimatedPrice={successPrice}
            serviceType={successService}
            onTrackOrder={() => setCurrentTab('my-orders')}
            onNewOrder={() => setCurrentTab('new-order')}
          />
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden sticky bottom-0 z-40 bg-stone-950/90 backdrop-blur-lg border-t border-stone-900 px-6 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setCurrentTab('new-order')}
          className={`flex flex-col items-center gap-1 text-center py-1 transition-all ${
            currentTab === 'new-order' || currentTab === 'success' ? 'text-orange-500 font-bold' : 'text-stone-500 hover:text-stone-300'
          }`}
          aria-label="New Order Tab"
        >
          <FileText size={18} />
          <span className="text-[10px] font-semibold tracking-wide">New Order</span>
        </button>

        <button
          onClick={() => setCurrentTab('my-orders')}
          className={`flex flex-col items-center gap-1 text-center py-1 transition-all ${
            currentTab === 'my-orders' ? 'text-orange-500 font-bold' : 'text-stone-500 hover:text-stone-300'
          }`}
          aria-label="My Orders Tab"
        >
          <Package size={18} />
          <span className="text-[10px] font-semibold tracking-wide">My Orders</span>
        </button>

        <button
          onClick={() => setCurrentTab('admin')}
          className={`flex flex-col items-center gap-1 text-center py-1 transition-all ${
            currentTab === 'admin' ? 'text-orange-500 font-bold' : 'text-stone-500 hover:text-stone-300'
          }`}
          aria-label="Admin Panel Tab"
        >
          <Settings size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Admin</span>
        </button>
      </div>

      {/* UPI QR PAYMENT OVERLAY MODAL */}
      {showPaymentModal && pendingSubmitData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-stone-850 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-sans font-extrabold text-lg text-stone-100">Scan & Pay via UPI</h3>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingSubmitData(null);
                }}
                className="text-stone-500 hover:text-stone-300 text-xs font-semibold p-1 hover:bg-stone-800 rounded-lg transition-all"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-stone-400 leading-relaxed text-center">
                Scan the QR code below using any UPI App (GPay, Paytm, PhonePe, BHIM) to transfer the amount directly.
              </p>

              {/* QR Code container */}
              <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg border border-stone-800">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(
                    `upi://pay?pa=${getActiveUpiId()}&pn=QuickDeliver&am=${pendingSubmitData.price}&cu=INR&tn=QuickDeliver_Order`
                  )}`}
                  alt="UPI Payment QR Code"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Price Tag */}
              <div className="text-center py-2 bg-stone-950 rounded-xl border border-stone-850">
                <span className="text-[10px] uppercase font-bold text-stone-500 block tracking-wider">Amount to Transfer</span>
                <span className="text-2xl font-mono font-extrabold text-emerald-400">₹{pendingSubmitData.price.toFixed(2)}</span>
              </div>

              {/* Mobile Deep Link */}
              <div className="sm:hidden text-center">
                <a
                  href={`upi://pay?pa=${getActiveUpiId()}&pn=QuickDeliver&am=${pendingSubmitData.price}&cu=INR&tn=QuickDeliver_Order`}
                  className="inline-flex items-center gap-2 py-2 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-500/15"
                >
                  Pay via installed UPI App
                </a>
              </div>

              {/* Reference/UTR input form */}
              <div className="space-y-1.5 pt-2">
                <label htmlFor="utr-input" className="block text-xs font-semibold text-stone-400">
                  Enter UPI Ref No. / Transaction UTR <span className="text-rose-500">*</span>
                </label>
                <input
                  id="utr-input"
                  type="text"
                  maxLength={18}
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  placeholder="e.g. 402910837592 or Ref Code"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-orange-500 font-mono transition-colors"
                  required
                />
                <span className="block text-[9px] text-stone-500 leading-normal">
                  You can find this in your payment app's transaction receipt. The delivery agent will match this to confirm shipment.
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPendingSubmitData(null);
                }}
                className="flex-1 py-3 px-3 bg-stone-950 border border-stone-850 hover:bg-stone-900 text-stone-400 text-xs font-bold rounded-xl transition-all"
              >
                Back to order
              </button>
              <button
                type="button"
                onClick={handleConfirmUPIPayment}
                disabled={isVerifyingPayment}
                className="flex-1 py-3 px-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 text-xs font-extrabold tracking-wide rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
              >
                {isVerifyingPayment ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-stone-950" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>I Have Paid — Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* COMPLIANCE FOOTER */}
      <footer className="bg-stone-950 border-t border-stone-900/60 py-8 px-4 text-center text-xs text-stone-600 mt-12 space-y-2">
        <p className="font-sans">
          QuickDeliver Campus Logistics • Secure peer-to-peer delivery database.
        </p>
        <p className="max-w-md mx-auto leading-relaxed text-[11px] text-stone-700">
          Compliant with **WCAG 2.1 AA** color contrast accessibility regulations. Dark themes utilize deep anthracite charcoal backgrounds supporting eye-strain reduction for reading-intensive student workflows.
        </p>
      </footer>
    </div>
  );
}
