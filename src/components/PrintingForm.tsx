import React, { useState, useEffect } from 'react';
import { Upload, FileText, Info, Trash2, AlertCircle } from 'lucide-react';
import { UserDetails, PrintingDetails } from '../types';

interface PrintingFormProps {
  userDetails: UserDetails;
  onUserDetailsChange: (details: UserDetails) => void;
  onSubmit: (details: PrintingDetails, price: number, paymentMethod: 'Cash on Delivery' | 'Paid Online (UPI)') => void;
  isSubmitting: boolean;
  addToast: (text: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function PrintingForm({
  userDetails,
  onUserDetailsChange,
  onSubmit,
  isSubmitting,
  addToast,
}: PrintingFormProps) {
  const [printType, setPrintType] = useState<'B&W' | 'Colour'>('B&W');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [copies, setCopies] = useState<number>(1);
  const [sides, setSides] = useState<'Single Sided' | 'Double Sided'>('Single Sided');
  const [pages, setPages] = useState<number>(1);
  const [instructions, setInstructions] = useState<string>('');
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'Paid Online (UPI)'>('Cash on Delivery');
  
  // File details
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Pricing constants (INR ₹)
  const PRICE_PER_PAGE_BW = 1.50;
  const PRICE_PER_PAGE_COLOUR = 10.00;
  
  const getPaperSizePremium = (size: 'A4' | 'A3' | 'Letter') => {
    if (size === 'A3') return 5.00;
    if (size === 'Letter') return 0.50;
    return 0.00; // A4 is base
  };

  const calculateEstimatedPrice = () => {
    const basePagePrice = printType === 'B&W' ? PRICE_PER_PAGE_BW : PRICE_PER_PAGE_COLOUR;
    const paperPremium = getPaperSizePremium(paperSize);
    
    let singlePageCost = basePagePrice + paperPremium;
    if (sides === 'Double Sided') {
      // Small volume discount for double-sided
      singlePageCost = (singlePageCost * 2) - 0.50;
    }
    
    // Total price = Cost per page * number of pages * copies
    // Ensure pages and copies are at least 1
    const validPages = Math.max(1, pages);
    const validCopies = Math.max(1, copies);
    
    const pageMultiplier = sides === 'Double Sided' ? Math.ceil(validPages / 2) : validPages;
    const total = singlePageCost * pageMultiplier * validCopies;
    return Math.max(0, parseFloat(total.toFixed(2)));
  };

  const estimatedPrice = calculateEstimatedPrice();

  // Handle file input changes
  const processFile = (selectedFile: File) => {
    // 10MB size limit
    const MAX_SIZE_MB = 10;
    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      addToast(`File size is too large! Maximum limit is ${MAX_SIZE_MB}MB.`, 'error');
      return;
    }

    // Allowed extensions
    const allowedExtensions = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(fileExtension)) {
      addToast('Invalid file type! Only PDF, Word, PowerPoint, Excel, Images, and Text files are allowed.', 'error');
      return;
    }

    setFile(selectedFile);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFileBase64(base64);
      addToast(`File "${selectedFile.name}" successfully selected!`, 'success');
    };
    reader.onerror = () => {
      addToast('Error reading file. Please try another file.', 'error');
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileBase64('');
    addToast('File removed.', 'info');
  };

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
    
