import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login/Login.jsx';
import CaptchaEarn from './pages/CaptchaEarn/CaptchaEarn.jsx';
import NotFound from './components/NotFound.jsx';

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={token ? <Navigate to="/captcha-earn" replace /> : <Login />} />
      <Route path="/captcha-earn" element={<Protected><CaptchaEarn /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}