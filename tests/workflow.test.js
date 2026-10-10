import { describe, it, expect, beforeEach } from 'vitest';

const API_URL = process.env.CAMTRUST_API_URL || 'http://localhost:4000/api';

let ownerToken = null;
let adminToken = null;
let engineerToken = null;
let engineerId = null;
let createdProjectId = null;
let createdAssignmentId = null;

const emailFor = (prefix) => `${prefix}${Date.now()}@camtrust.test`;
const uniqueTitle = (suffix) => `Test Project ${suffix} ${Date.now()}`;

async function request(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(optionHeaders || {}),
    },
    ...restOptions,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

describe('CamTrust API Workflow', () => {
  it('registers a new owner and logs in', async () => {
    const signupRes = await request('/users/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'API Test Owner',
        email: emailFor('owner'),
        password: 'owner123',
        confirmPassword: 'owner123',
        role: 'property_owner',
      }),
    });

    expect(signupRes.status).toBe(201);
    expect(signupRes.data.success).toBe(true);
    expect(signupRes.data.token).toBeDefined();

    const loginRes = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: signupRes.data.user.email,
        password: 'owner123',
      }),
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data.success).toBe(true);
    expect(loginRes.data.token).toBeDefined();
    ownerToken = loginRes.data.token;
  });

  it('logs in as admin', async () => {
    const res = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@camtrust.com',
        password: 'admin123',
      }),
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.user.role).toBe('administrator');
    adminToken = res.data.token;
  });

  it('registers and logs in as engineer', async () => {
    const email = emailFor('engineer');
    const signupRes = await request('/users/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Eng. Test Engineer',
        email,
        password: 'engineer123',
        confirmPassword: 'engineer123',
        role: 'professional',
        specialty: 'Civil Engineering',
      }),
    });

    expect(signupRes.status).toBe(201);
    expect(signupRes.data.success).toBe(true);

    const res = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'engineer123',
      }),
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.user.role).toBe('professional');
    engineerToken = res.data.token;
    engineerId = res.data.user.id;

    const verifReq = await request('/verifications/request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${engineerToken}`,
      },
    });
    expect(verifReq.status).toBe(201);

    const approveVerif = await request(`/verifications/${verifReq.data.verification.id}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    expect(approveVerif.status).toBe(200);
  });

  it('creates a project as owner', async () => {
    expect(ownerToken).toBeDefined();

    const res = await request('/projects/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: uniqueTitle('create'),
        location: 'Test Location',
        description: 'Test Description',
        budget: '100000',
        startDate: '2025-01-01',
      }),
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.project.status).toBe('Under Review');
    createdProjectId = res.data.project.id;
  });

  it('rejects a project as admin', async () => {
    expect(createdProjectId).toBeDefined();

    const res = await request(`/projects/${createdProjectId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Rejected',
        rejectionReason: 'Missing site plan',
      }),
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.project.status).toBe('Rejected');
    expect(res.data.project.rejectionReason).toBe('Missing site plan');
  });

  it('creates another project and approves it', async () => {
    expect(ownerToken).toBeDefined();

    const createRes = await request('/projects/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: uniqueTitle('approve'),
        location: 'Approval Location',
        description: 'Approval Description',
        budget: '200000',
        startDate: '2025-02-01',
      }),
    });

    expect(createRes.status).toBe(201);
    expect(createRes.data.project.status).toBe('Under Review');

    const projectId = createRes.data.project.id;

    const approveRes = await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Approved',
      }),
    });

    expect(approveRes.status).toBe(200);
    expect(approveRes.data.success).toBe(true);
    expect(approveRes.data.project.status).toBe('Approved');
    createdProjectId = projectId;
  });

  it('proposes an engineer for the approved project', async () => {
    expect(createdProjectId).toBeDefined();

    const res = await request('/assignments/propose', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        projectId: createdProjectId,
        professionalId: engineerId,
      }),
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.assignment.status).toBe('proposed');
    createdAssignmentId = res.data.assignment.id;
  });

  it('rejects the assignment proposal as owner', async () => {
    expect(createdAssignmentId).toBeDefined();

    const res = await request(`/assignments/${createdAssignmentId}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.assignment.status).toBe('rejected');
  });

  it('creates another project and accepts the assignment', async () => {
    expect(ownerToken).toBeDefined();

    const createRes = await request('/projects/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        title: uniqueTitle('accept'),
        location: 'Accept Location',
        description: 'Accept Description',
        budget: '150000',
        startDate: '2025-03-01',
      }),
    });

    expect(createRes.status).toBe(201);

    const projectId = createRes.data.project.id;

    const approveRes = await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Approved',
      }),
    });

    expect(approveRes.status).toBe(200);

    const proposeRes = await request('/assignments/propose', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        projectId,
        professionalId: engineerId,
      }),
    });

    expect(proposeRes.status).toBe(201);
    const assignmentId = proposeRes.data.assignment.id;

    const acceptRes = await request(`/assignments/${assignmentId}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.data.success).toBe(true);
    expect(acceptRes.data.assignment.status).toBe('accepted');
    createdProjectId = projectId;
    createdAssignmentId = assignmentId;
  });

  it('submits a progress report as engineer', async () => {
    expect(engineerToken).toBeDefined();
    expect(createdProjectId).toBeDefined();

    const res = await request('/reports/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${engineerToken}`,
      },
      body: JSON.stringify({
        projectId: String(createdProjectId),
        summary: 'Foundation work completed successfully.',
      }),
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
  });

  it('fetches notifications for owner', async () => {
    const res = await request('/notifications', {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.notifications)).toBe(true);
  });

  it('fetches verified professionals', async () => {
    const res = await request('/users/professionals/verified', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(Array.isArray(res.data.professionals)).toBe(true);
  });
});
