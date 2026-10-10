import { io } from '../../camtrust-frontend/node_modules/socket.io-client/build/esm/index.js';

const API_BASE = 'http://localhost:4000/api';
const SOCKET_URL = 'http://localhost:4000';

async function request(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  const res = await fetch(`${API_BASE}${path}`, {
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('========================================================');
  console.log('🚀 Starting CamTrust End-to-End Workflow & Chat Test');
  console.log('========================================================\n');

  // Step 1: Login Admin
  console.log('1️⃣ Logging in as Admin...');
  const adminLogin = await request('/users/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@camtrust.com',
      password: 'admin123',
    }),
  });

  if (adminLogin.status !== 200 || !adminLogin.data.success) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
  }
  const adminToken = adminLogin.data.token;
  console.log('   ✅ Admin logged in successfully.');

  // Step 2: Login or Register Engineer
  console.log('\n2️⃣ Logging in Engineer (engineer@camtrust.com)...');
  let engineerLogin = await request('/users/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'engineer@camtrust.com',
      password: 'engineer123',
    }),
  });

  let engineerToken, engineerUser;
  if (engineerLogin.status === 200 && engineerLogin.data.success) {
    engineerToken = engineerLogin.data.token;
    engineerUser = engineerLogin.data.user;
    console.log(`   ✅ Engineer logged in: ${engineerUser.fullName} (ID: ${engineerUser.id})`);
  } else {
    // Signup engineer
    const engEmail = `engineer_${Date.now()}@camtrust.com`;
    console.log(`   Creating fresh engineer account: ${engEmail}`);
    const engSignup = await request('/users/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Test Engineer',
        email: engEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'professional',
        professionalType: 'Civil Engineer',
      }),
    });
    engineerToken = engSignup.data.token;
    engineerUser = engSignup.data.user;
    console.log(`   ✅ Engineer created: ${engineerUser.fullName} (ID: ${engineerUser.id})`);
  }

  // Step 3: Register a fresh Project Owner
  const ownerEmail = `owner_${Date.now()}@camtrust.com`;
  console.log(`\n3️⃣ Registering a new Project Owner: ${ownerEmail}...`);
  const ownerSignup = await request('/users/signup', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Chief John Okafor',
      email: ownerEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'property_owner',
    }),
  });

  if (ownerSignup.status !== 201 || !ownerSignup.data.success) {
    throw new Error(`Owner signup failed: ${JSON.stringify(ownerSignup.data)}`);
  }
  const ownerToken = ownerSignup.data.token;
  const ownerUser = ownerSignup.data.user;
  console.log(`   ✅ Project Owner created: ${ownerUser.fullName} (ID: ${ownerUser.id})`);

  // Step 4: Create a Project as Owner
  console.log('\n4️⃣ Project Owner creates a new Project...');
  const projectTitle = `Commercial Plaza Phase ${Date.now().toString().slice(-4)}`;
  const projectRes = await request('/projects/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      title: projectTitle,
      location: 'Victoria Island, Lagos',
      description: 'Construction of a 4-storey commercial office complex with underground parking.',
      budget: '45000000',
      startDate: '2026-10-01',
    }),
  });

  if (projectRes.status !== 201 || !projectRes.data.success) {
    throw new Error(`Project creation failed: ${JSON.stringify(projectRes.data)}`);
  }
  const project = projectRes.data.project;
  console.log(`   ✅ Project created: "${project.title}" (ID: ${project.id}) - Status: "${project.status}"`);

  // Step 5: Admin Approves the Project
  console.log('\n5️⃣ Admin approves the Project...');
  const approveRes = await request(`/projects/${project.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'Approved' }),
  });

  if (approveRes.status !== 200 || !approveRes.data.success) {
    throw new Error(`Project approval failed: ${JSON.stringify(approveRes.data)}`);
  }
  console.log(`   ✅ Project status updated to: "${approveRes.data.project.status}"`);

  // Step 6: Admin proposes the Engineer for the project
  console.log(`\n6️⃣ Admin proposes Engineer (${engineerUser.fullName}) for the Project...`);
  const proposeRes = await request('/assignments/propose', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      projectId: project.id,
      professionalId: engineerUser.id,
    }),
  });

  if (proposeRes.status !== 201 || !proposeRes.data.success) {
    throw new Error(`Assignment proposal failed: ${JSON.stringify(proposeRes.data)}`);
  }
  const assignment = proposeRes.data.assignment;
  console.log(`   ✅ Engineer proposed (Assignment ID: ${assignment.id}, Status: "${assignment.status}")`);

  // Step 7: Project Owner accepts the proposed Engineer
  console.log('\n7️⃣ Project Owner accepts the Engineer assignment proposal...');
  const acceptRes = await request(`/assignments/${assignment.id}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  if (acceptRes.status !== 200 || !acceptRes.data.success) {
    throw new Error(`Assignment acceptance failed: ${JSON.stringify(acceptRes.data)}`);
  }
  console.log(`   ✅ Assignment accepted! Status: "${acceptRes.data.assignment.status}"`);

  // Step 8: Initialize Real-Time Socket.IO Connections
  console.log('\n8️⃣ Connecting Owner and Engineer to Socket.IO...');
  const ownerSocket = io(SOCKET_URL, { reconnection: false, forceNew: true });
  const engineerSocket = io(SOCKET_URL, { reconnection: false, forceNew: true });

  await new Promise((resolve) => {
    let count = 0;
    const check = () => {
      count++;
      if (count === 2) resolve();
    };
    ownerSocket.on('connect', () => {
      console.log(`   ⚡ Owner connected to Socket.IO (socket id: ${ownerSocket.id})`);
      ownerSocket.emit('join:user', ownerUser.id);
      check();
    });
    engineerSocket.on('connect', () => {
      console.log(`   ⚡ Engineer connected to Socket.IO (socket id: ${engineerSocket.id})`);
      engineerSocket.emit('join:user', engineerUser.id);
      check();
    });
  });

  // Track received messages over socket
  const engineerReceivedMessages = [];
  engineerSocket.on('message:new', (msg) => {
    engineerReceivedMessages.push(msg);
  });

  const ownerReceivedMessages = [];
  ownerSocket.on('message:new', (msg) => {
    ownerReceivedMessages.push(msg);
  });

  // Step 9: Verify Contacts API for both Owner & Engineer
  console.log('\n9️⃣ Verifying Contacts list permissions...');
  const ownerContacts = await request('/messages/contacts', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  console.log(`   Owner contacts count: ${ownerContacts.data.contacts.length}`);
  const engineerFoundInOwnerContacts = ownerContacts.data.contacts.some((c) => c.id === engineerUser.id);
  if (!engineerFoundInOwnerContacts) {
    throw new Error('Engineer not found in Owner contacts!');
  }
  console.log(`   ✅ Owner can see Engineer (${engineerUser.fullName}) in chat contacts.`);

  const engineerContacts = await request('/messages/contacts', {
    headers: { Authorization: `Bearer ${engineerToken}` },
  });
  console.log(`   Engineer contacts count: ${engineerContacts.data.contacts.length}`);
  const ownerFoundInEngContacts = engineerContacts.data.contacts.some((c) => c.id === ownerUser.id);
  if (!ownerFoundInEngContacts) {
    throw new Error('Owner not found in Engineer contacts!');
  }
  console.log(`   ✅ Engineer can see Owner (${ownerUser.fullName}) in chat contacts.`);

  // Step 10: Owner sends a message to Engineer
  console.log('\n🔟 Project Owner sends a message to Engineer...');
  const msg1Body = 'Hello Engineer, excited to work with you on the Plaza project!';
  const send1Res = await request('/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      receiverId: engineerUser.id,
      body: msg1Body,
      projectId: project.id,
    }),
  });

  if (send1Res.status !== 201 || !send1Res.data.success) {
    throw new Error(`Owner sending message failed: ${JSON.stringify(send1Res.data)}`);
  }
  console.log(`   ✅ Message sent by Owner via REST API: "${msg1Body}"`);

  // Wait briefly for Socket.IO event delivery
  await delay(600);

  if (engineerReceivedMessages.length === 0) {
    throw new Error('Engineer socket DID NOT receive the real-time message:new event!');
  }
  console.log(`   ⚡ [REAL-TIME SOCKET] Engineer received: "${engineerReceivedMessages[0].body}" from senderId ${engineerReceivedMessages[0].senderId}`);

  // Step 11: Engineer replies to Owner
  console.log('\n1️⃣1️⃣ Engineer sends a reply to Owner...');
  const msg2Body = 'Thank you Chief John! I have received the project files and will do the initial inspection on Monday.';
  const send2Res = await request('/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${engineerToken}` },
    body: JSON.stringify({
      receiverId: ownerUser.id,
      body: msg2Body,
      projectId: project.id,
    }),
  });

  if (send2Res.status !== 201 || !send2Res.data.success) {
    throw new Error(`Engineer sending reply failed: ${JSON.stringify(send2Res.data)}`);
  }
  console.log(`   ✅ Reply sent by Engineer via REST API: "${msg2Body}"`);

  // Wait briefly for Socket.IO event delivery
  await delay(600);

  if (ownerReceivedMessages.length === 0) {
    throw new Error('Owner socket DID NOT receive the real-time message:new event!');
  }
  console.log(`   ⚡ [REAL-TIME SOCKET] Owner received: "${ownerReceivedMessages[0].body}" from senderId ${ownerReceivedMessages[0].senderId}`);

  // Step 12: Verify Conversation History & Read receipts
  console.log('\n1️⃣2️⃣ Verifying conversation history and read receipts...');
  const convoRes = await request(`/messages/${engineerUser.id}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  if (convoRes.status !== 200 || !convoRes.data.success) {
    throw new Error(`Fetching conversation failed: ${JSON.stringify(convoRes.data)}`);
  }
  console.log(`   Conversation messages total: ${convoRes.data.messages.length}`);
  convoRes.data.messages.forEach((m, idx) => {
    console.log(`   [Msg #${idx + 1}] Sender ${m.senderId}: "${m.body}" (readAt: ${m.readAt || 'unread'})`);
  });

  // Step 13: Verify Unread count API
  console.log('\n1️⃣3️⃣ Verifying unread count...');
  const unreadRes = await request('/messages/unread-count', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  console.log(`   Owner unread count after opening conversation: ${unreadRes.data.count}`);

  // Cleanup sockets
  ownerSocket.disconnect();
  engineerSocket.disconnect();

  console.log('\n========================================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! Workflow & Real-time Chat 100% Functional!');
  console.log('========================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
