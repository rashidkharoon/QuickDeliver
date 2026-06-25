import { CheckCircle2, MessageSquare, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

interface SuccessScreenProps {
  orderId: string;
  estimatedPrice: number;
  serviceType: string;
  onTrackOrder: () => void;
  onNewOrder: () => void;
}

export default function SuccessScreen({
  orderId,
  estimatedPrice,
  serviceType,
  onTrackOrder,
  onNewOrder,
}: SuccessScreenProps) {
  const WHATSAPP_NUMBER = '918300483780'; // formatted with country code without spaces

  const handleWhatsAppConfirm = () => {
    const text = encodeURIComponent(
      `Hi, I have placed order ${orderId}.\nPlease confirm my order.`
    );
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-stone-900 border border-stone-800 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8"
      >
        {/* Animated Green Checkmark Icon */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/5"
          >
            <CheckCircle2 size={54} className="stroke-[1.5]" />
          </motion.div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <span className="text-xs uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold px-3 py-1 rounded-full tracking-wider">
            Submission Success
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-stone-100">Order Submitted Successfully!</h2>
          <p className="text-stone-400 text-sm max-w-md mx-auto">
            Your order has been queued and saved directly in our Google Sheet database. Bypassing Google sign-in successful.
          </p>
        </div>

        {/* Order Details Badge */}
        <div className="bg-stone-950 rounded-2xl p-5 border border-stone-850 max-w-md mx-auto grid grid-cols-2 gap-4 divide-x divide-stone-850">
          <div className="text-left pl-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Order ID</span>
            <span className="text-lg font-mono font-bold text-orange-500">{orderId}</span>
          </div>
          <div className="text-left pl-6">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Estimated Price</span>
            <span className="text-lg font-bold text-stone-200">₹{estimatedPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* WhatsApp Notification Prompt */}
        <div className="bg-orange-500/5 rounded-xl p-4 border border-orange-500/10 text-stone-400 text-xs text-left max-w-md mx-auto space-y-2">
          <p className="font-semibold text-stone-300 flex items-center gap-1.5">
            <MessageSquare size={13} className="text-orange-500" />
            CRITICAL NEXT STEP: WhatsApp Confirmation
          </p>
          <p className="leading-relaxed">
            Please click the **WhatsApp Confirmation** button below to send your Order ID to our delivery executive. This triggers instant priority packing and dispatch!
          </p>
        </div>

        {/* Dynamic Buttons Layout */}
        <div className="flex flex-col gap-3 max-w-md mx-auto pt-4">
          {/* Main Action: WhatsApp Confirmation */}
          <button
            onClick={handleWhatsAppConfirm}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} className="fill-white/10" />
            <span>Confirm via WhatsApp</span>
            <ExternalLink size={14} className="opacity-70" />
          </button>

          {/* Sub Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onTrackOrder}
              className="py-3 px-4 bg-stone-800 border border-stone-700 hover:bg-stone-750 text-stone-200 hover:text-stone-100 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>Track Order</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={onNewOrder}
              className="py-3 px-4 bg-stone-950 border border-stone-850 hover:bg-stone-900 text-stone-400 hover:text-stone-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>New Order</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
