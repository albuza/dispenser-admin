'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Beer {
  beer_id: string;
  name: string;
  brand: string;
}

interface VenueDispenser {
  venue_id: string;
  dispenser_id: string;
  beer_id: string;
  dispenser_number: number;
  position_description?: string;
  price: number;
  volume_ml: number;
  is_active: boolean;
  beer?: Beer;
}

interface Venue {
  venue_id: string;
  name: string;
}

export default function AdminVenueDispensersPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [dispensers, setDispensers] = useState<VenueDispenser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDispenser, setEditingDispenser] = useState<VenueDispenser | null>(null);
  const [formData, setFormData] = useState({
    dispenser_id: '',
    beer_id: '',
    dispenser_number: 1,
    position_description: '',
    price: 6000,
    volume_ml: 500,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedVenue) {
      fetchDispensers();
    }
  }, [selectedVenue]);

  const fetchInitialData = async () => {
    try {
      const [venuesRes, beersRes] = await Promise.all([
        fetch('/api/admin/venues'),
        fetch('/api/admin/beers'),
      ]);

      if (venuesRes.ok) {
        const data = await venuesRes.json();
        setVenues(data.venues || []);
        if (data.venues?.length > 0) {
          setSelectedVenue(data.venues[0].venue_id);
        }
      }

      if (beersRes.ok) {
        const data = await beersRes.json();
        setBeers(data.beers || []);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
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
      }
    } catch (error) {
      console.error('Failed to fetch dispensers:', error);
    }
  };

  const openCreateModal = () => {
    setEditingDispenser(null);
    setFormData({
      dispenser_id: '',
      beer_id: beers[0]?.beer_id || '',
      dispenser_number: dispensers.length + 1,
      position_description: '',
      price: 6000,
      volume_ml: 500,
      is_active: true,
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (dispenser: VenueDispenser) => {
    setEditingDispenser(dispenser);
    setFormData({
      dispenser_id: dispenser.dispenser_id,
      beer_id: dispenser.beer_id,
      dispenser_number: dispenser.dispenser_number,
      position_description: dispenser.position_description || '',
      price: dispenser.price,
      volume_ml: dispenser.volume_ml,
      is_active: dispenser.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingDispenser ? 'PUT' : 'POST';

      const response = await fetch('/api/admin/venue-dispensers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: selectedVenue,
          dispenser_id: formData.dispenser_id,
          beer_id: formData.beer_id,
          dispenser_number: formData.dispenser_number,
          position_description: formData.position_description || undefined,
          price: formData.price,
          volume_ml: formData.volume_ml,
          is_active: formData.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setShowModal(false);
      fetchDispensers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dispenser: VenueDispenser) => {
    if (!confirm(`${dispenser.dispenser_number}번 디스펜서를 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(
        `/api/admin/venue-dispensers?venue_id=${dispenser.venue_id}&dispenser_id=${dispenser.dispenser_id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      fetchDispensers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">디스펜서 관리</h1>
        <button
          onClick={openCreateModal}
          disabled={!selectedVenue}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
        >
          + 디스펜서 추가
        </button>
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

      {/* Dispensers Grid */}
      {dispensers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          이 매장에 등록된 디스펜서가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dispensers.sort((a, b) => a.dispenser_number - b.dispenser_number).map(dispenser => (
            <div key={dispenser.dispenser_id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-amber-600">{dispenser.dispenser_number}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{dispenser.beer?.name || '맥주 미지정'}</p>
                    <p className="text-xs text-gray-400">{dispenser.beer?.brand}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  dispenser.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {dispenser.is_active ? '활성' : '비활성'}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <p className="font-mono text-xs text-gray-400">{dispenser.dispenser_id}</p>
                {dispenser.position_description && (
                  <p>위치: {dispenser.position_description}</p>
                )}
                <div className="flex justify-between">
                  <span>{dispenser.volume_ml}ml</span>
                  <span className="font-medium text-amber-600">{formatCurrency(dispenser.price)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Link
                  href={`/admin/dispensers/${dispenser.dispenser_id}`}
                  className="flex-1 text-blue-600 hover:bg-blue-50 py-2 rounded-lg text-sm font-medium text-center"
                >
                  설정
                </Link>
                <button
                  onClick={() => openEditModal(dispenser)}
                  className="flex-1 text-amber-600 hover:bg-amber-50 py-2 rounded-lg text-sm font-medium"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(dispenser)}
                  className="flex-1 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-medium"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingDispenser ? '디스펜서 수정' : '디스펜서 추가'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">디스펜서 ID *</label>
                <input
                  type="text"
                  value={formData.dispenser_id}
                  onChange={e => setFormData({ ...formData, dispenser_id: e.target.value })}
                  required
                  disabled={!!editingDispenser}
                  placeholder="MAC 주소 또는 고유 ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">맥주 *</label>
                <select
                  value={formData.beer_id}
                  onChange={e => setFormData({ ...formData, beer_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  {beers.map(beer => (
                    <option key={beer.beer_id} value={beer.beer_id}>
                      {beer.brand} - {beer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">번호 *</label>
                  <input
                    type="number"
                    value={formData.dispenser_number}
                    onChange={e => setFormData({ ...formData, dispenser_number: parseInt(e.target.value) })}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">위치 설명</label>
                  <input
                    type="text"
                    value={formData.position_description}
                    onChange={e => setFormData({ ...formData, position_description: e.target.value })}
                    placeholder="입구 왼쪽"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">가격 (원) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">용량 (ml) *</label>
                  <input
                    type="number"
                    value={formData.volume_ml}
                    onChange={e => setFormData({ ...formData, volume_ml: parseInt(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">활성화</label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white rounded-lg font-medium"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
