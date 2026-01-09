'use client';

import { useEffect, useState } from 'react';

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  todayVolume: number;
  activeDispensers: number;
}

interface RecentOrder {
  order_id: string;
  beer_name: string;
  price: number;
  status: string;
  created_at: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0,
    todayRevenue: 0,
    todayVolume: 0,
    activeDispensers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfDay = today.getTime();

      const ordersResponse = await fetch(`/api/admin/orders?from=${startOfDay}&limit=10`);

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];

        // Calculate stats
        const completedOrders = orders.filter((o: RecentOrder) => o.status === 'completed');
        const todayRevenue = completedOrders.reduce((sum: number, o: RecentOrder) => sum + o.price, 0);

        setStats({
          todayOrders: orders.length,
          todayRevenue,
          todayVolume: completedOrders.length * 500, // Approximate
          activeDispensers: 0, // Would need separate API
        });

        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      paid: 'bg-blue-100 text-blue-700',
      ready: 'bg-amber-100 text-amber-700',
      dispensing: 'bg-amber-100 text-amber-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      pending: '대기',
      paid: '결제완료',
      ready: '준비',
      dispensing: '진행중',
      completed: '완료',
      failed: '실패',
      refunded: '환불',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">오늘 주문</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}건</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">오늘 매출</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todayRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">오늘 배출량</p>
              <p className="text-2xl font-bold text-gray-900">{(stats.todayVolume / 1000).toFixed(1)}L</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">온라인 디스펜서</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeDispensers}대</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">최근 주문</h2>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            오늘 주문이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentOrders.map(order => (
              <div key={order.order_id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{order.beer_name}</p>
                  <p className="text-sm text-gray-500">
                    {formatTime(order.created_at)} · {order.order_id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900">
                    {formatCurrency(order.price)}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200">
          <a href="/admin/orders" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
            모든 주문 보기 →
          </a>
        </div>
      </div>
    </div>
  );
}
