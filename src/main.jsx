import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { SystemProvider } from './system/SystemProvider.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import EventPage from './pages/EventPage.jsx';
import NotFound from './pages/NotFound.jsx';
import './styles.css';

const router = createBrowserRouter([
  { path: '/', element: <CreateEvent /> },
  { path: '/e/:eventId', element: <EventPage /> },
  { path: '*', element: <NotFound /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SystemProvider>
      <RouterProvider router={router} />
    </SystemProvider>
  </React.StrictMode>,
);
