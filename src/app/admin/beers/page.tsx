'use client';

import { useEffect, useState } from 'react';

interface Beer {
  beer_id: string;
  name: string;
  brand: string;
  style: string;
  abv: number;
  description?: string;
  image_url?: string;
  default_price: number;
  default_volume_ml: number;
  is_active: boolean;
  created_at: number;
}

export default function AdminBeersPage() {
  const [beers, setBeers] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    style: '',
    abv: 5.0,
    description: '',
    image_url: '',
    default_price: 6000,
    default_volume_ml: 500,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBeers();
  }, []);

  const fetchBeers = async () => {
    try {
      const response = await fetch('/api/admin/beers');
      if (response.ok) {
        const data = await response.json();
        setBeers(data.beers || []);
      }
    } catch (error) {
      console.error('Failed to fetch beers:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBeer(null);
    setFormData({
      name: '',
      brand: '',
      style: '',
      abv: 5.0,
      description: '',
      image_url: '',
      default_price: 6000,
      default_volume_ml: 500,
      is_active: true,
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (beer: Beer) => {
    setEditingBeer(beer);
    setFormData({
      name: beer.name,
      brand: beer.brand,
      style: beer.style,
      abv: beer.abv,
      description: beer.description || '',
      image_url: beer.image_url || '',
      default_price: beer.default_price,
      default_volume_ml: beer.default_volume_ml,
      is_active: beer.is_active,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingBeer
        ? `/api/admin/beers/${editingBeer.beer_id}`
        : '/api/admin/beers';
      const method = editingBeer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand,
          style: formData.style,
          abv: formData.abv,
          description: formData.description || undefined,
          image_url: formData.image_url || undefined,
          default_price: formData.default_price,
          default_volume_ml: formData.default_volume_ml,
          is_active: formData.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setShowModal(false);
      fetchBeers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (beer: Beer) => {
    if (!confirm(`"${beer.name}" 맥주를 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/admin/beers/${beer.beer_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      fetchBeers();
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
        <h1 className="text-2xl font-bold text-gray-900">맥주 관리</h1>
        <button
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          + 맥주 추가
        </button>
      </div>

      {/* Beers Grid */}
      {beers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          등록된 맥주가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {beers.map(beer => (
            <div key={beer.beer_id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {beer.image_url && (
                <div className="h-40 bg-gradient-to-b from-amber-100 to-white flex items-center justify-center">
                  <img
                    src={beer.image_url}
                    alt={beer.name}
                    className="h-36 object-contain"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400">{beer.brand}</p>
                    <h3 className="font-bold text-gray-900">{beer.name}</h3>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    beer.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {beer.is_active ? '활성' : '비활성'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>{beer.style}</span>
                  <span className="text-amber-600 font-medium">{beer.abv}%</span>
                </div>

                {beer.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{beer.description}</p>
                )}

                <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-500">{beer.default_volume_ml}ml</span>
                  <span className="font-medium text-amber-600">{formatCurrency(beer.default_price)}</span>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(beer)}
                    className="flex-1 text-amber-600 hover:bg-amber-50 py-2 rounded-lg text-sm font-medium"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(beer)}
                    className="flex-1 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-medium"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingBeer ? '맥주 수정' : '맥주 추가'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">맥주명 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">브랜드 *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">스타일 *</label>
                  <input
                    type="text"
                    value={formData.style}
                    onChange={e => setFormData({ ...formData, style: e.target.value })}
                    required
                    placeholder="Lager, IPA, Stout..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">도수 (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.abv}
                    onChange={e => setFormData({ ...formData, abv: parseFloat(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기본가격 (원) *</label>
                  <input
                    type="number"
                    value={formData.default_price}
                    onChange={e => setFormData({ ...formData, default_price: parseInt(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기본용량 (ml) *</label>
                  <input
                    type="number"
                    value={formData.default_volume_ml}
                    onChange={e => setFormData({ ...formData, default_volume_ml: parseInt(e.target.value) })}
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
