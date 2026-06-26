import React, { useState } from 'react';
import { Plus, Trash2, Info, AlertCircle, ShoppingCart } from 'lucide-react';
import { UserDetails, StationeryDetails, StationeryItem } from '../types';

interface StationeryFormProps {
  userDetails: UserDetails;
  onUserDetailsChange: (details: UserDetails) => void;
  onSubmit: (details: StationeryDetails, price: number, paymentMethod: 'Cash on Delivery' | 'Paid Online (UPI)') => void;
  isSubmitting: boolean;
  addToast: (text: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

// Preset library of stationery items
const STATIONERY_LIBRARY = [
  { id: 'item_1', name: 'Premium Pen (Blue/Black)', price: 10.00 },
  { id: 'item_2', name: 'Wooden Pencil HB', price: 5.00 },
  { id: 'item_3', name: 'Premium Eraser & Sharpener', price: 5.00 },
  { id: 'item_4', name: 'Ruler 30cm (Plastic)', price: 15.00 },
  { id: 'item_5', name: 'Ruled Notebook (Single Line, 120 Pages)', price: 40.00 },
  { id: 'item_6', name: 'A4 Practical Notebook (Unruled, 100 Pages)', price: 45.00 },
  { id: 'item_7', name: 'Neon Sticky Notes (3x3 inch, 100 sheets)', price: 30.00 },
  { id: 'item_8', name: 'Highlighter (Yellow/Green/Pink)', price: 20.00 },
  { id: 'item_9', name: 'Paper Clips (Box of 50)', price: 25.00 },
  { id: 'item_10', name: 'Clear Folder L-Type File', price: 15.00 },
  { id: 'item_11', name: 'Correction Tape / Whitener', price: 25.00 },
  { id: 'item_12', name: 'A4 Assignment Sheets (Pack of 50)', price: 50.00 },
];

export default function StationeryForm({
  userDetails,
  onUserDetailsChange,
  onSubmit,
  isSubmitting,
  addToast,
}: StationeryFormProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(STATIONERY_LIBRARY[0].id);
  const [items, setItems] = useState<StationeryItem[]>([]);
  const [customItemName, setCustomItemName] = useState<string>('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'Paid Online (UPI)'>('Cash on Delivery');

  const addItemFromLibrary = () => {
    const libraryItem = STATIONERY_LIBRARY.find(i => i.id === selectedPresetId);
    if (!libraryItem) return;

    // Check if already in the list
    const existing = items.find(i => i.name === libraryItem.name);
    if (existing) {
      setItems(items.map(i => i.name === libraryItem.name ? { ...i, quantity: i.quantity + 1 } : i));
      addToast(`Incremented quantity for "${libraryItem.name}"`, 'success');
    } else {
      setItems([...items, {
        id: `lib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: libraryItem.name,
        quantity: 1,
        estimatedPrice: libraryItem.price
      }]);
      addToast(`Added "${libraryItem.name}" to cart`, 'success');
    }
  };

  const addCustomItem = () => {
    if (!customItemName.trim()) {
      addToast('Please enter an item name.', 'warning');
      return;
    }
    if (customItemPrice <= 0) {
      addToast('Please enter a valid price.', 'warning');
      return;
    }

    const existing = items.find(i => i.name.toLowerCase() === customItemName.trim().toLowerCase());
    if (existing) {
      addToast('Item already exists in your list. Adjust its quantity instead!', 'warning');
      return;
    }

    setItems([...items, {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: customItemName.trim(),
      quantity: 1,
      estimatedPrice: customItemPrice
    }]);

    addToast(`Added custom item "${customItemName.trim()}"`, 'success');
    setCustomItemName('');
    setShowCustomForm(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    addToast('Item removed.', 'info');
  };

  const updateQuantity = (id: string, qty: number) => {
    const validQty = Math.max(1, qty);
    setItems(items.map(item => item.id === id ? { ...item, quantity: validQty } : item));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);
  };

  const estimatedPrice = calculateTotal();

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
    if (items.length === 0) {
      addToast('Your stationery list is empty. Please add at least one item.', 'warning');
      return;
    }

    const stationeryDetails: StationeryDetails = {
      items,
      notes: notes.trim()
    };

    onSubmit(stationeryDetails, estimatedPrice, paymentMethod);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT & MID COLUMN: SERVICE DETAILS */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <h3 className="font-sans font-semibold text-stone-200">Stationery Order List</h3>
            </div>
            <span className="text-xs bg-orange-500/10 text-orange-400 font-mono px-2.5 py-1 rounded-full border border-orange-500/20 flex items-center gap-1.5">
              <ShoppingCart size={12} />
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* ADD ITEM ZONE */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-stone-950 p-4 rounded-xl border border-stone-850">
            {!showCustomForm ? (
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1.5 w-full">
                  <label htmlFor="presets-select" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Select Stationery Item</label>
                  <select
                    id="presets-select"
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {STATIONERY_LIBRARY.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — ₹{item.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={addItemFromLibrary}
                    className="flex-1 sm:flex-none py-2.5 px-4 bg-orange-500 text-stone-950 text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(true)}
                    className="py-2.5 px-3 bg-stone-900 text-stone-400 border border-stone-800 text-xs font-semibold rounded-xl hover:text-stone-200 hover:bg-stone-850 transition-colors"
                  >
                    Custom Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-stone-850 pb-2 mb-1">
                  <span className="text-xs font-bold text-stone-300">Add Custom Item Details</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="text-xs text-orange-500 hover:underline font-semibold"
                  >
                    Use Preset Library
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label htmlFor="custom-item-name" className="block text-xs font-semibold text-stone-400">Item Name</label>
                    <input
                      id="custom-item-name"
                      type="text"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="e.g., Faber Castell Acrylic Paint, Eraser box..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="custom-item-price" className="block text-xs font-semibold text-stone-400">Estimated Price (₹)</label>
                    <input
                      id="custom-item-price"
                      type="number"
                      min="1"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="py-1.5 px-3 text-xs font-semibold bg-stone-900 text-stone-400 rounded-lg hover:text-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="py-1.5 px-3 text-xs font-bold bg-orange-500 text-stone-950 rounded-lg hover:bg-orange-600 transition-all"
                  >
                    Confirm Custom Item
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SELECTED ITEMS TABLE */}
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Selected Items List</span>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-stone-950 border border-stone-850 rounded-2xl text-center">
                <ShoppingCart size={32} className="text-stone-700 mb-2" />
                <p className="text-sm font-semibold text-stone-400">Your shopping list is empty</p>
                <p className="text-xs text-stone-600 mt-1">Select stationery items above to add them to your order.</p>
              </div>
            ) : (
              <div className="bg-stone-950 rounded-xl border border-stone-850 overflow-hidden divide-y divide-stone-850 shadow-inner">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-stone-900/40 transition-colors">
                    <div className="flex-1 pr-3">
                      <p className="text-sm font-semibold text-stone-200">{item.name}</p>
                      <p className="text-xs text-stone-500 font-mono">₹{item.estimatedPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Quantity Selector */}
                      <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-lg p-1 scale-90 sm:scale-100">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded bg-stone-950 hover:bg-stone-800 text-stone-300 flex items-center justify-center font-bold transition-all text-xs"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-stone-200">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-stone-950 hover:bg-stone-800 text-stone-300 flex items-center justify-center font-bold transition-all text-xs"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <span className="text-sm font-bold text-stone-300 font-mono w-16 text-right">
                        ₹{(item.estimatedPrice * item.quantity).toFixed(2)}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-stone-500 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes-textarea" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Order Notes / Requests</label>
            <textarea
              id="notes-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please bring rule sheets with a blue pen; make sure notebook covers are red..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors resize-none"
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
              <label htmlFor="customer-name" className="block text-xs font-semibold text-stone-400">Full Name</label>
              <input
                id="customer-name"
                type="text"
                value={userDetails.name}
                onChange={(e) => onUserDetailsChange({ ...userDetails, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="customer-phone" className="block text-xs font-semibold text-stone-400">Phone (WhatsApp)</label>
              <input
                id="customer-phone"
                type="tel"
                value={userDetails.phone}
                onChange={(e) => onUserDetailsChange({ ...userDetails, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="customer-dept" className="block text-xs font-semibold text-stone-400">Department</label>
              <input
                id="customer-dept"
                type="text"
                value={userDetails.department}
                onChange={(e) => onUserDetailsChange({ ...userDetails, department: e.target.value })}
                placeholder="e.g. Computer Science, Biotech"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="customer-location" className="block text-xs font-semibold text-stone-400">Delivery Location</label>
              <input
                id="customer-location"
                type="text"
                value={userDetails.deliveryLocation}
                onChange={(e) => onUserDetailsChange({ ...userDetails, deliveryLocation: e.target.value })}
                placeholder="e.g. PG Hostel A, Room 10"
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
              <span className="font-semibold text-stone-200">Stationery</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Selected items</span>
              <span className="font-semibold text-stone-200">{items.length} items</span>
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
