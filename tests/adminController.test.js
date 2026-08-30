vi.mock('sequelize', () => ({ Op: {} }));

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/projectModel.js', () => ({
  default: { count: vi.fn(), findByPk: vi.fn() },
}));
vi.mock('../models/userModel.js', () => ({
  default: { count: vi.fn(), findByPk: vi.fn() },
}));
vi.mock('../models/verificationModel.js', () => ({
  default: { count: vi.fn() },
}));
vi.mock('../models/siteEvidenceModel.js', () => ({
  default: { count: vi.fn() },
}));
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticateToken: (req, res, next) => next(),
  authorizeRoles: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

import Project from '../models/projectModel.js';
import User from '../models/userModel.js';
import Verification from '../models/verificationModel.js';
import SiteEvidence from '../models/siteEvidenceModel.js';
import { getPlatformStats, toggleUserStatus } from '../controllers/adminController.js';

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('getPlatformStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregated stats for administrators', async () => {
    Project.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    User.count.mockResolvedValue(7);
    SiteEvidence.count.mockResolvedValue(3);
    Verification.count.mockResolvedValue(2);

    const req = { user: { userId: 1, role: 'administrator' } };
    const res = mockRes();

    await getPlatformStats[2](req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        stats: expect.objectContaining({
          totalProjects: 10,
          activeProjects: 4,
          verifiedProfessionals: 7,
          evidenceSubmittedThisWeek: 3,
          pendingVerifications: 2,
        }),
      })
    );
  });

  it('returns 500 when a count query fails', async () => {
    Project.count.mockRejectedValue(new Error('db down'));

    const req = { user: { userId: 1, role: 'administrator' } };
    const res = mockRes();

    await getPlatformStats[2](req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});

describe('toggleUserStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeUser = () => ({
    id: 5,
    status: 'active',
    save: vi.fn(),
  });

  it('rejects invalid status values', async () => {
    const req = { params: { userId: '5' }, body: { status: 'paused' } };
    const res = mockRes();

    await toggleUserStatus[2](req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing user', async () => {
    User.findByPk.mockResolvedValue(null);
    const req = { params: { userId: '99' }, body: { status: 'active' } };
    const res = mockRes();

    await toggleUserStatus[2](req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates and saves the user status', async () => {
    const user = makeUser();
    User.findByPk.mockResolvedValue(user);
    const req = { params: { userId: '5' }, body: { status: 'inactive' } };
    const res = mockRes();

    await toggleUserStatus[2](req, res);

    expect(user.status).toBe('inactive');
    expect(user.save).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
