import { useState, useEffect } from 'react';
import { Package, Calendar, Clock, ShoppingBag, FileText, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Order } from '../types';
import { getSavedOrdersHistory, getAppsScriptUrl, updateOrderInHistory } from '../utils/storage';

interface MyOrdersProps {
  addToast: (text: string, type: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function MyOrders({ addToast }: MyOrdersProps) {
  const [localOrders, setLocalOrders] = useState<Order[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [appsScriptUrl] = useState<string>(getAppsScriptUrl());

  const loadLocalOrders = () => {
    setLocalOrders(getSavedOrdersHistory());
  };

  useEffect(() => {
    loadLocalOrders();
  }, []);

  // Fetch live order updates from Google Sheets
  const refreshLiveStatuses = async () => {
    if (!appsScriptUrl) {
      addToast('Local order history loaded. Add Google Sheets URL in Admin Settings for live tracking!', 'info');
      return;
    }

    setIsLoadingLive(true);
    try {
      const response = await fetch(`${appsScriptUrl}?action=getOrders`, {
        method: 'GET',
        mode: 'cors'
      });
      const data = await response.json();

      if (data.success && data.orders) {
        const liveOrders: Order[] = data.orders;
        const currentLocal = getSavedOrdersHistory();
        let updatedCount = 0;

        // Map live statuses to local orders if they exist
        const updatedLocal = currentLocal.map(localOrder => {
          const matchingLive = liveOrders.find(live => live.id === localOrder.id);
          if (matchingLive && matchingLive.status !== localOrder.status) {
            updateOrderInHistory(localOrder.id, matchingLive.status);
            updatedCount++;
            return { ...localOrder, status: matchingLive.status };
          }
          return localOrder;
        });

        if (updatedCount > 0) {
          setLocalOrders(updatedLocal);
          addToast(`Refreshed! ${updatedCount} order status(es) updated!`, 'success');
        } else {
          addToast('Your order statuses are up to date.', 'info');
        }
      } else {
        throw new Error(data.error || 'Failed to fetch live orders');
      }
    } catch (e) {
      console.error(e);
      addToast('Offline / Failed to sync live status. Displaying local order records.', 'warning');
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    if (appsScriptUrl && localOrders.length > 0) {
      refreshLiveStatuses();
    }
  }, [appsScriptUrl]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock size={12} className="animate-pulse" />
            Pending Confirmation
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Package size={12} className="animate-spin" style={{ animationDuration: '3s' }} />
            In Production
          </span>
        );
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShoppingBag size={12} />
            Ready for Delivery
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle size={12} />
            Delivered
          </span>
        );
    }
  };

  const getServiceIcon = (type: Order['serviceType']) => {
    switch (type) {
      case 'Printing':
        return <FileText className="text-orange-500" size={20} />;
      case 'Stationery':
        return <ShoppingBag className="text-orange-500" size={20} />;
      case 'Binding':
        return <Package className="text-orange-500" size={20} />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title & Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-100">My Orders</h2>
          <p className="text-stone-400 text-sm">Track your printing, stationery, and binding deliveries in real-time.</p>
        </div>

        {localOrders.length > 0 && (
          <button
            onClick={refreshLiveStatuses}
            disabled={isLoadingLive}
            className="flex items-center gap-2 py-2 px-3 bg-stone-900 border border-stone-800 text-stone-300 hover:text-stone-100 hover:border-stone-700 disabled:opacity-50 text-xs font-semibold rounded-xl transition-all"
            aria-label="Refresh order statuses"
          >
            <RefreshCw size={13} className={isLoadingLive ? 'animate-spin' : ''} />
            <span>{isLoadingLive ? 'Syncing...' : 'Sync Live Status'}</span>
          </button>
        )}
      </div>

      {localOrders.length === 0 ? (
        <div className="text-center py-16 bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-stone-950 text-orange-500 border border-stone-850 mx-auto mb-4 shadow-inner">
            <Package size={24} />
          </div>
          <h3 className="text-lg font-bold text-stone-200">No Orders Placed Yet</h3>
          <p className="text-stone-400 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
            Your submitted orders will show up here. Once submitted, they are saved directly in Google Sheets without needing a Google Account sign-in!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {localOrders.map((order) => (
            <div
              key={order.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl hover:border-stone-750 transition-all space-y-4"
            >
              {/* Card Header: Order ID, Service Type & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-850 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-stone-950 border border-stone-850">
                    {getServiceIcon(order.serviceType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-500 text-base">{order.id}</span>
                      <span className="text-xs bg-stone-800 text-stone-300 font-semibold px-2 py-0.5 rounded">
                        {order.serviceType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-0.5">
                      <Calendar size={11} />
                      <span>{formatDate(order.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {getStatusBadge(order.status)}
                </div>
              </div>

              {/* Card Body: Details & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="md:col-span-2 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Order Items / Specs</span>
                  <p className="text-xs sm:text-sm text-stone-300 font-medium leading-relaxed">{order.details}</p>
                  
                  {order.fileName && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-orange-500/80 bg-orange-500/5 px-2.5 py-1 rounded border border-orange-500/10 font-mono">
                      <FileText size={12} />
                      <span className="truncate max-w-[200px]">{order.fileName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 border-t md:border-t-0 md:border-l border-stone-850 pt-3 md:pt-0 md:pl-5">
                  <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Delivery Destination</span>
                  <p className="text-xs text-stone-300 font-medium">{order.deliveryLocation}</p>
                  <p className="text-[10px] text-stone-500 mt-1">To: {order.customerName} ({order.phone})</p>
                </div>
              </div>

              {/* Card Footer: Estimated Price & WhatsApp Action */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-850/60 flex-wrap gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-stone-500">Estimated Price:</span>
                  <span className="text-base font-bold text-stone-200">₹{order.estimatedPrice.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {order.fileUrl && (
                    <a
                      href={order.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-stone-950 hover:bg-stone-850 text-[10px] font-bold rounded-lg border border-stone-800 text-stone-300 hover:text-stone-100 transition-all"
                    >
                      <span>View File</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                  <a
                    href={`https://wa.me/918300483780?text=${encodeURIComponent(`Hi, I'm checking on the status of my order ${order.id}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-bold rounded-lg border border-emerald-500/20 text-emerald-500 transition-all"
                  >
                    <span>Contact Executive</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
