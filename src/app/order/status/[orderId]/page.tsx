'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Order {
  order_id: string;
  venue_id: string;
  dispenser_id: string;
  dispenser_number: number;
  beer_name: string;
  volume_ml: number;
  price: number;
  status: string;
  dispensed_ml?: number;
  dispense_started_at?: number;
  dispense_completed_at?: number;
}

type OrderStatus = 'pending' | 'paid' | 'ready' | 'dispensing' | 'completed' | 'failed' | 'refunded';

const STATUS_INFO: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending: { label: '주문 대기', color: 'gray', icon: 'clock' },
  paid: { label: '결제 완료', color: 'blue', icon: 'check' },
  ready: { label: '디스펜싱 준비', color: 'amber', icon: 'ready' },
  dispensing: { label: '맥주 따르는 중...', color: 'amber', icon: 'dispensing' },
  completed: { label: '완료!', color: 'green', icon: 'success' },
  failed: { label: '실패', color: 'red', icon: 'error' },
  refunded: { label: '환불됨', color: 'gray', icon: 'refund' },
};

export default function StatusPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '상태를 불러올 수 없습니다.');
        return;
      }

      setOrder(data.order);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    fetchStatus();

    // Poll for status updates
    const interval = setInterval(() => {
      if (order?.status !== 'completed' && order?.status !== 'failed' && order?.status !== 'refunded') {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderId, order?.status, fetchStatus]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'dispensing':
        return (
          <div className="relative">
            <svg className="w-16 h-16 text-amber-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-amber-500/50 rounded-full animate-pulse"></div>
          </div>
        );
      case 'completed':
        return (
          <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-gray-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  const status = (order?.status || 'pending') as OrderStatus;
  const statusInfo = STATUS_INFO[status];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto p-4 pt-12 flex flex-col items-center">
        {/* Status Icon */}
        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${
          status === 'dispensing' ? 'bg-amber-500/20' :
          status === 'completed' ? 'bg-green-500/20' :
          status === 'failed' ? 'bg-red-500/20' :
          'bg-gray-700'
        }`}>
          {getStatusIcon(status)}
        </div>

        {/* Status Text */}
        <h1 className={`text-3xl font-bold mb-2 ${
          status === 'dispensing' ? 'text-amber-500' :
          status === 'completed' ? 'text-green-500' :
          status === 'failed' ? 'text-red-500' :
          'text-white'
        }`}>
          {statusInfo.label}
        </h1>

        {/* Progress Animation for Dispensing */}
        {status === 'dispensing' && (
          <div className="w-full max-w-xs mt-6 mb-8">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full animate-progress"></div>
            </div>
            <p className="text-gray-400 text-sm text-center mt-2">
              맥주가 나오고 있습니다. 잠시만 기다려주세요...
            </p>
          </div>
        )}

        {/* Order Info */}
        <div className="w-full bg-gray-800 rounded-xl p-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">맥주</span>
            <span className="font-semibold">{order?.beer_name}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400">디스펜서</span>
            <span className="font-semibold">{order?.dispenser_number}번</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">용량</span>
            <span className="font-semibold">{order?.volume_ml}ml</span>
          </div>

          {order?.dispensed_ml !== undefined && (
            <div className="border-t border-gray-700 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">실제 배출량</span>
                <span className="font-semibold text-amber-500">{order.dispensed_ml}ml</span>
              </div>
            </div>
          )}
        </div>

        {/* Completion Message */}
        {status === 'completed' && (
          <div className="mt-8 text-center">
            <p className="text-xl mb-2">맛있게 드세요! 🍺</p>
            <p className="text-gray-400 text-sm">
              문제가 있으시면 직원에게 문의해주세요.
            </p>
          </div>
        )}

        {/* Error Message */}
        {status === 'failed' && (
          <div className="mt-8 bg-red-900/50 border border-red-500 rounded-xl p-4 text-center">
            <p className="text-red-200 mb-2">
              죄송합니다. 디스펜싱 중 문제가 발생했습니다.
            </p>
            <p className="text-red-200/70 text-sm">
              직원에게 문의하시면 환불 처리해 드립니다.
            </p>
          </div>
        )}

        {/* Order ID */}
        <p className="text-gray-600 text-xs mt-8">
          주문번호: {order?.order_id.slice(0, 8)}
        </p>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
