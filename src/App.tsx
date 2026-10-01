/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { MagazineDetail } from './pages/MagazineDetail';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Checkout } from './pages/Checkout';
import { TrackOrder } from './pages/TrackOrder';
import { Reader } from './pages/Reader';
import { Admin } from './pages/Admin';
import { Subscribe } from './pages/Subscribe';
import { HouseCatalog } from './pages/HouseCatalog';
import { Buy } from './pages/Buy';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="magazine/:id" element={<MagazineDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="profile" element={<Profile />} />
            <Route path="checkout/:id" element={<Checkout />} />
            <Route path="subscribe" element={<Subscribe />} />
            <Route path="amini-oron-suuts" element={<HouseCatalog />} />
            <Route path="buy/:id" element={<Buy />} />
            <Route path="track" element={<TrackOrder />} />
            <Route path="read/:id" element={<Reader />} />
          </Route>
          {/* Admin has its own shell, outside the public site layout */}
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
