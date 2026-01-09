export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Dispenser Admin</h1>
      <p>ESP32 Dispenser Management System</p>
      <h2>API Endpoints</h2>
      <ul>
        <li><code>GET /api/dispensers</code> - List all dispensers</li>
        <li><code>GET /api/dispensers/[id]/nvs</code> - Get NVS settings</li>
        <li><code>PUT /api/dispensers/[id]/nvs</code> - Update NVS settings</li>
        <li><code>GET /api/dispensers/[id]/status</code> - Get dispenser status</li>
        <li><code>POST /api/dispensers/[id]/permit</code> - Send dispensing permit</li>
      </ul>
    </main>
  );
}
