/**
 * AI Maturity Assessment — frontend module (temporary integration).
 *
 * To remove: delete Frontend/src/ai-maturity/ and remove the
 * <Route path="/ai-maturity/*"> from App.tsx.
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import App from './App';
import Benchmark from './Benchmark';
import './styles.css';

export default function AiMaturityRoot() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<App />} />
        <Route path="benchmark" element={<Benchmark />} />
      </Route>
    </Routes>
  );
}
