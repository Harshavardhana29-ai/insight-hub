/**
 * Assessment domain service for AI Maturity Assessment.
 */

import httpClient from './http';
import API_ENDPOINTS from './api';

export async function checkHealth() {
  const { path, method } = API_ENDPOINTS.HEALTH;
  return httpClient.request(path, { method });
}

export async function generateAssessment({ cxo, organization, persona, industry }) {
  const { path, method, timeout } = API_ENDPOINTS.GENERATE_ASSESSMENT;
  return httpClient.request(path, {
    method,
    body: { cxo, organization, persona, industry },
    timeout,
  });
}

export async function saveAssessment(payload) {
  const { path, method } = API_ENDPOINTS.SAVE_ASSESSMENT;
  return httpClient.request(path, { method, body: payload });
}

export async function listAssessments() {
  const { path, method } = API_ENDPOINTS.LIST_ASSESSMENTS;
  return httpClient.request(path, { method });
}

export async function getAssessment(assessmentId) {
  const path = API_ENDPOINTS.GET_ASSESSMENT.path.replace(':id', assessmentId);
  return httpClient.request(path, { method: 'GET' });
}

export async function deleteAssessment(assessmentId) {
  const path = API_ENDPOINTS.DELETE_ASSESSMENT.path.replace(':id', assessmentId);
  return httpClient.request(path, { method: 'DELETE' });
}

export async function getAssessmentHistory(assessmentId) {
  const path = API_ENDPOINTS.GET_ASSESSMENT_HISTORY.path.replace(':id', assessmentId);
  return httpClient.request(path, { method: 'GET' });
}

export async function getBenchmarkIndustries() {
  const { path, method } = API_ENDPOINTS.BENCHMARK_INDUSTRIES;
  return httpClient.request(path, { method });
}

export async function getBenchmark(industry) {
  const { path, method } = API_ENDPOINTS.BENCHMARK;
  const url = industry ? `${path}?industry=${encodeURIComponent(industry)}` : path;
  return httpClient.request(url, { method });
}

const assessmentService = Object.freeze({
  checkHealth,
  generateAssessment,
  saveAssessment,
  listAssessments,
  getAssessment,
  deleteAssessment,
  getAssessmentHistory,
  getBenchmarkIndustries,
  getBenchmark,
});

export default assessmentService;
