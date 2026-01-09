'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Dispenser {
  dispenser_id: string;
  name?: string;
  location?: string;
  status?: string;
  last_seen?: number;
  nvs_version?: number;
}

export default function HomePage() {
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDispensers();
  }, []);

  async function fetchDispensers() {
    try {
      const res = await fetch('/api/dispensers');
      const data = await res.json();
      setDispensers(data.dispensers || []);
    } catch (err) {
      setError('디스펜서 목록을 불러오는데 실패했습니다');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(lastSeen?: number) {
    if (!lastSeen) return 'bg-gray-400';
    const diff = Date.now() - lastSeen;
    if (diff < 5 * 60 * 1000) return 'bg-green-500';
    if (diff < 30 * 60 * 1000) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function formatLastSeen(lastSeen?: number) {
    if (!lastSeen) return '알 수 없음';
    const diff = Date.now() - lastSeen;
    if (diff < 60 * 1000) return '방금 전';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}시간 전`;
    return new Date(lastSeen).toLocaleDateString('ko-KR');
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dispenser Admin</h1>
        <p className="text-gray-600 mt-1">ESP32 디스펜서 관리 시스템</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">전체 디스펜서</div>
          <div className="text-3xl font-bold text-gray-800">{dispensers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">온라인</div>
          <div className="text-3xl font-bold text-green-600">
            {dispensers.filter(d => d.last_seen && Date.now() - d.last_seen < 5 * 60 * 1000).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">오프라인</div>
          <div className="text-3xl font-bold text-red-600">
            {dispensers.filter(d => !d.last_seen || Date.now() - d.last_seen >= 5 * 60 * 1000).length}
          </div>
        </div>
      </div>

      {/* Dispenser List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">디스펜서 목록</h2>
          <button
            onClick={fetchDispensers}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : dispensers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            등록된 디스펜서가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dispensers.map((dispenser) => (
              <Link
                key={dispenser.dispenser_id}
                href={`/dispensers/${dispenser.dispenser_id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(dispenser.last_seen)}`} />
                    <div>
                      <div className="font-medium text-gray-800">
                        {dispenser.name || dispenser.dispenser_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {dispenser.location || '위치 미설정'} · {dispenser.dispenser_id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {formatLastSeen(dispenser.last_seen)}
                    </div>
                    <div className="text-xs text-gray-400">
                      NVS v{dispenser.nvs_version || 0}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
