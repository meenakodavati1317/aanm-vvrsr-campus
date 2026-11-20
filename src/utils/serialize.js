// Turns database documents into the compact shapes the frontend uses.
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const sStudent = (s) => ({
  id: String(s._id), roll: s.roll, name: s.name, dept: s.dept, sem: s.sem, email: s.email, phone: s.phone || '', dob: s.dob || '',
  guardian: s.guardian || '', city: s.city || '', blood: s.bloodGroup || '', year: s.admissionYear, status: s.status,
});

export const sFaculty = (f, withContact = true) => ({
  id: String(f._id), code: f.code, name: f.name, dept: f.dept, desig: f.designation, exp: f.experience,
  email: withContact ? f.email : '', phone: withContact ? (f.phone || '') : '',
  subs: (f.subjects || []).map(String), ct: f.classTeacherOf || '',
});

export const sSubject = (s) => ({ id: String(s._id), dept: s.dept, sem: s.sem, name: s.name, code: s.code, cr: s.credits });
export const sDept = (d) => ({ c: d.code, n: d.name, hod: d.hod });
export const sNotice = (n) => ({ id: String(n._id), t: n.title, b: n.body, by: n.postedBy, aud: n.audience, pri: n.priority, date: day(n.createdAt) });
export const sMedia = (m) => ({ id: String(m._id), type: m.type, title: m.title, ev: m.event, date: m.dateLabel, year: m.year, kind: m.artKind, hue: m.artHue, src: m.url || '' });
export const sRequest = (r) => ({
  id: String(r._id), role: cap(r.role), n: r.name, email: r.email, phone: r.phone || '', dept: r.dept, sem: r.sem, desig: r.designation,
  exp: r.experience, emp: r.employeeId, d: r.details || '',
});
export const sAdmin = (u) => ({ id: String(u._id), name: u.name, code: u.loginId.toUpperCase(), email: u.email, desig: u.designation || 'Administrator', primary: !!u.primary });
export const sHistory = (h) => ({ year: h.year, dept: h.dept, pass: h.pass, att: h.att, ia: h.ia, cgpa: h.cgpa, n: h.n, placed: h.placed, toppers: h.toppers || [] });

export const pct = (summary) => (summary && summary.held ? Math.round((summary.attended / summary.held) * 100) : 0);
export const key = (student, subject) => `${student}|${subject}`;
