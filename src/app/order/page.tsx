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
  description?: string;
  image_url?: string;
}

interface Dispenser {
  dispenser_id: string;
  dispenser_number: number;
  position_description?: string;
  price: number;
  volume_ml: number;
  beer: Beer;
}

interface Venue {
  venue_id: string;
  name: string;
  address: string;
}

interface VenueData {
  venue: Venue;
  dispensers: Dispenser[];
  selected_dispenser?: Dispenser;
}

function OrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get('venue');
  const dispenserId = searchParams.get('dispenser');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venueData, setVenueData] = useState<VenueData | null>(null);
  const [isAdultVerified, setIsAdultVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!venueId) {
      setError('매장 정보가 없습니다. QR 코드를 다시 스캔해주세요.');
      setLoading(false);
      return;
    }

    // Check if adult verification exists in session
    const verified = sessionStorage.getItem('adult_verified');
    if (verified === 'true') {
      setIsAdultVerified(true);
    }

    fetchVenueData();
  }, [venueId, dispenserId]);

  const fetchVenueData = async () => {
    try {
      const url = dispenserId
        ? `/api/venues/${venueId}?dispenser=${dispenserId}`
        : `/api/venues/${venueId}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '매장 정보를 불러오는데 실패했습니다.');
        return;
      }

      setVenueData(data);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdultVerification = async () => {
    setVerifying(true);

    // TODO: Implement PASS adult verification
    // For now, simulate verification
    await new Promise(resolve => setTimeout(resolve, 1500));

    sessionStorage.setItem('adult_verified', 'true');
    sessionStorage.setItem('customer_id', 'temp-customer-' + Date.now());
    setIsAdultVerified(true);
    setVerifying(false);
  };

  const handleSelectBeer = (dispenser: Dispenser) => {
    // Store selected dispenser info and navigate to payment
    sessionStorage.setItem('selected_dispenser', JSON.stringify(dispenser));
    sessionStorage.setItem('venue_id', venueId!);
    router.push(`/order/pay?venue=${venueId}&dispenser=${dispenser.dispenser_id}`);
  };

  const handleDirectPay = () => {
    if (!venueData?.selected_dispenser) return;

    sessionStorage.setItem('selected_dispenser', JSON.stringify(venueData.selected_dispenser));
    sessionStorage.setItem('venue_id', venueId!);
    router.push(`/order/pay?venue=${venueId}&dispenser=${venueData.selected_dispenser.dispenser_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  // Adult Verification Screen
  if (!isAdultVerified) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-md mx-auto p-4 pt-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-amber-500 mb-2">{venueData?.venue.name}</h1>
            <p className="text-gray-400">{venueData?.venue.address}</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h2 className="text-xl font-semibold mb-2">성인인증이 필요합니다</h2>
            <p className="text-gray-400 text-sm mb-6">
              주류 구매를 위해 만 19세 이상<br />
              성인인증이 필요합니다.
            </p>

            <button
              onClick={handleAdultVerification}
              disabled={verifying}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 text-black font-semibold py-4 rounded-lg transition-colors"
            >
              {verifying ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  인증 중...
                </span>
              ) : (
                'PASS 본인인증'
              )}
            </button>

            <p className="text-gray-500 text-xs mt-4">
              본인인증 정보는 성인 확인 목적으로만 사용됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Scenario B: Direct dispenser - show specific beer and pay button
  if (dispenserId && venueData?.selected_dispenser) {
    const dispenser = venueData.selected_dispenser;
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-md mx-auto p-4 pt-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-amber-500">{venueData.venue.name}</h1>
            <p className="text-gray-400 text-sm">디스펜서 {dispenser.dispenser_number}번</p>
          </div>

          <div className="bg-gray-800 rounded-xl overflow-hidden mb-6">
            {dispenser.beer.image_url && (
              <div className="h-48 bg-gradient-to-b from-amber-900/30 to-gray-800 flex items-center justify-center">
                <img
                  src={dispenser.beer.image_url}
                  alt={dispenser.beer.name}
                  className="h-40 object-contain"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-gray-400 text-sm">{dispenser.beer.brand}</p>
                  <h2 className="text-2xl font-bold">{dispenser.beer.name}</h2>
                </div>
                <span className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded text-sm">
                  {dispenser.beer.abv}%
                </span>
              </div>

              <p className="text-gray-400 text-sm mb-4">{dispenser.beer.style}</p>

              {dispenser.beer.description && (
                <p className="text-gray-300 text-sm mb-4">{dispenser.beer.description}</p>
              )}

              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-400">{dispenser.volume_ml}ml</span>
                  <span className="text-2xl font-bold text-amber-500">
                    {dispenser.price.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDirectPay}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-4 rounded-xl text-lg transition-colors"
          >
            결제하기
          </button>
        </div>
      </div>
    );
  }

  // Scenario A: Venue QR - show beer selection grid
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-500">{venueData?.venue.name}</h1>
          <p className="text-gray-400">{venueData?.venue.address}</p>
        </div>

        <h2 className="text-lg font-semibold mb-4">맥주를 선택하세요</h2>

        {venueData?.dispensers.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-400">현재 이용 가능한 맥주가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {venueData?.dispensers.map(dispenser => (
              <button
                key={dispenser.dispenser_id}
                onClick={() => handleSelectBeer(dispenser)}
                className="bg-gray-800 rounded-xl overflow-hidden text-left hover:ring-2 hover:ring-amber-500 transition-all"
              >
                {dispenser.beer.image_url && (
                  <div className="h-32 bg-gradient-to-b from-amber-900/20 to-gray-800 flex items-center justify-center">
                    <img
                      src={dispenser.beer.image_url}
                      alt={dispenser.beer.name}
                      className="h-28 object-contain"
                    />
                  </div>
                )}

                <div className="p-4">
                  <p className="text-gray-400 text-xs">{dispenser.beer.brand}</p>
                  <h3 className="font-bold text-lg">{dispenser.beer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{dispenser.beer.style}</span>
                    <span className="text-xs bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded">
                      {dispenser.beer.abv}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                    <span className="text-gray-400 text-sm">{dispenser.volume_ml}ml</span>
                    <span className="text-amber-500 font-bold">
                      {dispenser.price.toLocaleString()}원
                    </span>
                  </div>

                  <p className="text-gray-500 text-xs mt-2">
                    디스펜서 {dispenser.dispenser_number}번
                    {dispenser.position_description && ` · ${dispenser.position_description}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">로딩 중...</p>
        </div>
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  );
}
