/**
 * Walton eService Task Management Software (TMS) Local Relay Bridge
 * Connects the Process Development Monthly Report Web App with Walton's Internal TMS
 * Target Host: http://192.168.118.138/adm/repo1/mod/tms/
 * Port: 3138
 * WALTON Hi-Tech Industries PLC
 */

const http = require('http');
const querystring = require('querystring');

const TMS_HOST = '192.168.118.138';
const TMS_PORT = 80;
const TMS_BASE_PATH = '/adm/repo1/mod/tms';
const RELAY_PORT = 3138;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Execute HTTP request to Walton TMS
 */
function makeTmsRequest(path, method, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    let postData = null;

    if (data) {
      postData = typeof data === 'string' ? data : querystring.stringify(data);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const options = {
      hostname: TMS_HOST,
      port: TMS_PORT,
      path: path,
      method: method,
      headers: headers,
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Connection to Walton TMS at ${TMS_HOST} timed out after 10s`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Log in to Walton TMS for a given employee ID and password
 */
async function loginToTms(employeeId, password) {
  const loginData = {
    user: String(employeeId).trim(),
    password: String(password).trim(),
    btn_login: 'Login'
  };

  const res = await makeTmsRequest(`${TMS_BASE_PATH}/login.php`, 'POST', loginData);
  
  // A successful login returns a 302 redirect with a Set-Cookie header
  const rawCookies = res.headers['set-cookie'] || [];
  const sessionCookie = rawCookies.map(c => c.split(';')[0]).join('; ');

  if (!sessionCookie || (res.statusCode !== 302 && res.statusCode !== 200)) {
    throw new Error(`Failed to log in to Walton TMS for Employee ID: ${employeeId}. Please check personal password.`);
  }

  // Double check if redirect is back to login.php (indicating authentication failure)
  if (res.headers['location'] && res.headers['location'].includes('login.php')) {
    throw new Error(`Invalid password for Employee ID: ${employeeId}.`);
  }

  return sessionCookie;
}

/**
 * Creates a Direct Task and marks it 100% Complete
 */
async function createAndCompleteTask(cookie, taskInfo) {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');

  // Dates formatting (Requirement 1: Assign date 7 days ago / 1st of month, Deadline tomorrow)
  let assignDate = taskInfo.startDate;
  if (!assignDate || !assignDate.includes(':')) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
    const assignObj = (sevenDaysAgo < firstOfMonth) ? firstOfMonth : sevenDaysAgo;
    assignDate = `${assignObj.getFullYear()}-${pad(assignObj.getMonth() + 1)}-${pad(assignObj.getDate())} 12:00:00`;
  }

  let deadlineDate = taskInfo.deadlineDate;
  if (!deadlineDate || !deadlineDate.includes(':')) {
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    deadlineDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())} 12:00:00`;
  }

  let totalDays = taskInfo.totalDays;
  if (!totalDays) {
    try {
      const aTime = new Date(assignDate.replace(' ', 'T')).getTime();
      const dTime = new Date(deadlineDate.replace(' ', 'T')).getTime();
      totalDays = String(Math.max(1, Math.ceil(Math.abs(dTime - aTime) / (1000 * 60 * 60 * 24))));
    } catch (e) {
      totalDays = '8';
    }
  }

  const supervisorId = taskInfo.supervisorId ? String(taskInfo.supervisorId).trim() : '44819';
  const points = (taskInfo.points !== undefined && taskInfo.points !== null && taskInfo.points !== '') 
    ? String(taskInfo.points) 
    : '50';

  // Task Category Mapping
  const rawCat = (taskInfo.category || '').toLowerCase();
  let mappedCategory = '10#sep#Process Development'; // default
  if (rawCat.includes('cost saving') && rawCat.includes('ibu')) mappedCategory = '6#sep#Cost Saving (IBU)';
  else if (rawCat.includes('cost saving')) mappedCategory = '5#sep#Cost Saving (Local)';
  else if (rawCat.includes('process extension')) mappedCategory = '7#sep#Process Extension';
  else if (rawCat.includes('process optimization')) mappedCategory = '8#sep#Process Optimization';
  else if (rawCat.includes('new model')) mappedCategory = '4#sep#New Model (Local)';
  else if (rawCat.includes('feature')) mappedCategory = '1#sep#Feature Development';
  else if (rawCat.includes('other')) mappedCategory = '44#sep#Others';

  // Step 1: Create Task Form Post
  const taskPayload = {
    task_status: '1', // Direct Task
    task_title: taskInfo.taskName || 'Engineering Task',
    task_details: taskInfo.taskDetails || '1. Engineering execution 2. Review and testing 3. Handover to production',
    assign_date: assignDate,
    dead_line_date: deadlineDate,
    total_days: totalDays,
    tpoint: points,
    tpoint2: '0',
    emp_id: supervisorId,
    supervisor: supervisorId,
    supervisor_mobile: taskInfo.supervisorMobile || '01678028434',
    assign_employee: String(taskInfo.employeeId).trim(),
    task_category: mappedCategory,
    against_by: '',
    product_id: '1', // Air Conditioner
    task_mode: '0', // General Task
    tweight: '100',
    priority: 'STANDARD',
    any_note: '',
    task_type: '1',
    btn_insert: 'Create'
  };

  const createRes = await makeTmsRequest(
    `${TMS_BASE_PATH}/index.php?m=task&&page=task&&lpage=task&a=addedit`,
    'POST',
    taskPayload,
    cookie
  );

  // Extract task ID from redirect location (e.g. index.php?m=task&&page=single_task2&a=view&&code=104812)
  let taskId = null;
  const loc = createRes.headers['location'];
  if (loc) {
    const codeMatch = loc.match(/code=(\d+)/i) || loc.match(/task_id=(\d+)/i);
    if (codeMatch) taskId = codeMatch[1];
  }

  if (!taskId && createRes.body) {
    const bodyMatch = createRes.body.match(/code=(\d+)/i) || createRes.body.match(/task_id=(\d+)/i) || createRes.body.match(/Task ID #\s*(\d+)/i);
    if (bodyMatch) taskId = bodyMatch[1];
  }

  if (!taskId) {
    throw new Error('Task was submitted, but Walton TMS did not return a valid Task ID. Please check task parameters.');
  }

  // Step 2: 100% Completion Form Post
  const statusPayload = {
    status_type: 'complete',
    task_percentage: '100',
    any_note: 'completed',
    btn_insert: 'Insert'
  };

  await makeTmsRequest(
    `${TMS_BASE_PATH}/index.php?m=task&&page=task_status&a=addedit&task_id=${taskId}`,
    'POST',
    statusPayload,
    cookie
  );

  const tmsUrl = `http://${TMS_HOST}${TMS_BASE_PATH}/index.php?m=task&&page=single_task2&a=view&&code=${taskId}`;

  return {
    taskId: taskId,
    tmsUrl: tmsUrl,
    percentage: 100,
    status: 'Complete',
    syncedAt: new Date().toISOString()
  };
}

// Create HTTP Server for Local Relay
const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Healthcheck endpoint
  if (url.pathname === '/status' && req.method === 'GET') {
    try {
      const pingRes = await makeTmsRequest(`${TMS_BASE_PATH}/login.php`, 'GET');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        relay: 'running',
        tmsReachable: (pingRes.statusCode === 200 || pingRes.statusCode === 302),
        tmsHost: TMS_HOST,
        tmsPort: TMS_PORT,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        relay: 'running',
        tmsReachable: false,
        error: err.message,
        tmsHost: TMS_HOST,
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }

  // Single Task Sync endpoint
  if (url.pathname === '/sync-task' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.employeeId) throw new Error('Missing employeeId in request');
        if (!payload.password) throw new Error('Missing password in request');
        if (!payload.taskName) throw new Error('Missing taskName in request');

        console.log(`[TMS-RELAY] Syncing task "${payload.taskName}" for ID: ${payload.employeeId}...`);

        // 1. Authenticate
        const sessionCookie = await loginToTms(payload.employeeId, payload.password);

        // 2. Create and complete 100%
        const result = await createAndCompleteTask(sessionCookie, payload);

        console.log(`[TMS-RELAY] Task ${result.taskId} created and 100% completed successfully!`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          taskId: result.taskId,
          tmsUrl: result.tmsUrl,
          percentage: result.percentage,
          employeeId: payload.employeeId,
          taskName: payload.taskName,
          syncedAt: result.syncedAt
        }));
      } catch (err) {
        console.error('[TMS-RELAY ERROR]:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err.message
        }));
      }
    });
    return;
  }

  // Batch Task Sync endpoint
  if (url.pathname === '/sync-batch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const tasks = payload.tasks || [];
        if (!Array.isArray(tasks) || tasks.length === 0) {
          throw new Error('No tasks provided for batch sync');
        }

        console.log(`[TMS-RELAY] Starting batch sync for ${tasks.length} tasks...`);
        const results = [];
        const sessions = new Map(); // employeeId -> sessionCookie cache

        for (const t of tasks) {
          const empId = String(t.employeeId).trim();
          try {
            let cookie = sessions.get(empId);
            if (!cookie) {
              cookie = await loginToTms(empId, t.password);
              sessions.set(empId, cookie);
            }
            const resData = await createAndCompleteTask(cookie, t);
            results.push({
              sourceTaskId: t.taskId || t.task_id,
              tmsTaskId: resData.taskId,
              tmsUrl: resData.tmsUrl,
              success: true,
              taskName: t.taskName
            });
          } catch (itemErr) {
            results.push({
              sourceTaskId: t.taskId || t.task_id,
              success: false,
              taskName: t.taskName,
              error: itemErr.message
            });
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          total: tasks.length,
          completed: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(RELAY_PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Walton TMS Local Relay Bridge is RUNNING!`);
  console.log(`🔗 Local Address : http://127.0.0.1:${RELAY_PORT}`);
  console.log(`🏢 Walton TMS Host: http://${TMS_HOST}:${TMS_PORT}`);
  console.log(`⚡ Ready to accept task sync requests from Web App`);
  console.log(`=======================================================`);
});
