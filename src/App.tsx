import { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { SettingsProvider } from '@/contexts/SettingsProvider'
import { CartProvider } from '@/contexts/CartProvider'
import MainLayout from '@/layouts/MainLayout'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import Home from '@/pages/Home/Home'
import Menu from '@/pages/Menu/Menu'

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const Cart = lazy(() => import('@/pages/Cart/Cart'))
const Checkout = lazy(() => import('@/pages/Checkout/Checkout'))
const About = lazy(() => import('@/pages/About/About'))
const Contact = lazy(() => import('@/pages/Contact/Contact'))
const Track = lazy(() => import('@/pages/Track/Track'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Login = lazy(() => import('@/pages/Admin/Login'))
const Dashboard = lazy(() => import('@/pages/Admin/Dashboard'))
const Products = lazy(() => import('@/pages/Admin/Products'))
const Categories = lazy(() => import('@/pages/Admin/Categories'))
const Orders = lazy(() => import('@/pages/Admin/Orders'))
const AdminSettings = lazy(() => import('@/pages/Admin/AdminSettings'))

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-16 text-center">Chargement…</p>}>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/Restaurant-kenza">
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <Routes>
              <Route path="/admin/login" element={<Page><Login /></Page>} />
              <Route path="/admin" element={<ProtectedRoute />}>
                <Route element={<Page><AdminLayout /></Page>}>
                  <Route index element={<Page><Dashboard /></Page>} />
                  <Route path="produits" element={<Page><Products /></Page>} />
                  <Route path="categories" element={<Page><Categories /></Page>} />
                  <Route path="commandes" element={<Page><Orders /></Page>} />
                  <Route path="parametres" element={<Page><AdminSettings /></Page>} />
                </Route>
              </Route>

              <Route element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="menu" element={<Menu />} />
                <Route path="panier" element={<Page><Cart /></Page>} />
                <Route path="commander" element={<Page><Checkout /></Page>} />
                <Route path="a-propos" element={<Page><About /></Page>} />
                <Route path="contact" element={<Page><Contact /></Page>} />
                <Route path="suivi" element={<Page><Track /></Page>} />
                <Route path="*" element={<Page><NotFound /></Page>} />
              </Route>
            </Routes>
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
