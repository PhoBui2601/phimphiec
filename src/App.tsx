/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Category from './pages/Category';
import Genre from './pages/Genre';
import Country from './pages/Country';
import MovieDetail from './pages/MovieDetail';
import Watch from './pages/Watch';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import SearchPage from './pages/Search';
import Embed from './pages/Embed';
import AIChatBot from './components/AIChatBot';
import GlobalLoader from './components/GlobalLoader';
import { AnimatePresence } from 'motion/react';

const AppLayout = () => {
  const location = useLocation();
  const isEmbed = location.pathname.startsWith('/embed');

  return (
    <div className={`flex flex-col min-h-screen bg-slate-900 text-white font-sans ${isEmbed ? 'h-screen overflow-hidden' : ''}`}>
      {!isEmbed && <Header />}
      <GlobalLoader />
      <main className={isEmbed ? 'h-screen w-screen overflow-hidden' : 'flex-grow'}>
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/genre/:slug" element={<Genre />} />
            <Route path="/country/:slug" element={<Country />} />
            <Route path="/movie/:slug" element={<MovieDetail />} />
            <Route path="/watch/:slug" element={<Watch />} />
            <Route path="/embed/:slug" element={<Embed />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isEmbed && <Footer />}
      {!isEmbed && <AIChatBot />}
    </div>
  );
};

export default function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <Router>
          <AppLayout />
        </Router>
      </AuthProvider>
    </LoadingProvider>
  );
}


