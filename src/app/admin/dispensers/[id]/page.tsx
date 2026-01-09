'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { nvsSchema, NvsCategory, NvsField, getDefaultNvsSettings } from '@/lib/nvs-schema';

interface Dispenser {
  dispenser_id: string;
  name?: string;
  location?: string;
  status?: string;
  last_seen?: number;
  nvs_version?: number;
  nvs_settings?: Record<string, number | boolean>;
}

interface User {
  user_id: string;
  role: 'super_admin' | 'venue_owner';
}

interface VenueDispenser {
  venue_id: string;
  dispenser_id: string;
  beer_id: string;
  dispenser_number: number;
}

export default function AdminDispenserSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const dispenserId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [dispenser, setDispenser] = useState<Dispenser | null>(null);
  const [venueInfo, setVenueInfo] = useState<{ venue_id: string; venue_name: string } | null>(null);
  const [settings, setSettings] = useState<Record<string, number | boolean>>(getDefaultNvsSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['timing_normal', 'servo_angles']));

  useEffect(() => {
    checkAccessAndFetch();
  }, [dispenserId]);

  async function checkAccessAndFetch() {
    try {
      // 1. 현재 사용자 확인
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/admin/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);

      // 2. 디스펜서-매장 매핑 조회
      const vdRes = await fetch(`/api/admin/venue-dispensers?dispenser_id=${dispenserId}`);
      if (vdRes.ok) {
        const vdData = await vdRes.json();
        const venueDispensers = vdData.venue_dispensers || [];

        if (venueDispensers.length === 0) {
          // 매핑 없음 - super_admin만 접근 가능
          if (meData.user.role !== 'super_admin') {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        } else {
          // 매핑 있음 - venue owner 확인
          const venueId = venueDispensers[0].venue_id;
          const venueRes = await fetch(`/api/admin/venues/${venueId}`);

          if (venueRes.ok) {
            const venueData = await venueRes.json();
            const venue = venueData.venue;

            setVenueInfo({ venue_id: venue.venue_id, venue_name: venue.name });

            if (meData.user.role === 'venue_owner' && venue.owner_id !== meData.user.user_id) {
              setAccessDenied(true);
              setLoading(false);
              return;
            }
          }
        }
      }

      // 3. 권한 확인 후 디스펜서 정보 로드
      await fetchDispenser();
    } catch (err) {
      setError('권한 확인 중 오류가 발생했습니다');
      setLoading(false);
    }
  }

  async function fetchDispenser() {
    try {
      const res = await fetch(`/api/dispensers/${dispenserId}`);
      if (!res.ok) throw new Error('디스펜서를 찾을 수 없습니다');
      const data = await res.json();
      setDispenser(data);
      if (data.nvs_settings) {
        setSettings({ ...getDefaultNvsSettings(), ...data.nvs_settings });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/dispensers/${dispenserId}/nvs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nvs_settings: settings }),
      });

      if (!res.ok) throw new Error('저장에 실패했습니다');
      setSuccess('설정이 저장되었습니다');
      fetchDispenser();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(categoryId: string) {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  }

  function expandAll() {
    setExpandedCategories(new Set(nvsSchema.map(c => c.id)));
  }

  function collapseAll() {
    setExpandedCategories(new Set());
  }

  function handleFieldChange(key: string, value: number | boolean) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function renderField(field: NvsField) {
    const value = settings[field.key];

    if (field.type === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => handleFieldChange(field.key, e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-gray-700">{field.label}</span>
        </label>
      );
    }

    if (field.type === 'select' && field.options) {
      return (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 w-28">{field.label}</label>
          <select
            value={value as number}
            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500"
          >
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 w-28">{field.label}</label>
        <input
          type="number"
          value={value as number}
          onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
          min={field.min}
          max={field.max}
          step={field.step}
          className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-amber-500 focus:border-amber-500 text-right"
        />
        {field.unit && <span className="text-sm text-gray-500 w-12">{field.unit}</span>}
      </div>
    );
  }

  function renderCategory(category: NvsCategory) {
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
        <button
          onClick={() => toggleCategory(category.id)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{category.icon}</span>
            <div className="text-left">
              <h3 className="font-medium text-gray-800">{category.title}</h3>
              <p className="text-xs text-gray-500">{category.description}</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="px-4 py-3 space-y-3 border-t border-gray-200">
            {category.fields.map(field => (
              <div key={field.key}>
                {renderField(field)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">접근 권한이 없습니다</div>
        <p className="text-gray-500 mb-6">이 디스펜서에 대한 설정 권한이 없습니다.</p>
        <Link
          href="/admin/venue-dispensers"
          className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          디스펜서 목록으로
        </Link>
      </div>
    );
  }

  if (error && !dispenser) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/admin/venue-dispensers" className="text-amber-500 hover:underline">
          디스펜서 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/venue-dispensers" className="text-amber-500 hover:underline text-sm mb-2 inline-block">
          &larr; 디스펜서 목록으로
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {dispenser?.name || `디스펜서 ${dispenserId.slice(0, 8)}...`}
            </h1>
            <p className="text-gray-500">
              {venueInfo ? venueInfo.venue_name : dispenser?.location || '위치 미설정'}
              <span className="mx-2">·</span>
              <span className="font-mono text-sm">{dispenserId}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              NVS v{dispenser?.nvs_version || 0}
            </div>
            <div className="text-xs text-gray-400">
              최근: {dispenser?.last_seen
                ? new Date(dispenser.last_seen).toLocaleString('ko-KR')
                : '알 수 없음'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition"
          >
            모두 펼치기
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition"
          >
            모두 접기
          </button>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-amber-300 transition"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>

      {/* NVS Settings by Category */}
      <div className="space-y-3">
        {nvsSchema.map(category => renderCategory(category))}
      </div>

      {/* Bottom Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-amber-300 transition"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
      </div>
    </div>
  );
}
