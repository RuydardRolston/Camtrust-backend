vi.mock('sequelize', () => ({ Op: {} }));

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set test API key so controller uses mocked fetch instead of fallback
process.env.GEMINI_API_KEY = 'test-api-key';

vi.mock('../models/projectModel.js', () => ({
  default: { findByPk: vi.fn() },
}));
vi.mock('../models/milestoneModel.js', () => ({
  default: { findAll: vi.fn() },
}));
vi.mock('../models/progressReportModel.js', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../models/projectAssignmentModel.js', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticateToken: (req, res, next) => next(),
  authorizeRoles: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

// Deterministic fake Gemini response so no network calls happen in tests
vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'AI answer' }] } }],
    }),
  })
);

import Project from '../models/projectModel.js';
import ProjectAssignment from '../models/projectAssignmentModel.js';
import Milestone from '../models/milestoneModel.js';
import ProgressReport from '../models/progressReportModel.js';
import { askAssistant } from '../controllers/aiController.js';

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const baseReq = (overrides = {}) => ({
  body: { projectId: 1, question: 'How is progress?' },
  user: { userId: 10, role: 'professional' },
  ...overrides,
});

describe('askAssistant access control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Project.findByPk.mockResolvedValue({ ownerId: 99, title: 'Bridge', location: '', description: '', budget: 0, status: '', startDate: null });
    Milestone.findAll.mockResolvedValue([]);
    ProgressReport.findOne.mockResolvedValue(null);
  });

  it('returns 400 when question is missing', async () => {
    const res = mockRes();
    await askAssistant(baseReq({ body: { projectId: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows requests without projectId (general knowledge)', async () => {
    const res = mockRes();
    await askAssistant(baseReq({ body: { question: 'What is concrete?' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, response: 'AI answer' });
  });

  it('returns 404 when the project does not exist', async () => {
    Project.findByPk.mockResolvedValue(null);
    const res = mockRes();
    await askAssistant(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the user is not owner, admin or assigned', async () => {
    ProjectAssignment.findOne.mockResolvedValue(null);
    const res = mockRes();
    await askAssistant(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ProjectAssignment.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 1, professionalId: 10 } })
    );
  });

  it('allows an assigned professional without ownership', async () => {
    ProjectAssignment.findOne.mockResolvedValue({ id: 1 });
    const res = mockRes();
    await askAssistant(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, response: 'AI answer' });
  });

  it('allows the project owner directly', async () => {
    const res = mockRes();
    await askAssistant(baseReq({ user: { userId: 99, role: 'property_owner' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(ProjectAssignment.findOne).not.toHaveBeenCalled();
  });

  it('allows an administrator directly', async () => {
    const res = mockRes();
    await askAssistant(baseReq({ user: { userId: 50, role: 'administrator' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(ProjectAssignment.findOne).not.toHaveBeenCalled();
  });
});
