
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import FamilyGraph from './features/tree/FamilyGraph';

// Placeholders for now
const Dashboard = () => <div className="p-4"><h2 className="text-2xl font-bold mb-4">Welcome to your Family Tree</h2><p>Select "Family Tree" from the sidebar to visualize your data.</p></div>;
const PeopleList = () => <div className="p-4"><h2 className="text-2xl font-bold mb-4">People Directory</h2><p>(Coming soon)</p></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="tree" element={<FamilyGraph />} />
          <Route path="people" element={<PeopleList />} />
        </Route>
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
