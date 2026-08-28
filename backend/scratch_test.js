/**
 * Comprehensive System Test Script
 * Verifies all API endpoints, auth flow, chat diagnosis, drug checks, emergency data, and medical history
 */
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

const runAllTests = async () => {
  console.log('🧪 Starting Full System Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Health Check
    console.log('1. Health Check Endpoint');
    const health = await request('/health');
    assert(health.status === 200 && health.data.success === true, 'GET /api/health returns 200 OK');

    // 2. Auth Flow (Register / Login / Profile)
    console.log('\n2. Authentication & Profile Flow');
    const testEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await request('/auth/register', 'POST', {
      name: 'Dr. John Watson',
      email: testEmail,
      password: 'Password123!',
      bloodGroup: 'B+',
      gender: 'male',
      dateOfBirth: '1990-05-15',
    });
    assert(regRes.status === 201 || regRes.status === 200, 'POST /api/auth/register creates user');
    const token = regRes.data?.data?.token || regRes.data?.token;
    assert(!!token, 'Auth returns JWT token');

    const loginRes = await request('/auth/login', 'POST', {
      email: testEmail,
      password: 'Password123!',
    });
    assert(loginRes.status === 200, 'POST /api/auth/login works');

    const profileRes = await request('/auth/profile', 'GET', null, token);
    const fetchedUser = profileRes.data?.data?.user;
    assert(profileRes.status === 200 && fetchedUser?.email === testEmail, 'GET /api/auth/profile returns user details');

    const updateProf = await request('/auth/profile', 'PUT', {
      allergies: ['Penicillin', 'Peanuts'],
      medications: ['Lisinopril 10mg'],
      emergencyContact: {
        name: 'Mary Watson',
        phone: '+91-9876543210',
        relation: 'Spouse'
      }
    }, token);
    const updatedUser = updateProf.data?.data?.user;
    assert(updateProf.status === 200 && updatedUser?.allergies?.includes('Penicillin'), 'PUT /api/auth/profile updates profile');

    // 3. AI Symptom Chat
    console.log('\n3. AI Symptom Chat & Diagnosis Engine');
    const chatRes = await request('/chat/analyze', 'POST', {
      message: 'I have severe chest pain radiating to my left arm, shortness of breath, and sweating.',
    }, token);
    assert(chatRes.status === 200, 'POST /api/chat/analyze receives AI analysis');
    const diagnosis = chatRes.data?.data?.diagnosis;
    assert(!!diagnosis, 'AI returns diagnosis data');
    console.log(`     Risk Level Identified: ${diagnosis?.riskLevel || 'N/A'}`);

    const convsRes = await request('/chat/conversations', 'GET', null, token);
    assert(convsRes.status === 200 && Array.isArray(convsRes.data?.data?.conversations), 'GET /api/chat/conversations lists conversations');

    // 4. Drug Interaction Engine
    console.log('\n4. Drug Interaction Checker');
    const drugSearch = await request('/drugs/search?q=aspirin', 'GET', null, token);
    assert(drugSearch.status === 200 && drugSearch.data?.data?.drugs?.length > 0, 'GET /api/drugs/search finds aspirin');

    const drugCheck = await request('/drugs/check', 'POST', {
      drugs: ['Aspirin', 'Warfarin']
    }, token);
    assert(drugCheck.status === 200 && drugCheck.data?.data?.totalInteractions > 0, 'POST /api/drugs/check detects Aspirin + Warfarin interaction');

    // 5. Emergency Services & SOS Hub
    console.log('\n5. Emergency Services API');
    const contactsRes = await request('/emergency/contacts', 'GET');
    assert(contactsRes.status === 200 && contactsRes.data?.data?.contacts?.length > 0, 'GET /api/emergency/contacts returns emergency contacts');

    const hospitalsRes = await request('/emergency/hospitals?lat=28.568&lng=77.206', 'GET');
    assert(hospitalsRes.status === 200 && hospitalsRes.data?.data?.hospitals?.length > 0, 'GET /api/emergency/hospitals returns sorted hospitals');

    const firstAidRes = await request('/emergency/first-aid', 'GET');
    assert(firstAidRes.status === 200 && Array.isArray(firstAidRes.data?.data?.topics), 'GET /api/emergency/first-aid returns first aid guides');

    const guideRes = await request('/emergency/first-aid/heart_attack', 'GET');
    assert(guideRes.status === 200 && guideRes.data?.data?.guide?.steps?.length > 0, 'GET /api/emergency/first-aid/heart_attack returns guide steps');

    // 6. Medical History CRUD
    console.log('\n6. Medical History Records CRUD');
    const createRec = await request('/history/records', 'POST', {
      type: 'diagnosis',
      title: 'Annual Cardiac Checkup',
      description: 'ECG normal, blood pressure slightly elevated.',
      date: '2026-08-01',
      doctor: 'Dr. Sarah Jenkins',
      facility: 'City Care Hospital'
    }, token);
    assert(createRec.status === 201 || createRec.status === 200, 'POST /api/history/records creates medical record');
    const recordId = createRec.data?.data?.record?._id;

    const listRecs = await request('/history/records', 'GET', null, token);
    assert(listRecs.status === 200 && listRecs.data?.data?.records?.length > 0, 'GET /api/history/records lists user records');

    if (recordId) {
      const updateRec = await request(`/history/records/${recordId}`, 'PUT', {
        type: 'diagnosis',
        title: 'Annual Cardiac Checkup - Reviewed',
        date: '2026-08-01',
      }, token);
      assert(updateRec.status === 200, 'PUT /api/history/records/:id updates record');

      const delRec = await request(`/history/records/${recordId}`, 'DELETE', null, token);
      assert(delRec.status === 200, 'DELETE /api/history/records/:id removes record');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test execution error:', err);
  }
};

runAllTests();
