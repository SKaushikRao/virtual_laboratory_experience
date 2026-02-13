import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SolarSystemPage from './pages/SolarSystemPage';
import AnatomyPage from './pages/AnatomyPage';
import ChemistryPage from './pages/ChemistryPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/solar-system" element={<SolarSystemPage />} />
        <Route path="/anatomy" element={<AnatomyPage />} />
        <Route path="/chemistry" element={<ChemistryPage />} />
      </Routes>
    </Router>
  );
};

export default App;