    // Simple phone number check
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
      addToast('Please specify a delivery location (e.g. Room No, Hostel, Lab).', 'warning');
      return;
    }
    if (!file) {
      addToast('Please upload a file for printing.', 'warning');
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

    const printDetails: PrintingDetails = {
      printType,
      paperSize,
      copies,
      sides,
      instructions: instructions.trim(),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileData: fileBase64
    };

    onSubmit(printDetails, estimatedPrice, paymentMethod);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT & MID COLUMN: SERVICE DETAILS */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <h3 className="font-sans font-semibold text-stone-200">Printing Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Print Type */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Print Type</label>
              <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => setPrintType('B&W')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    printType === 'B&W'
                      ? 'bg-stone-800 text-orange-500 border border-orange-500/10 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Black & White
                  <span className="block text-[10px] font-normal text-stone-500">₹1.50 / page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintType('Colour')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    printType === 'Colour'
                      ? 'bg-stone-800 text-orange-500 border border-orange-500/10 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Full Colour
                  <span className="block text-[10px] font-normal text-stone-500">₹10.00 / page</span>
                </button>
              </div>
            </div>

            {/* Sides */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Printing Sides</label>
              <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => setSides('Single Sided')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    sides === 'Single Sided'
                      ? 'bg-stone-800 text-orange-500 border border-orange-500/10 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Single Sided
                  <span className="block text-[10px] font-normal text-stone-500">Standard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSides('Double Sided')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    sides === 'Double Sided'
                      ? 'bg-stone-800 text-orange-500 border border-orange-500/10 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Double Sided
                  <span className="block text-[10px] font-normal text-stone-500">Discounted</span>
                </button>
              </div>
            </div>

            {/* Paper Size */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Paper Size</label>
              <div className="grid grid-cols-3 gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
                {(['A4', 'A3', 'Letter'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`py-1.5 px-1 text-xs font-semibold rounded-lg transition-all ${
                      paperSize === size
                        ? 'bg-stone-800 text-orange-500 border border-orange-500/10'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {size}
                    <span className="block text-[8px] font-normal text-stone-500">
                      {size === 'A4' ? 'Base' : size === 'A3' ? '+₹5.00' : '+₹0.50'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pages & Copies Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="pages-input" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Pages</label>
                <input
                  id="pages-input"
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="copies-input" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Copies</label>
                <input
                  id="copies-input"
                  type="number"
                  min="1"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* File Upload Target */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Upload Document (Max 10MB)</label>
            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-stone-800 bg-stone-950 hover:border-stone-700 hover:bg-stone-900/50'
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx,.xls,.xlsx,.txt"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload document for printing"
                />
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-900 text-orange-500 border border-stone-800 mb-3 shadow-inner">
                  <Upload size={20} />
                </div>
                <p className="text-sm font-semibold text-stone-200">Drag & drop your file here, or click to browse</p>
                <p className="text-xs text-stone-500 mt-1">Supports PDF, Word, PPT, Excel, Images, Text (Max 10MB)</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-stone-950 border border-stone-800 rounded-xl shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <FileText size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-stone-200 truncate max-w-[180px] sm:max-w-xs">{file.name}</p>
                    <p className="text-xs text-stone-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-stone-500 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all"
                  aria-label="Remove uploaded file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <label htmlFor="instructions-textarea" className="block text-xs font-semibold text-stone-400 uppercase tracking-wider">Additional Instructions</label>
            <textarea
              id="instructions-textarea"
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Please bind this, double check side orientation, black cover..."
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
              <label htmlFor="name-input" className="block text-xs font-semibold text-stone-400">Full Name</label>
              <input
                id="name-input"
                type="text"
                value={userDetails.name}
                onChange={(e) => onUserDetailsChange({ ...userDetails, name: e.target.value })}
                placeholder="Enter your name"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="phone-input" className="block text-xs font-semibold text-stone-400">Phone (WhatsApp)</label>
              <input
                id="phone-input"
                type="tel"
                value={userDetails.phone}
                onChange={(e) => onUserDetailsChange({ ...userDetails, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="dept-input" className="block text-xs font-semibold text-stone-400">Department</label>
              <input
                id="dept-input"
                type="text"
                value={userDetails.department}
                onChange={(e) => onUserDetailsChange({ ...userDetails, department: e.target.value })}
                placeholder="e.g. Mechanical, Physics, CS"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-orange-500 placeholder:text-stone-600 transition-colors"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="loc-input" className="block text-xs font-semibold text-stone-400">Delivery Location</label>
              <input
                id="loc-input"
                type="text"
                value={userDetails.deliveryLocation}
                onChange={(e) => onUserDetailsChange({ ...userDetails, deliveryLocation: e.target.value })}
                placeholder="e.g. Hostel 4 Room 205, Library"
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
              <span className="font-semibold text-stone-200">Printing</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>Specs</span>
              <span className="font-semibold text-stone-200">{printType} • {paperSize} • {sides}</span>
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
