/* eslint-disable react-refresh/only-export-components -- módulo de configuración del router, no de componentes */
import { lazy } from 'react';
import { createHashRouter } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { RouteError } from './pages/RouteError';

// Carga diferida por página: el panel principal no descarga KaTeX, Mermaid ni el SDK de IA.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewCourse = lazy(() => import('./pages/NewCourse'));
const CourseOverview = lazy(() => import('./pages/CourseOverview'));
const LessonPage = lazy(() => import('./pages/Lesson'));
const Review = lazy(() => import('./pages/Review'));
const LibraryPage = lazy(() => import('./pages/Library'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// HashRouter: funciona en cualquier hosting estático (GitHub Pages, Netlify…) sin reescrituras.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'new', element: <NewCourse /> },
      { path: 'course/:courseId', element: <CourseOverview /> },
      { path: 'course/:courseId/lesson/:lessonId', element: <LessonPage /> },
      { path: 'review', element: <Review /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
