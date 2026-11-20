// A tiny stand-in for the real backend so you can try the interface in one minute.
// No MongoDB, no npm packages: data lives in memory and resets when you stop it.
//   npm run demo      then open http://localhost:5000
// The real backend (npm start) exposes the same /api routes and keeps data in MongoDB.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generate, admissionYearFor, rollFor } from '../src/data/generate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5000;
const PASSWORD = process.env.DEFAULT_PASSWORD || 'demo1234';
const INVITE = process.env.ADMIN_INVITE_CODE || 'AV-2026';
const uploads = path.join(root, 'uploads');
fs.mkdirSync(uploads, { recursive: true });

/* ---------- data ---------- */
const g = generate();
let n = 1000;
const uid = (p) => p + ++n;
const depts = g.depts.map((d) => ({ c: d.code, n: d.name, hod: d.hod }));
const subjects = g.subjects.map((s) => ({ id: s.key, dept: s.dept, sem: s.sem, name: s.name, code: s.code, cr: s.credits }));
const students = g.students.map((s) => ({ id: s.key, roll: s.roll, name: s.name, dept: s.dept, sem: s.sem, email: s.email, phone: s.phone, dob: s.dob, guardian: s.guardian, city: s.city, blood: s.bloodGroup, year: s.admissionYear, status: s.status }));
const faculty = g.faculty.map((f) => ({ id: f.key, code: f.code, name: f.name, dept: f.dept, desig: f.designation, email: f.email, phone: f.phone, exp: f.experience, subs: [...f.subjectKeys], ct: f.classTeacherOf }));
const admins = [{ id: 'a1', name: g.admin.name, code: g.admin.code, email: g.admin.email, desig: g.admin.designation, primary: true }];
const att = {}; g.attendance.forEach((a) => { att[`${a.student}|${a.subject}`] = { held: a.held, attended: a.attended }; });
const marks = {}; g.marks.forEach((m) => { marks[`${m.student}|${m.subject}`] = { a: m.ia1, b: m.ia2, c: m.assignment }; });
const history = g.yearStats.map((h) => ({ ...h }));
const fmtDay = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
let notices = g.notices.map((x, i) => ({ id: 'n' + i, t: x.title, b: x.body, by: x.postedBy, aud: x.audience, pri: x.priority, date: fmtDay(new Date(Date.now() - x.daysAgo * 864e5)) }));
let media = g.media.map((m, i) => ({ id: 'm' + i, type: m.type, title: m.title, ev: m.event, date: m.dateLabel, year: m.year, kind: m.artKind, hue: m.artHue, src: '' }));
let requests = g.requests.map((r, i) => ({ id: 'r' + i, role: r.role[0].toUpperCase() + r.role.slice(1), n: r.name, email: r.email, phone: r.phone, dept: r.dept, sem: r.sem, desig: r.designation, exp: r.experience, emp: r.employeeId, d: r.details }));
const accounts = []; // sign-ups: { role, email, password, status, reqId, ref }
let log = g.activity.map(([actor, action], i) => [new Date(Date.now() - (i + 1) * 3600000).toTimeString().slice(0, 5), actor, action]);
const savedToday = {};
const sessions = new Map(); // token -> { role, id, name }

const addLog = (who, m) => log.unshift([new Date().toTimeString().slice(0, 5), who, m]);
const pct = (a) => (a && a.held ? Math.round((a.attended / a.held) * 100) : 0);

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, message, code) { super(message); this.status = status; this.code = code; } }
const bad = (m) => new HttpError(400, m);
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
const jsonBody = async (req) => { const b = await readBody(req); try { return b.length ? JSON.parse(b.toString()) : {}; } catch { return {}; } };

