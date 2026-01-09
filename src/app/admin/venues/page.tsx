'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Venue {
  venue_id: string;
  name: string;
  address: string;
  owner_id: string;
  business_number?: string;
  is_active: boolean;
  created_at: number;
}

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    owner_id: '',
    business_number: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch('/api/admin/venues');
      if (response.ok) {
        const data = await response.json();
        setVenues(data.venues || []);
      }
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingVenue(null);
    setFormData({
      name: '',
      address: '',
      owner_id: '',
      business_number: '',
      is_active: true,
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      address: venue.address,
      owner_id: venue.owner_id,
      business_number: venue.business_number || '',
      is_active: venue.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingVenue
        ? `/api/admin/venues/${editingVenue.venue_id}`
        : '/api/admin/venues';
      const method = editingVenue ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          owner_id: formData.owner_id || undefined,
          business_number: formData.business_number || undefined,
          is_active: formData.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setShowModal(false);
      fetchVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (venue: Venue) => {
    if (!confirm(`"${venue.name}" 매장을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/admin/venues/${venue.venue_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      fetchVenues();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR');
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
        <h1 className="text-2xl font-bold text-gray-900">매장 관리</h1>
        <button
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          + 매장 추가
        </button>
      </div>

      {/* Venues Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {venues.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            등록된 매장이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">매장명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주소</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사업자번호</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {venues.map(venue => (
                  <tr key={venue.venue_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{venue.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{venue.venue_id}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {venue.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {venue.business_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        venue.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {venue.is_active ? '운영중' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {formatDate(venue.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/qr?venue=${venue.venue_id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium mr-3"
                      >
                        QR
                      </Link>
                      <button
                        onClick={() => openEditModal(venue)}
                        className="text-amber-600 hover:text-amber-700 font-medium mr-3"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(venue)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingVenue ? '매장 수정' : '매장 추가'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">매장명 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주소 *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">운영자 ID</label>
                <input
                  type="text"
                  value={formData.owner_id}
                  onChange={e => setFormData({ ...formData, owner_id: e.target.value })}
                  placeholder="운영자 user_id"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                <input
                  type="text"
                  value={formData.business_number}
                  onChange={e => setFormData({ ...formData, business_number: e.target.value })}
                  placeholder="000-00-00000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">운영중</label>
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
