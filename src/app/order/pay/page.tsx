'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Beer {
  beer_id: string;
  name: string;
  brand: string;
  style: string;
  abv: number;
}

interface Dispenser {
  dispenser_id: string;
  dispenser_number: number;
  price: number;
  volume_ml: number;
  beer: Beer;
}

interface Order {
  order_id: string;
  status: string;
}

function PayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get('venue');
  const dispenserId = searchParams.get('dispenser');

  const [dispenser, setDispenser] = useState<Dispenser | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Get dispenser info from session
    const stored = sessionStorage.getItem('selected_dispenser');
    if (!stored || !venueId || !dispenserId) {
      setError('주문 정보가 없습니다. 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    try {
      setDispenser(JSON.parse(stored));
    } catch {
      setError('주문 정보를 불러올 수 없습니다.');
    }
    setLoading(false);
  }, [venueId, dispenserId]);

  const handlePayment = async () => {
    if (!dispenser || !venueId) return;

    setProcessing(true);
    setError(null);

    try {
      // Step 1: Create order
      const customerId = sessionStorage.getItem('customer_id') || 'temp-customer';

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          dispenser_id: dispenser.dispenser_id,
          customer_id: customerId,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.error || '주문 생성에 실패했습니다.');
      }

      const createdOrderId = orderData.order.order_id;
      setOrderId(createdOrderId);

      // Step 2: Process payment
      // TODO: Integrate with Toss Payments SDK
      // For now, simulate payment process
      await new Promise(resolve => setTimeout(resolve, 1500));

      const payResponse = await fetch(`/api/orders/${createdOrderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: 'toss',
          payment_key: 'mock-payment-key-' + Date.now(),
        }),
      });

      const payData = await payResponse.json();

      if (!payResponse.ok) {
        throw new Error(payData.error || '결제 처리에 실패했습니다.');
      }

      // Navigate to ready page
      router.push(`/order/ready/${createdOrderId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 중 오류가 발생했습니다.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error && !dispenser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/order?venue=${venueId}`)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            처음으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto p-4 pt-8">
        <h1 className="text-xl font-bold text-center mb-6">결제하기</h1>

        {/* Order Summary */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-gray-400 text-sm mb-3">주문 내역</h2>

          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-xs text-gray-400">{dispenser?.beer.brand}</p>
              <p className="font-semibold">{dispenser?.beer.name}</p>
            </div>
            <span className="text-sm text-gray-400">{dispenser?.volume_ml}ml</span>
          </div>

          <div className="border-t border-gray-700 mt-4 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">결제 금액</span>
              <span className="text-2xl font-bold text-amber-500">
                {dispenser?.price.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-gray-400 text-sm mb-3">결제 수단</h2>

          <div className="space-y-2">
            <label className="flex items-center p-3 bg-gray-700 rounded-lg cursor-pointer ring-2 ring-amber-500">
              <input
                type="radio"
                name="payment"
                defaultChecked
                className="w-4 h-4 text-amber-500"
              />
              <span className="ml-3">토스페이먼츠</span>
              <span className="ml-auto text-gray-400 text-sm">카드/간편결제</span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-black font-bold py-4 rounded-xl text-lg transition-colors"
        >
          {processing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              결제 처리 중...
            </span>
          ) : (
            `${dispenser?.price.toLocaleString()}원 결제하기`
          )}
        </button>

        {/* Cancel Link */}
        <button
          onClick={() => router.back()}
          disabled={processing}
          className="w-full text-gray-400 hover:text-white py-4 text-sm"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    }>
      <PayPageContent />
    </Suspense>
  );
}
