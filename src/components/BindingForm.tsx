import React, { useState } from 'react';
import { Layers, Info, AlertCircle } from 'lucide-react';
import { UserDetails, BindingDetails } from '../types';

interface BindingFormProps {
  userDetails: UserDetails;
  onUserDetailsChange: (details: UserDetails) => void;
  onSubmit: (details: BindingDetails, price: number, paymentMethod: 'Cash on Delivery' | 'Paid Online (UPI)') => void;
  isSubmitting: boolean;
  addToast: (text: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function BindingForm({
  userDetails,
  onUserDetailsChange,
  onSubmit,
  isSubmitting,
  addToast,
}: BindingFormProps) {
  const [bindingType, setBindingType] = useState<BindingDetails['bindingType']>('Spiral Binding');
  const [pages, setPages] = useState<number>(50);
  const [copies, setCopies] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'Paid Online (UPI)'>('Cash on Delivery');

  // Pricing constants (INR ₹)
  const getBindingPricing = (type: BindingDetails['bindingType']) => {
    switch (type) {
      case 'Spiral Binding':
        return { base: 30.00, perPage: 0.50 };
      case 'Comb Binding':
        return { base: 25.00, perPage: 0.50 };
      case 'Hard Cover':
        return { base: 100.00, perPage: 1.00 };
      case 'Soft Cover':
        return { base: 50.00, perPage: 0.80 };
    }
  };

  const calculateEstimatedPrice = () => {
    const { base, perPage } = getBindingPricing(bindingType);
    const validPages = Math.max(1, pages);
    const validCopies = Math.max(1, copies);
    
    const costPerCopy = base + (perPage * validPages);
    const total = costPerCopy * validCopies;
    return Math.max(0, parseFloat(total.toFixed(2)));
  };

  const estimatedPrice = calculateEstimatedPrice();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Input validations
    if (!userDetails.name.trim()) {
      addToast('Please enter your name.', 'warning');
      return;
    }
    if (!userDetails.phone.trim()) {
      addToast('Please enter your phone number.', 'warning');
      return;
    }

    const phoneRegex = /^[+]?[0-9\s-]{10,14}$/;
    if (!phoneRegex.test(userDetails.phone.trim().replace(/\s+/g, ''))) {
      addToast('Please enter a valid phone number (at least 10 digits).', 'warning');
      return;
    }

    if (!userDetails.department.trim()) {
      addToast('Please enter your department.', 'warning');
      return;
    }
    if (!userDetails.deliveryLocation.trim()) {
      addToast('Please specify a delivery location.', 'warning');
      return;
    }
    if (pages <= 0) {
      addToast('Please enter a valid page count (minimum 1).', 'warning');
      return;
    }
    if (copies <= 0) {
      addToast('Please enter a valid copy count (minimum 1).', 'warning');
      return;
    }

    const bindingDetails: BindingDetails = {
      bindingType,
      pages,
      copies,
      notes: notes.trim()
    };

    onSubmit(bindingDetails, estimatedPrice, paymentMethod);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT & MID COLUMN: SERVICE DETAILS */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="font-sans font-semibold text-stone-200">Binding Details</h3>
          </div>

          {/* Binding Type Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Select Binding Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { type: 'Spiral Binding', desc: 'Highly flexible plastic coil, standard for assignments.', base: 30, page: 0.5 },
                { type: 'Comb Binding', desc: 'Standard plastic comb binding, easy to add/remove sheets.', base: 25, page: 0.5 },
                { type: 'Hard Cover', desc: 'Premium leatherette hard binding with gold foil lettering.', base: 100, page: 1.0 },
                { type: 'Soft Cover', desc: 'Thick cardstock paperback binding, neat book finish.', base: 50, page: 0.8 },
              ] as const).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setBindingType(item.type)}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    bindingType === item.type
                      ? 'bg-orange-500/5 border-orange-500 shadow-md shadow-orange-500/5'
                      : 'bg-stone-950 border-stone-850 hover:bg-stone-900/60 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 w-full justify-between">
                    <span className={`text-sm font-bold ${bindingType === item.type ? 'text-orange-500' : 'text-stone-200'}`}>
                      {item.type}
                    </span>
                    <span className="text-xs font-mono font-bold text-stone-400">
                      ₹{item.base} + ₹{item.page}/pg
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-normal">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            {/* Pages Count */}
            <div className="space-y-1">
              <label htmlFor="binding-pages" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Estimated Pages per Book</label>
              <input
                id="binding-pages"
                type="number"
                min="1"
                value={pages}
                onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Copies Count */}
            <div className="space-y-1">
              <label htmlFor="binding-copies" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider font-semibold">Number of Copies</label>
              <input
                id="binding-copies"
                type="number"
                min="1"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="binding-notes" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Additional Binding Instructions</label>
            <textarea
              id="binding-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Include 'PROJECT REPORT 2026' in gold foil letters on the front cover. Use blue cardstock back cover..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PRICE SUMMARY & CUSTOMER DEETS */}
      <div className="space-y-6">
        {/* CUSTOMER DETAILS FOR PRE-FILL */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="font-sans font-semibold text-stone-200">Customer Details</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="binding-customer-name" className="block text-xs font-semibold text-stone-400">Full Name</label>
              <input
                id="binding-customer-name"
                type="text"
                value={userDetails.name}
                onChange={(e) => onUserDetailsChange({ ...userDetails, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="binding-customer-phone" className="block text-xs font-semibold text-stone-400">Phone (WhatsApp)</label>
              <input
                id="binding-customer-phone"
                type="tel"
                value={userDetails.phone}
                onChange={(e) => onUserDetailsChange({ ...userDetails, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="binding-customer-dept" className="block text-xs font-semibold text-stone-400">Department</label>
              <input
                id="binding-customer-dept"
                type="text"
                value={userDetails.department}
                onChange={(e) => onUserDetailsChange({ ...userDetails, department: e.target.value })}
                placeholder="e.g. Electrical Engineering"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="binding-customer-loc" className="block text-xs font-semibold text-stone-400">Delivery Location</label>
              <input
                id="binding-customer-loc"
                type="text"
                value={userDetails.deliveryLocation}
                onChange={(e) => onUserDetailsChange({ ...userDetails, deliveryLocation: e.target.value })}
                placeholder="e.g. Girls Hostel 1, Room 312"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
          </div>
          <div className="flex items-start gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800/80">
            <Info className="text-orange-500 shrink-0 mt-0.5" size={14} />
            <p className="text-[10px] text-stone-400 leading-normal">
              Your contact details are securely saved in your browser's local cache and will automatically auto-fill next time. No sign-in required!
            </p>
          </div>
        </div>

        {/* PRICING & SUBMIT CARD */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="font-sans font-semibold text-stone-200">Order Summary</h3>
          </div>

          <div className="space-y-2 border-b border-stone-850 pb-3">
            <div className="flex justify-between text-xs text-stone-400">
              <span>Service Type</span>
              <span className="font-semibold text-stone-200">Binding</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Binding Type</span>
              <span className="font-semibold text-stone-200">{bindingType}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Volume</span>
              <span className="font-semibold text-stone-200">{pages} Pages × {copies} Copies</span>
            </div>
          </div>

          {/* Payment Method Selector Block */}
          <div className="space-y-2 border-b border-stone-850 pb-4">
            <span className="block text-xs font-semibold text-stone-400">Select Payment Option</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash on Delivery')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col justify-center items-center gap-0.5 ${
                  paymentMethod === 'Cash on Delivery'
                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 font-black shadow shadow-orange-500/5'
                    : 'bg-stone-950 text-stone-500 border-stone-850 hover:bg-stone-900 hover:text-stone-300'
                }`}
              >
                <span>Pay on Delivery</span>
                <span className="text-[9px] font-medium opacity-60">Cash/UPI Later</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Paid Online (UPI)')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col justify-center items-center gap-0.5 ${
                  paymentMethod === 'Paid Online (UPI)'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-black shadow shadow-emerald-500/5'
                    : 'bg-stone-950 text-stone-500 border-stone-850 hover:bg-stone-900 hover:text-stone-300'
                }`}
              >
                <span>Pay Online Now</span>
                <span className="text-[9px] font-medium opacity-60">Instant UPI QR</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-400 font-medium">Estimated Price</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-orange-500">₹{estimatedPrice.toFixed(2)}</span>
              <span className="block text-[10px] text-stone-500">Includes free campus delivery</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-stone-950" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting Order...</span>
              </>
            ) : (
              <span>{paymentMethod === 'Paid Online (UPI)' ? 'Pay Online & Submit' : 'Submit & Place Order'}</span>
            )}
          </button>
          
          <div className="flex items-center gap-1.5 justify-center text-[10px] text-stone-500 font-medium">
            <AlertCircle size={12} />
            <span>{paymentMethod === 'Paid Online (UPI)' ? 'Scans dynamic UPI QR with instant authorization.' : 'Pay on delivery in person or via UPI after receipt.'}</span>
          </div>
        </div>
      </div>
    </form>
  );
}