function parseMultipart(buf, contentType) {
  const boundary = '--' + /boundary=(.+)$/.exec(contentType)[1];
  const fields = {}; let file = null;
  const parts = buf.toString('latin1').split(boundary).slice(1, -1);
  for (const part of parts) {
    const cut = part.indexOf('\r\n\r\n');
    const head = part.slice(0, cut), data = part.slice(cut + 4, part.length - 2);
    const name = /name="([^"]+)"/.exec(head)?.[1];
    const filename = /filename="([^"]*)"/.exec(head)?.[1];
    if (filename !== undefined) file = { name: filename, type: /Content-Type: (.+)/i.exec(head)?.[1]?.trim() || '', data: Buffer.from(data, 'latin1') };
    else if (name) fields[name] = Buffer.from(data, 'latin1').toString('utf8');
  }
  return { fields, file };
}

const classOf = (s) => students.filter((x) => x.dept === s.dept && x.sem === s.sem);
const avgMarks = (st) => { const subs = subjects.filter((s) => s.dept === st.dept && s.sem === st.sem); return subs.reduce((t, s) => { const m = marks[`${st.id}|${s.id}`]; return t + (m ? m.a + m.b + m.c : 0); }, 0); };

function bootstrap(user) {
  const out = { me: { role: user.role, id: user.id, name: user.name }, depts, subjects, media, notices: [], students: [], faculty: [], att: {}, marks: {}, savedToday: {}, requests: [], admins: [], history: [], log: [], classInfo: null };
  const aud = user.role === 'admin' ? ['All', 'Students', 'Faculty'] : user.role === 'faculty' ? ['All', 'Faculty'] : ['All', 'Students'];
  out.notices = notices.filter((x) => aud.includes(x.aud));
  out.faculty = faculty.map((f) => (user.role === 'student' ? { ...f, email: '', phone: '' } : f));
  let list = [];
  if (user.role === 'admin') list = students;
  else if (user.role === 'faculty') {
    const me = faculty.find((f) => f.id === user.id);
    const cls = new Set(subjects.filter((s) => me.subs.includes(s.id)).map((s) => `${s.dept}-${s.sem}`));
    if (me.ct) cls.add(me.ct);
    list = students.filter((s) => cls.has(`${s.dept}-${s.sem}`));
  } else {
    const me = students.find((s) => s.id === user.id);
    list = me ? [me] : [];
    if (me) {
      const mates = classOf(me), mine = avgMarks(me), ct = faculty.find((f) => f.ct === `${me.dept}-${me.sem}`);
      out.classInfo = { key: `${me.dept}-${me.sem}`, n: mates.length, rank: mates.filter((s) => avgMarks(s) > mine).length + 1, ctId: ct ? ct.id : null };
    }
  }
  out.students = list;
  const ids = new Set(list.map((s) => s.id));
  for (const k of Object.keys(att)) if (ids.has(k.split('|')[0])) out.att[k] = pct(att[k]);
  for (const k of Object.keys(marks)) if (ids.has(k.split('|')[0])) out.marks[k] = marks[k];
  if (user.role !== 'student') { out.savedToday = { ...savedToday }; out.history = history; }
  if (user.role === 'admin') { out.requests = requests; out.admins = admins; out.log = log.slice(0, 20); }
  return out;
}

/* ---------- routes ---------- */
const routes = []; // [method, regex, roles|null, handler]
const route = (method, p, roles, fn, raw = false) => routes.push([method, new RegExp('^' + p.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), roles, fn, raw]);

route('GET', '/api/auth/departments', null, () => ({ depts }));

