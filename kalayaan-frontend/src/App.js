// App.js - app entry: Ant Design theme, error boundary, the one AuthContext, and the router.
import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import theme from './config/theme';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <ErrorBoundary>
        <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
      </ErrorBoundary>
    </ConfigProvider>
  );
}
