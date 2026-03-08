// Корневой компонент: настраивает React Router и регистрирует все страницы
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Booking from './pages/Booking'
import Confirmation from './pages/Confirmation'
import MyAppointments from './pages/MyAppointments'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout — обёртка с Header и Footer для всех страниц */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:id" element={<ServiceDetail />} />
          <Route path="booking" element={<Booking />} />
          <Route path="booking/confirmation" element={<Confirmation />} />
          <Route path="appointments" element={<MyAppointments />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