route('POST', '/api/auth/register', null, ({ body: b }) => {
  const role = String(b.role || '').toLowerCase();
  if (!['student', 'faculty', 'admin'].includes(role)) throw bad('Choose student, faculty or admin.');
  const email = String(b.email || '').trim().toLowerCase();
  if (!String(b.name || '').trim()) throw bad('Please enter your full name.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw bad('Please enter a valid email address.');
  if (String(b.password || '').length < 6) throw bad('The password needs at least 6 characters.');
  const taken = accounts.some((a) => a.email === email) || students.some((s) => s.email === email) || faculty.some((f) => f.email === email) || admins.some((a) => a.email === email);
  if (taken) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
  const r = { id: uid('r'), role: role[0].toUpperCase() + role.slice(1), n: b.name.trim(), email, phone: b.phone || '' };
  if (role !== 'admin') {
    r.dept = String(b.dept || '').toUpperCase();
    if (!depts.some((d) => d.c === r.dept)) throw bad('Choose a valid department.');
  }
  if (role === 'student') {
    r.sem = Number(b.sem);
    if (!(r.sem >= 1 && r.sem <= 6)) throw bad('Choose a semester from 1 to 6.');
    Object.assign(r, { dob: b.dob, guardian: b.guardian, city: b.city, d: `B.Tech ${r.dept}, Semester ${r.sem}` });
  } else if (role === 'faculty') {
    Object.assign(r, { desig: b.designation || 'Assistant Professor', exp: Number(b.experience) || 0 });
    r.d = `${r.desig}, ${r.dept}, ${r.exp} yrs${b.qualification ? ', ' + b.qualification : ''}`;
  } else {
    const c = String(b.inviteCode || '').trim();
    Object.assign(r, { desig: b.designation || 'Administrator', emp: b.employeeId });
    r.d = `${r.desig}, employee ID ${b.employeeId || 'not given'}. ${c ? (c === INVITE ? 'Valid invite code' : 'Invite code not recognised') : 'No invite code'}`;
  }
  requests.push(r);
  accounts.push({ role, email, password: b.password, status: 'pending', reqId: r.id, ref: null, name: r.n });
  return { status: 201, body: { message: 'Request sent. An admin will review it.' } };
});

route('POST', '/api/auth/login', null, ({ body: b }) => {
  const role = String(b.role || '').toLowerCase(), id = String(b.loginId || '').trim().toLowerCase();
  if (!['student', 'faculty', 'admin'].includes(role) || !id) throw bad('Enter your ID or email and your password.');
  const acc = accounts.find((a) => a.role === role && a.email === id);
  let who;
  if (acc) {
    if (acc.password !== b.password) throw new HttpError(401, 'Wrong ID, email or password.');
    if (acc.status === 'pending') throw new HttpError(403, 'Your account is waiting for admin approval. You can sign in once it is approved.', 'PENDING');
    if (acc.status === 'rejected') throw new HttpError(403, 'This request was rejected. Please contact the admin office.', 'REJECTED');
    who = { role, id: acc.ref, name: acc.name };
  } else {
    const f = role === 'student' ? students.find((s) => s.roll.toLowerCase() === id || s.email === id)
      : role === 'faculty' ? faculty.find((x) => x.code.toLowerCase() === id || x.email === id)
        : admins.find((x) => x.code.toLowerCase() === id || x.email === id);
    if (!f || b.password !== PASSWORD) throw new HttpError(401, 'Wrong ID, email or password.');
    who = { role, id: f.id, name: f.name };
  }
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, who);
  return { token, role };
});

route('GET', '/api/bootstrap', ['student', 'faculty', 'admin'], ({ user }) => bootstrap(user));

/* students */
route('POST', '/api/students', ['admin'], ({ body: b }) => {
  if (!String(b.name || '').trim()) throw bad('Student name is required.');
  const dept = String(b.dept || '').toUpperCase(), sem = Number(b.sem);
  if (!depts.some((d) => d.c === dept)) throw bad('Choose a valid department.');
  if (!(sem >= 1 && sem <= 6)) throw bad('Semester must be from 1 to 6.');
  const roll = nextRoll(dept, sem);
  const s = { id: uid('s'), roll, name: b.name.trim(), dept, sem, email: (b.email || roll.toLowerCase() + '@aanmvvrsr.edu').toLowerCase(), phone: b.phone || '', dob: b.dob || '', guardian: b.guardian || '', city: b.city || '', blood: '', year: admissionYearFor(sem), status: b.status === 'Inactive' ? 'Inactive' : 'Active' };
  students.push(s); addLog('Admin', 'Added student ' + s.name);
  return { status: 201, body: { student: s, defaultPassword: PASSWORD } };
});
function nextRoll(dept, sem) {
  const prefix = rollFor(dept, sem, 0).slice(0, -3);
  const last = students.filter((s) => s.roll.startsWith(prefix)).reduce((m, s) => Math.max(m, parseInt(s.roll.slice(-3), 10)), 0);
  return rollFor(dept, sem, last + 1);
}
route('PUT', '/api/students/:id', ['admin'], ({ params, body: b }) => {
  const s = students.find((x) => x.id === params.id); if (!s) throw new HttpError(404, 'Student not found.');
  for (const f of ['name', 'email', 'phone', 'dob', 'guardian', 'city', 'status']) if (b[f] !== undefined) s[f] = b[f];
  if (b.dept !== undefined) s.dept = String(b.dept).toUpperCase();
  if (b.sem !== undefined) s.sem = Number(b.sem);
  addLog('Admin', 'Updated student ' + s.name);
  return { student: s };
});
route('DELETE', '/api/students/:id', ['admin'], ({ params }) => {
  const i = students.findIndex((x) => x.id === params.id); if (i < 0) throw new HttpError(404, 'Student not found.');
  const [s] = students.splice(i, 1);
  for (const k of Object.keys(att)) if (k.startsWith(s.id + '|')) delete att[k];
  for (const k of Object.keys(marks)) if (k.startsWith(s.id + '|')) delete marks[k];
  addLog('Admin', 'Deleted student ' + s.name);
  return { ok: true };
});

