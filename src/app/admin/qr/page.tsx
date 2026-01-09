'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';

interface Venue {
  venue_id: string;
  name: string;
}

interface VenueDispenser {
  venue_id: string;
  dispenser_id: string;
  dispenser_number: number;
  beer_id: string;
  beer?: {
    name: string;
    brand: string;
  };
}

export default function AdminQRPage() {
  const searchParams = useSearchParams();
  const initialVenue = searchParams.get('venue') || '';

  const [venues, setVenues] = useState<Venue[]>([]);
  const [dispensers, setDispensers] = useState<VenueDispenser[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>(initialVenue);
  const [selectedDispenser, setSelectedDispenser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [qrMode, setQrMode] = useState<'venue' | 'dispenser'>('venue');

  const venueCanvasRef = useRef<HTMLCanvasElement>(null);
  const dispenserCanvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      fetchDispensers();
      generateVenueQR();
    }
  }, [selectedVenue]);

  useEffect(() => {
    if (selectedDispenser) {
      generateDispenserQR();
    }
  }, [selectedDispenser]);

  const fetchVenues = async () => {
    try {
      const response = await fetch('/api/admin/venues');
      if (response.ok) {
        const data = await response.json();
        setVenues(data.venues || []);
        if (!selectedVenue && data.venues?.length > 0) {
          setSelectedVenue(data.venues[0].venue_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDispensers = async () => {
    try {
      const response = await fetch(`/api/admin/venue-dispensers?venue_id=${selectedVenue}`);
      if (response.ok) {
        const data = await response.json();
        setDispensers(data.venue_dispensers || []);
        if (data.venue_dispensers?.length > 0) {
          setSelectedDispenser(data.venue_dispensers[0].dispenser_id);
        } else {
          setSelectedDispenser('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch dispensers:', error);
    }
  };

  const generateVenueQR = async () => {
    if (!venueCanvasRef.current || !selectedVenue) return;

    const url = `${baseUrl}/order?venue=${selectedVenue}`;
    try {
      await QRCode.toCanvas(venueCanvasRef.current, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Failed to generate venue QR:', error);
    }
  };

  const generateDispenserQR = async () => {
    if (!dispenserCanvasRef.current || !selectedVenue || !selectedDispenser) return;

    const url = `${baseUrl}/order?venue=${selectedVenue}&dispenser=${selectedDispenser}`;
    try {
      await QRCode.toCanvas(dispenserCanvasRef.current, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Failed to generate dispenser QR:', error);
    }
  };

  const downloadQR = (canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const getVenueUrl = () => {
    return `${baseUrl}/order?venue=${selectedVenue}`;
  };

  const getDispenserUrl = () => {
    return `${baseUrl}/order?venue=${selectedVenue}&dispenser=${selectedDispenser}`;
  };

  const selectedVenueData = venues.find(v => v.venue_id === selectedVenue);
  const selectedDispenserData = dispensers.find(d => d.dispenser_id === selectedDispenser);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR 코드 생성</h1>
        <p className="text-gray-500 mt-1">매장 또는 디스펜서별 QR 코드를 생성합니다</p>
      </div>

      {/* Venue Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">매장 선택</label>
        <select
          value={selectedVenue}
          onChange={e => setSelectedVenue(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
        >
          {venues.map(venue => (
            <option key={venue.venue_id} value={venue.venue_id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>

      {/* QR Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setQrMode('venue')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            qrMode === 'venue'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          매장 QR
        </button>
        <button
          onClick={() => setQrMode('dispenser')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            qrMode === 'dispenser'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          디스펜서별 QR
        </button>
      </div>

      {qrMode === 'venue' ? (
        /* Venue QR */
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            매장 QR 코드
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            고객이 이 QR을 스캔하면 맥주 목록에서 원하는 맥주를 선택할 수 있습니다.
          </p>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <canvas ref={venueCanvasRef} />
              </div>
              <button
                onClick={() => downloadQR(venueCanvasRef.current, `qr-venue-${selectedVenueData?.name || selectedVenue}`)}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
              >
                다운로드
              </button>
            </div>

            <div className="flex-1">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">QR 정보</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">매장명</dt>
                    <dd className="font-medium text-gray-900">{selectedVenueData?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">연결 URL</dt>
                    <dd className="font-mono text-xs text-gray-700 break-all bg-white p-2 rounded border">
                      {getVenueUrl()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">용도</dt>
                    <dd className="text-gray-700">
                      매장 입구, 테이블, 메뉴판 등에 부착<br/>
                      고객이 맥주를 선택할 수 있음
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dispenser QR */
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            디스펜서별 QR 코드
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            고객이 이 QR을 스캔하면 해당 디스펜서의 맥주로 바로 결제 화면으로 이동합니다.
          </p>

          {dispensers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              이 매장에 등록된 디스펜서가 없습니다.
            </div>
          ) : (
            <>
              {/* Dispenser Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">디스펜서 선택</label>
                <select
                  value={selectedDispenser}
                  onChange={e => setSelectedDispenser(e.target.value)}
                  className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  {dispensers.sort((a, b) => a.dispenser_number - b.dispenser_number).map(dispenser => (
                    <option key={dispenser.dispenser_id} value={dispenser.dispenser_id}>
                      {dispenser.dispenser_number}번 - {dispenser.beer?.brand} {dispenser.beer?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <canvas ref={dispenserCanvasRef} />
                  </div>
                  <button
                    onClick={() => downloadQR(
                      dispenserCanvasRef.current,
                      `qr-dispenser-${selectedDispenserData?.dispenser_number}-${selectedDispenserData?.beer?.name || ''}`
                    )}
                    className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
                  >
                    다운로드
                  </button>
                </div>

                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">QR 정보</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-gray-500">디스펜서</dt>
                        <dd className="font-medium text-gray-900">
                          {selectedDispenserData?.dispenser_number}번
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">맥주</dt>
                        <dd className="font-medium text-gray-900">
                          {selectedDispenserData?.beer?.brand} {selectedDispenserData?.beer?.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">연결 URL</dt>
                        <dd className="font-mono text-xs text-gray-700 break-all bg-white p-2 rounded border">
                          {getDispenserUrl()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">용도</dt>
                        <dd className="text-gray-700">
                          각 디스펜서 앞에 부착<br/>
                          스캔 시 해당 맥주로 바로 결제
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {/* All Dispensers Grid */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">전체 디스펜서 QR 일괄 생성</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {dispensers.sort((a, b) => a.dispenser_number - b.dispenser_number).map(dispenser => (
                    <DispenserQRCard
                      key={dispenser.dispenser_id}
                      dispenser={dispenser}
                      baseUrl={baseUrl}
                      venueId={selectedVenue}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DispenserQRCard({
  dispenser,
  baseUrl,
  venueId,
}: {
  dispenser: VenueDispenser;
  baseUrl: string;
  venueId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    generateQR();
  }, [dispenser]);

  const generateQR = async () => {
    if (!canvasRef.current) return;

    const url = `${baseUrl}/order?venue=${venueId}&dispenser=${dispenser.dispenser_id}`;
    try {
      await QRCode.toCanvas(canvasRef.current, url, {
        width: 150,
        margin: 1,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('Failed to generate QR:', error);
    }
  };

  const downloadQR = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = `qr-${dispenser.dispenser_number}-${dispenser.beer?.name || dispenser.dispenser_id}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="mb-2">
        <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-700 font-bold rounded-full text-sm">
          {dispenser.dispenser_number}
        </span>
      </div>
      <canvas ref={canvasRef} className="mx-auto" />
      <p className="text-xs text-gray-600 mt-2 truncate">
        {dispenser.beer?.name || '맥주 미지정'}
      </p>
      <button
        onClick={downloadQR}
        className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
      >
        다운로드
      </button>
    </div>
  );
}
