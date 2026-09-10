import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import BookingsList from './features/bookings/BookingsList';
import BookingDetail from './features/bookings/BookingDetail';
import NewBooking from './features/bookings/NewBooking';
import CustomersList from './features/customers/CustomersList';
import PropertiesList from './features/properties/PropertiesList';
import PaymentsList from './features/payments/PaymentsList';
import OutstandingPayments from './features/payments/OutstandingPayments';
import ReportsList from './features/reports/ReportsList';
import Settings from './features/settings/Settings';

function ProtectedRoute({ session, children }: { session: any, children: React.ReactNode }) {
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [session, setSession] = useState<any>(localStorage.getItem('demo_session') === 'true');

  function handleLogin() {
    localStorage.setItem('demo_session', 'true');
    setSession(true);
  }

  function handleLogout() {
    localStorage.removeItem('demo_session');
    setSession(false);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        
        <Route path="/" element={<ProtectedRoute session={session}><AppShell onLogout={handleLogout} /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="bookings" element={<BookingsList />} />
          <Route path="bookings/new" element={<NewBooking />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="payments" element={<PaymentsList />} />
          <Route path="outstanding" element={<OutstandingPayments />} />
          <Route path="customers" element={<CustomersList />} />
          <Route path="properties" element={<PropertiesList />} />
          <Route path="reports" element={<ReportsList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
