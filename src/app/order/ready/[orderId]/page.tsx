'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Order {
  order_id: string;
  venue_id: string;
  dispenser_id: string;
  dispenser_number: number;
  beer_name: string;
  volume_ml: number;
  price: number;
  status: string;
}

export default function ReadyPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '주문 정보를 불러올 수 없습니다.');
        return;
      }

      setOrder(data.order);

      // If already dispensing or completed, redirect
      if (data.order.status === 'dispensing' || data.order.status === 'completed') {
        router.push(`/order/status/${orderId}`);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    if (!order) return;

    setDispensing(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/dispense`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '디스펜싱 시작에 실패했습니다.');
      }

      // Navigate to status page
      router.push(`/order/status/${orderId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setDispensing(false);
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 max-w-md mx-auto p-4 pt-12 flex flex-col">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-500 mb-2">결제 완료!</h1>
          <p className="text-gray-400">디스펜서에서 맥주를 받으세요</p>
        </div>

        {/* Dispenser Location */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-2">디스펜서 번호</p>
          <p className="text-6xl font-bold text-amber-500 mb-4">
            {order?.dispenser_number}
          </p>
          <p className="text-gray-300">{order?.beer_name}</p>
          <p className="text-gray-400 text-sm">{order?.volume_ml}ml</p>
        </div>

        {/* Instructions */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-amber-200 text-sm">
              <p className="font-semibold mb-1">이용 안내</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-200/80">
                <li>디스펜서 {order?.dispenser_number}번으로 이동하세요</li>
                <li>컵을 노즐 아래에 준비하세요</li>
                <li>아래 버튼을 눌러 맥주를 따르세요</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Dispense Button */}
        <div className="mt-auto pb-8">
          <button
            onClick={handleDispense}
            disabled={dispensing}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-black font-bold py-6 rounded-xl text-xl transition-colors shadow-lg shadow-amber-500/20"
          >
            {dispensing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                시작 중...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                맥주 따르기
              </span>
            )}
          </button>

          <p className="text-gray-500 text-xs text-center mt-4">
            버튼을 누르면 자동으로 맥주가 나옵니다
          </p>
        </div>
      </div>
    </div>
  );
}
