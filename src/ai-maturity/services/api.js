/**
 * API endpoint registry for AI Maturity Assessment.
 */

const API_ENDPOINTS = Object.freeze({
  HEALTH: {
    key: 'health',
    path: '/api/health',
    method: 'GET',
    description: 'Backend liveness / readiness probe.',
  },

  GENERATE_ASSESSMENT: {
    key: 'generateAssessment',
    path: '/api/generate',
    method: 'POST',
    description: 'Validate CXO + org and generate a tailored AI-maturity questionnaire.',
    timeout: 180_000,
  },

  SAVE_ASSESSMENT: {
    key: 'saveAssessment',
    path: '/api/assessments',
    method: 'POST',
    description: 'Save or update an assessment to Azure Blob Storage.',
  },

  LIST_ASSESSMENTS: {
    key: 'listAssessments',
    path: '/api/assessments',
    method: 'GET',
    description: 'List all saved assessments (lightweight summaries).',
  },

  GET_ASSESSMENT: {
    key: 'getAssessment',
    path: '/api/assessments/:id',
    method: 'GET',
    description: 'Retrieve a single assessment by ID.',
  },

  DELETE_ASSESSMENT: {
    key: 'deleteAssessment',
    path: '/api/assessments/:id',
    method: 'DELETE',
    description: 'Delete an assessment from blob storage.',
  },

  GET_ASSESSMENT_HISTORY: {
    key: 'getAssessmentHistory',
    path: '/api/assessments/:id/history',
    method: 'GET',
    description: 'List all historical snapshots of an assessment.',
  },

  BENCHMARK_INDUSTRIES: {
    key: 'benchmarkIndustries',
    path: '/api/benchmark/industries',
    method: 'GET',
    description: 'List distinct industries with completed assessments.',
  },

  BENCHMARK: {
    key: 'benchmark',
    path: '/api/benchmark',
    method: 'GET',
    description: 'Aggregated scores per organization for the benchmark quadrant.',
  },
});

export default API_ENDPOINTS;
