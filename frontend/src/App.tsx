import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Home             from './pages/Home'
import Services         from './pages/Services'
import ServiceDetail    from './pages/ServiceDetail'
import Booking          from './pages/Booking'
import Confirmation     from './pages/Confirmation'
import MyAppointments   from './pages/MyAppointments'
import Login            from './pages/Login'
import Profile          from './pages/Profile'

import AdminLayout      from './pages/admin/AdminLayout'
import AdminAppointments from './pages/admin/AdminAppointments'
import AdminServices    from './pages/admin/AdminServices'
import AdminDoctors     from './pages/admin/AdminDoctors'
import AdminUsers       from './pages/admin/AdminUsers'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="services/:id" element={<ServiceDetail />} />
            <Route path="booking" element={<Booking />} />
            <Route path="booking/confirmation" element={<Confirmation />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="login" element={<Login />} />

            {/* Профиль — только для авторизованных */}
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Админ-панель — только для admin */}
            <Route
              path="admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="appointments" replace />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="services"     element={<AdminServices />} />
              <Route path="doctors"      element={<AdminDoctors />} />
              <Route path="users"        element={<AdminUsers />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