/* faculty */
route('POST', '/api/faculty', ['admin'], ({ body: b }) => {
  if (!String(b.name || '').trim()) throw bad('Faculty name is required.');
  const dept = String(b.dept || '').toUpperCase();
  if (!depts.some((d) => d.c === dept)) throw bad('Choose a valid department.');
  const max = faculty.reduce((m, f) => Math.max(m, parseInt(f.code.split('-')[1], 10) || 0), 0);
  const f = { id: uid('f'), code: 'FAC-' + String(max + 1).padStart(4, '0'), name: b.name.trim(), dept, desig: b.desig || 'Assistant Professor', email: (b.email || b.name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.') + '@aanmvvrsr.edu').toLowerCase(), phone: b.phone || '', exp: Number(b.exp) || 0, subs: (b.subs || []).filter((id) => subjects.some((s) => s.id === id)), ct: '' };
  faculty.push(f); addLog('Admin', 'Added faculty ' + f.name);
  return { status: 201, body: { faculty: f, defaultPassword: PASSWORD } };
});
route('PUT', '/api/faculty/:id', ['admin'], ({ params, body: b }) => {
  const f = faculty.find((x) => x.id === params.id); if (!f) throw new HttpError(404, 'Faculty member not found.');
  for (const k of ['name', 'desig', 'email', 'phone']) if (b[k] !== undefined) f[k] = b[k];
  if (b.dept !== undefined) f.dept = String(b.dept).toUpperCase();
  if (b.exp !== undefined) f.exp = Number(b.exp) || 0;
  if (b.subs !== undefined) f.subs = b.subs.filter((id) => subjects.some((s) => s.id === id));
  addLog('Admin', 'Updated faculty ' + f.name);
  return { faculty: f };
});
route('DELETE', '/api/faculty/:id', ['admin'], ({ params }) => {
  const i = faculty.findIndex((x) => x.id === params.id); if (i < 0) throw new HttpError(404, 'Faculty member not found.');
  const [f] = faculty.splice(i, 1); addLog('Admin', 'Removed faculty ' + f.name);
  return { ok: true };
});

/* departments, subjects, class teachers */
route('POST', '/api/departments', ['admin'], ({ body: b }) => {
  const code = String(b.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(code)) throw bad('Use a short code of letters and numbers, for example EEE.');
  if (!String(b.name || '').trim()) throw bad('Department name is required.');
  if (depts.some((d) => d.c === code)) throw new HttpError(409, 'That department code already exists.');
  const d = { c: code, n: b.name.trim(), hod: b.hod || 'To be assigned' };
  depts.push(d); addLog('Admin', 'Added department ' + code);
  return { status: 201, body: { dept: d } };
});
route('DELETE', '/api/departments/:code', ['admin'], ({ params }) => {
  const code = params.code.toUpperCase();
  if (students.some((s) => s.dept === code) || faculty.some((f) => f.dept === code)) throw new HttpError(409, 'Move or remove its students and faculty first.');
  const i = depts.findIndex((d) => d.c === code); if (i >= 0) depts.splice(i, 1);
  for (let k = subjects.length - 1; k >= 0; k--) if (subjects[k].dept === code) subjects.splice(k, 1);
  addLog('Admin', 'Deleted department ' + code);
  return { ok: true };
});
route('POST', '/api/subjects', ['admin'], ({ body: b }) => {
  const dept = String(b.dept || '').toUpperCase(), sem = Number(b.sem);
  if (!depts.some((d) => d.c === dept)) throw bad('Choose a valid department.');
  if (!(sem >= 1 && sem <= 6)) throw bad('Semester must be from 1 to 6.');
  if (!String(b.name || '').trim()) throw bad('Subject name is required.');
  let k = subjects.filter((s) => s.dept === dept && s.sem === sem).length + 1;
  while (subjects.some((s) => s.dept === dept && s.sem === sem && s.code === `${dept}${sem}0${k}`)) k++;
  const s = { id: uid('x'), dept, sem, name: b.name.trim(), code: `${dept}${sem}0${k}`, cr: Number(b.credits) || 3 };
  subjects.push(s); addLog('Admin', 'Added subject ' + s.name);
  return { status: 201, body: { subject: s } };
});
route('DELETE', '/api/subjects/:id', ['admin'], ({ params }) => {
  const i = subjects.findIndex((x) => x.id === params.id); if (i < 0) throw new HttpError(404, 'Subject not found.');
  const [s] = subjects.splice(i, 1);
  faculty.forEach((f) => { f.subs = f.subs.filter((x) => x !== s.id); });
  for (const k of Object.keys(att)) if (k.endsWith('|' + s.id)) delete att[k];
  for (const k of Object.keys(marks)) if (k.endsWith('|' + s.id)) delete marks[k];
  addLog('Admin', 'Removed subject ' + s.name);
  return { ok: true };
});
route('PUT', '/api/classes/:key/teacher', ['admin'], ({ params, body: b }) => {
  const key = params.key.toUpperCase();
  if (!/^[A-Z0-9]+-[1-6]$/.test(key)) throw bad('Class should look like CSE-6.');
  const f = faculty.find((x) => x.id === b.facultyId); if (!f) throw new HttpError(404, 'Faculty member not found.');
  if (f.dept !== key.split('-')[0]) throw bad(`Choose a ${key.split('-')[0]} faculty member for this class.`);
  const changed = [];
  faculty.forEach((x) => { if (x.ct === key && x.id !== f.id) { x.ct = ''; changed.push({ id: x.id, ct: '' }); } });
  f.ct = key; changed.push({ id: f.id, ct: key });
  addLog('Admin', `Assigned ${f.name} as class teacher of ${key}`);
  return { faculty: changed };
});

/* attendance and marks */
function subjectFor(user, id) {
  const s = subjects.find((x) => x.id === id); if (!s) throw new HttpError(404, 'Subject not found.');
  if (user.role === 'faculty' && !faculty.find((f) => f.id === user.id)?.subs.includes(s.id)) throw new HttpError(403, 'That subject is not assigned to you.');
  return s;
}
route('POST', '/api/attendance/session', ['faculty', 'admin'], ({ user, body: b }) => {
  const s = subjectFor(user, b.subjectId);
  if (savedToday[s.id]) throw new HttpError(409, 'Attendance for this subject is already saved today.');
  const ids = new Set(classOf(s).map((x) => x.id));
  const recs = (b.records || []).filter((r) => ids.has(r.studentId));
  if (!recs.length) throw bad('There are no students to mark.');
  const updates = {};
  for (const r of recs) {
    const k = `${r.studentId}|${s.id}`, a = att[k] || (att[k] = { held: 0, attended: 0 });
    a.held++; if (r.present) a.attended++;
    updates[k] = pct(a);
  }
  savedToday[s.id] = true; addLog(user.name, 'Marked attendance: ' + s.name);
  return { updates };
});
route('PUT', '/api/attendance/correct', ['admin'], ({ body: b }) => {
  const k = `${b.studentId}|${b.subjectId}`, p = Math.max(0, Math.min(100, Number(b.percent) || 0));
  const held = att[k]?.held || 40, attended = Math.round((held * p) / 100);
  att[k] = { held, attended };
  return { percent: Math.round((attended / held) * 100) };
});
route('PUT', '/api/marks/bulk', ['faculty', 'admin'], ({ user, body: b }) => {
  const s = subjectFor(user, b.subjectId);
  const ids = new Set(classOf(s).map((x) => x.id)), clamp = (v, m) => Math.max(0, Math.min(m, Math.round(Number(v) || 0)));
  const rows = (b.rows || []).filter((r) => ids.has(r.studentId));
  if (!rows.length) throw bad('There are no marks to save.');
  rows.forEach((r) => { marks[`${r.studentId}|${s.id}`] = { a: clamp(r.a, 20), b: clamp(r.b, 20), c: clamp(r.c, 10) }; });
  addLog(user.name, 'Updated internal marks: ' + s.name);
  return { ok: true, saved: rows.length };
});

/* notices */
route('POST', '/api/notices', ['admin'], ({ body: b }) => {
  if (!String(b.title || '').trim()) throw bad('A notice needs a title.');
  const x = { id: uid('n'), t: b.title.trim(), b: b.body || 'No further details.', by: 'Admin Office', aud: ['All', 'Students', 'Faculty'].includes(b.audience) ? b.audience : 'All', pri: b.priority === 'High' ? 'High' : 'Normal', date: fmtDay(new Date()) };
  notices.unshift(x); addLog('Admin', 'Published notice: ' + x.t);
  return { status: 201, body: { notice: x } };
});
route('DELETE', '/api/notices/:id', ['admin'], ({ params }) => {
  const i = notices.findIndex((x) => x.id === params.id); if (i < 0) throw new HttpError(404, 'Notice not found.');
  notices.splice(i, 1); return { ok: true };
});

/* media */
route('POST', '/api/media', ['admin'], ({ raw, req }) => {
  const { fields, file } = parseMultipart(raw, req.headers['content-type'] || '');
  if (!file || !file.data.length) throw bad('Choose a photo or video to upload.');
  if (!/^(image|video)\//.test(file.type)) throw bad('Only photos and videos can be uploaded.');
  if (!fields.title || !fields.event) throw bad('Add a title and an event name.');
  const name = Date.now() + '-' + file.name.replace(/[^\w.-]+/g, '_');
  fs.writeFileSync(path.join(uploads, name), file.data);
  const m = { id: uid('m'), type: file.type.startsWith('video') ? 'video' : 'image', title: fields.title, ev: fields.event, date: fields.date || 'Today', year: Number(fields.year) || new Date().getFullYear(), kind: 'stage', hue: 230 + Math.floor(Math.random() * 100), src: '/uploads/' + name };
  media.unshift(m); addLog('Admin', `Uploaded ${m.type}: ${m.title}`);
  return { status: 201, body: { media: m } };
}, true);
route('PUT', '/api/media/:id', ['admin'], ({ params, body: b }) => {
  const m = media.find((x) => x.id === params.id); if (!m) throw new HttpError(404, 'Media item not found.');
  if (b.title) m.title = b.title; if (b.event) m.ev = b.event; if (b.date !== undefined) m.date = b.date;
  return { media: m };
});
route('DELETE', '/api/media/:id', ['admin'], ({ params }) => {
  const i = media.findIndex((x) => x.id === params.id); if (i < 0) throw new HttpError(404, 'Media item not found.');
  const [m] = media.splice(i, 1);
  if (m.src.startsWith('/uploads/')) fs.unlink(path.join(uploads, path.basename(m.src)), () => {});
  return { ok: true };
});

/* sign-up approvals */
route('POST', '/api/requests/:id/approve', ['admin'], ({ params }) => {
  const r = requests.find((x) => x.id === params.id); if (!r) throw new HttpError(404, 'That request is not waiting for approval.');
  const acc = accounts.find((a) => a.reqId === r.id), out = {};
  let ref;
  if (r.role === 'Student') {
    const roll = nextRoll(r.dept, r.sem);
    const s = { id: uid('s'), roll, name: r.n, dept: r.dept, sem: r.sem, email: r.email, phone: r.phone || '', dob: r.dob || '', guardian: r.guardian || '', city: r.city || '', blood: '', year: admissionYearFor(r.sem), status: 'Active' };
    students.push(s); ref = s.id; out.student = s;
  } else if (r.role === 'Faculty') {
    const max = faculty.reduce((m, f) => Math.max(m, parseInt(f.code.split('-')[1], 10) || 0), 0);
    const f = { id: uid('f'), code: 'FAC-' + String(max + 1).padStart(4, '0'), name: r.n, dept: r.dept, desig: r.desig || 'Assistant Professor', email: r.email, phone: r.phone || '', exp: r.exp || 0, subs: [], ct: '' };
    faculty.push(f); ref = f.id; out.faculty = f;
  } else {
    const max = admins.reduce((m, a) => Math.max(m, parseInt(a.code.split('-')[1], 10) || 0), 0);
    const a = { id: uid('a'), name: r.n, code: 'ADM-' + String(max + 1).padStart(4, '0'), email: r.email, desig: r.desig || 'Administrator', primary: false };
    admins.push(a); ref = a.id; out.admin = a;
  }
  if (acc) { acc.status = 'active'; acc.ref = ref; }
  requests = requests.filter((x) => x !== r); addLog('Admin', `Approved ${r.n} (${r.role})`);
  return out;
});
route('POST', '/api/requests/:id/reject', ['admin'], ({ params }) => {
  const r = requests.find((x) => x.id === params.id); if (!r) throw new HttpError(404, 'That request is not waiting for approval.');
  const acc = accounts.find((a) => a.reqId === r.id); if (acc) acc.status = 'rejected';
  requests = requests.filter((x) => x !== r); addLog('Admin', `Rejected ${r.n} (${r.role})`);
  return { ok: true };
});
route('DELETE', '/api/admins/:id', ['admin'], ({ user, params }) => {
  const a = admins.find((x) => x.id === params.id); if (!a) throw new HttpError(404, 'Admin not found.');
  if (a.primary) throw bad('The primary admin cannot be removed.');
  if (a.id === user.id) throw bad('You cannot remove the account you are signed in with.');
  admins.splice(admins.indexOf(a), 1); return { ok: true };
});

/* ---------- server ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
function serveFile(res, base, rel) {
  const file = path.join(base, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
  return true;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), p = decodeURIComponent(url.pathname);
  try {
    if (p.startsWith('/api/')) {
      const hit = routes.find(([m, re]) => m === req.method && re.test(p));
      if (!hit) throw new HttpError(404, `No route for ${req.method} ${p}`);
      const [, re, roles, fn, raw] = hit;
      let user = null;
      if (roles) {
        user = sessions.get((req.headers.authorization || '').replace(/^Bearer /, ''));
        if (!user) throw new HttpError(401, 'Please sign in again.');
        if (!roles.includes(user.role)) throw new HttpError(403, 'You do not have access to this.');
      }
      const params = re.exec(p).groups || {};
      const rawBody = raw ? await readBody(req) : null;
      const body = raw || req.method === 'GET' || req.method === 'DELETE' ? {} : await jsonBody(req);
      const out = await fn({ req, user, params, body, raw: rawBody });
      return out && out.status ? json(res, out.status, out.body) : json(res, 200, out);
    }
    if (p.startsWith('/uploads/') && serveFile(res, uploads, p.slice(9))) return;
    if (serveFile(res, path.join(root, 'public'), p === '/' ? 'index.html' : p.slice(1))) return;
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    json(res, e.status || 500, { message: e.status ? e.message : 'Something went wrong.', code: e.code });
  }
}).listen(PORT, () => {
  console.log(`AANM&VVRSR Campus demo running at http://localhost:${PORT}`);
  console.log('In-memory data, resets on restart. Log in with student AV23CSE017, faculty FAC-0231 or admin ADM-0007, password ' + PASSWORD);
});
