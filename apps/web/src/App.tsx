import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Pages (to be created)
const Dashboard = () => <div className="container-x py-8">Dashboard</div>;
const NotFound = () => <div className="container-x py-8">404 - Page Not Found</div>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-white dark:bg-gray-900">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
      {import.meta.env.VITE_ENABLE_DEBUG === 'true' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
