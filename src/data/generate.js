// Sample data generator for AANM&VVRSR Campus.
// Used by `npm run seed` (writes to MongoDB) and by `npm run demo` (in-memory demo server).
// Everything is deterministic, so every run produces the same college.
//
// Structure: 3 departments x 6 semesters = 18 classes. Each class has 40 to 60 students
// and one class teacher. Attendance and internal marks exist for every semester a student has reached.

export const CURRENT_YEAR = Number(process.env.CURRENT_YEAR) || 2026;
export const YEARS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'];

const H = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (k, a, b) => a + (H(k) % (b - a + 1));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CITIES = ['Hyderabad', 'Pune', 'Kochi', 'Jaipur', 'Bengaluru', 'Chennai', 'Nagpur', 'Indore', 'Lucknow', 'Mysuru', 'Vizag', 'Surat', 'Bhopal', 'Mumbai', 'Kolkata', 'Ahmedabad', 'Chandigarh', 'Goa'];
const BLOOD = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-'];
const FIRST = ['Aarav', 'Diya', 'Kabir', 'Ishita', 'Rohan', 'Ananya', 'Vihaan', 'Meera', 'Arjun', 'Sara', 'Nikhil', 'Tanvi', 'Karthik', 'Pooja', 'Aditya', 'Rahul', 'Neha', 'Yash', 'Sneha', 'Varun', 'Kavya', 'Siddharth', 'Priya', 'Harsha', 'Lakshmi', 'Teja', 'Sai', 'Mounika', 'Ravi', 'Divya', 'Pranav', 'Bhavana', 'Naveen', 'Swathi', 'Charan', 'Anusha', 'Manoj', 'Keerthi', 'Venkat', 'Harini', 'Dinesh', 'Jyothi', 'Ramesh', 'Sowmya', 'Kiran', 'Padma', 'Vamsi', 'Deepika', 'Surya', 'Nandini'];
const LAST = ['Rao', 'Patel', 'Nair', 'Menon', 'Das', 'Iyer', 'Gupta', 'Joshi', 'Reddy', 'Khan', 'Verma', 'Shah', 'Pillai', 'Sinha', 'Kulkarni', 'Bhat', 'Banerjee', 'Chauhan', 'Naidu', 'Varma', 'Raju', 'Sharma', 'Krishna', 'Prasad', 'Murthy', 'Babu', 'Chowdary', 'Yadav', 'Mishra', 'Kumar'];
const TF = ['Meera', 'Karan', 'Sunil', 'Anita', 'Ravi', 'Lata', 'Suresh', 'Padmaja', 'Venkat', 'Sridevi', 'Gopal', 'Rekha', 'Mahesh', 'Usha', 'Prakash', 'Vasundhara', 'Rajesh', 'Latha'];
const TL = ['Iyer', 'Mehta', 'Kapoor', 'Desai', 'Menon', 'Nair', 'Reddy', 'Rao', 'Sharma', 'Naidu', 'Varma', 'Murthy', 'Prasad', 'Krishna', 'Chowdary', 'Babu', 'Raju', 'Pillai'];

const DEPTS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication' },
  { code: 'ME', name: 'Mechanical Engineering' },
];

const SUBJECTS = {
  CSE: ['Engineering Maths I|Engineering Physics|Programming in C|Basic Electrical Engg.|Engineering Graphics',
    'Engineering Maths II|Engineering Chemistry|Data Structures|Digital Logic|Communication Skills',
    'Discrete Mathematics|Object Oriented Programming|Database Systems|Computer Organization|Design & Analysis of Algorithms',
    'Operating Systems|Computer Networks|Software Engineering|Theory of Computation|Probability & Statistics',
    'Compiler Design|Web Technologies|Artificial Intelligence|Cloud Computing|Professional Elective I',
    'Machine Learning|Cyber Security|Mobile App Development|Big Data Analytics|Major Project'],
  ECE: ['Engineering Maths I|Engineering Physics|Basic Electronics|Programming in C', 'Engineering Maths II|Network Analysis|Electronic Devices|Engineering Graphics',
    'Signals & Systems|Analog Circuits|Digital Electronics|Electromagnetic Theory', 'Linear Integrated Circuits|Analog Communication|Microcontrollers|Control Systems',
    'Digital Communication|VLSI Design|Digital Signal Processing|Antenna Theory', 'Embedded Systems|Wireless Communication|Optical Fibre Systems|Major Project'],
  ME: ['Engineering Maths I|Engineering Physics|Engineering Mechanics|Workshop Practice', 'Engineering Maths II|Engineering Chemistry|Thermodynamics|Engineering Graphics',
    'Fluid Mechanics|Strength of Materials|Manufacturing Processes|Material Science', 'Kinematics of Machinery|Heat Transfer|Metrology|Applied Thermodynamics',
    'Machine Design|Dynamics of Machinery|Turbo Machines|Operations Research', 'Refrigeration & A/C|CAD/CAM|Industrial Engineering|Major Project'],
};

const MEDIA = [
  [1, 'image', 'Inauguration of TechNova 2026', 'TechNova 2026', '18 Oct', 2026, 'tech', 262], [2, 'video', 'TechNova hackathon highlights', 'TechNova 2026', '19 Oct', 2026, 'tech', 285],
  [3, 'image', 'Rang Utsav opening dance', 'Rang Utsav 2026', '2 Nov', 2026, 'culture', 320], [4, 'image', 'Inter-department cricket final', 'Sports Meet 2026', '28 Sep', 2026, 'sports', 200],
  [5, 'video', 'Annual Day: band performance', 'Annual Day 2025', '14 Dec', 2025, 'stage', 250], [6, 'image', 'Convocation procession', 'Convocation 2025', '22 Aug', 2025, 'grad', 275],
  [7, 'image', 'Guest lecture on AI in industry', 'Guest Lecture Series', '5 Oct', 2026, 'talk', 235], [8, 'video', 'Sports Meet: 400 m relay', 'Sports Meet 2026', '28 Sep', 2026, 'sports', 170],
  [9, 'image', 'Annual Day: stage and lights', 'Annual Day 2025', '14 Dec', 2025, 'stage', 300], [10, 'image', 'Rangoli competition winners', 'Rang Utsav 2026', '2 Nov', 2026, 'culture', 340],
  [11, 'image', 'Freshers welcome programme', 'Freshers Day 2025', '6 Aug', 2025, 'culture', 20], [12, 'image', 'Hackathon winners with the principal', 'TechNova 2024', '21 Oct', 2024, 'tech', 215],
  [13, 'video', 'Independence Day march past', 'Independence Day 2024', '15 Aug', 2024, 'sports', 140], [14, 'video', 'Annual Day: group dance', 'Annual Day 2024', '16 Dec', 2024, 'stage', 330],
  [15, 'image', 'Convocation: gold medal winners', 'Convocation 2024', '24 Aug', 2024, 'grad', 45], [16, 'image', 'Alumni meet in the seminar hall', 'Alumni Meet 2023', '7 Jan', 2023, 'talk', 190],
  [17, 'image', 'Tug of war on Sports Day', 'Sports Day 2023', '10 Feb', 2023, 'sports', 90], [18, 'image', 'Founders Day celebrations', 'Founders Day 2023', '12 Sep', 2023, 'culture', 300],
];

export function admissionYearFor(sem) { return CURRENT_YEAR - Math.ceil(sem / 2); }
export function rollFor(dept, sem, pos) { return `AV${String(admissionYearFor(sem)).slice(2)}${dept}${String(pos).padStart(3, '0')}`; }

export function generate() {
  const depts = DEPTS.map((d) => ({ ...d, hod: '' }));

  // subjects, keyed like CSE61 (department, semester, position)
  const subjects = [];
  for (const d of depts) SUBJECTS[d.code].forEach((line, si) => line.split('|').forEach((name, i) => {
    subjects.push({ key: `${d.code}${si + 1}${i + 1}`, dept: d.code, sem: si + 1, name, code: `${d.code}${si + 1}0${i + 1}`, credits: i % 2 ? 3 : 4 });
  }));

  // one class per department and semester; CSE-6 first so the demo teacher is Dr. Meera Iyer
  const classKeys = [];
  depts.forEach((d) => [1, 2, 3, 4, 5, 6].forEach((s) => classKeys.push(`${d.code}-${s}`)));
  classKeys.sort((a, b) => (a === 'CSE-6' ? -1 : 0) - (b === 'CSE-6' ? -1 : 0));

  const students = [];
  let gi = 0;
  classKeys.forEach((key, ci) => {
    const [dept, sm] = key.split('-'); const sem = +sm; const n = 40 + (H(key + 'size') % 21);
    for (let p = 1; p <= n; p++) {
      let name = FIRST[(p * 7 + ci * 5) % FIRST.length] + ' ' + LAST[(p * 11 + ci * 3) % LAST.length];
      if (key === 'CSE-6' && p === 17) name = 'Aarav Rao';
      const roll = rollFor(dept, sem, p); const yr = admissionYearFor(sem); gi++;
      students.push({
        key: 's' + gi, roll, name, dept, sem, email: roll.toLowerCase() + '@aanmvvrsr.edu', phone: '9' + rnd(name + gi, 100000000, 999999999),
        dob: `${rnd(name, 1, 28)} ${MON[rnd(name + 'm', 0, 11)]} ${yr - 18}`, guardian: `Mr. ${name.split(' ')[1]} (Father)`,
        city: CITIES[rnd(name + 'c', 0, CITIES.length - 1)], bloodGroup: BLOOD[rnd(name + 'b', 0, 5)], admissionYear: yr, status: 'Active',
      });
    }
  });

  // one faculty member per class (the class teacher), who also teaches subjects in other classes of the department
  const faculty = classKeys.map((key, ci) => {
    const name = (ci % 2 === 0 ? 'Dr. ' : 'Prof. ') + TF[ci % TF.length] + ' ' + TL[ci % TL.length];
    return {
      key: 'f' + (ci + 1), code: 'FAC-' + String(231 + ci * 7).padStart(4, '0'), name, dept: key.split('-')[0],
      designation: ['Professor', 'Associate Professor', 'Assistant Professor'][ci % 3],
      email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ +/g, '.') + '@aanmvvrsr.edu',
      phone: '98' + rnd(name, 10000000, 99999999), experience: 6 + (H(name) % 14), qualification: ci % 2 === 0 ? 'Ph.D.' : 'M.Tech', subjectKeys: [], classTeacherOf: key,
    };
  });
  classKeys.forEach((key) => {
    const [dept, sm] = key.split('-'); const sem = +sm;
    subjects.filter((s) => s.dept === dept && s.sem === sem).forEach((s, i) => {
      const ck = i === 0 ? key : dept + '-' + (((sem - 1 + i) % 6) + 1);
      faculty.find((f) => f.classTeacherOf === ck).subjectKeys.push(s.key);
    });
  });
  depts.forEach((d) => { d.hod = faculty.find((f) => f.dept === d.code).name; });

  // attendance summaries and internal marks for every semester each student has reached
  const attendance = [], marks = [];
  for (const st of students) {
    for (let sem = 1; sem <= st.sem; sem++) {
      for (const sub of subjects.filter((x) => x.dept === st.dept && x.sem === sem)) {
        const k = st.key + '|' + sub.key;
        const held = 38 + rnd(k + 'h', 0, 7);
        attendance.push({ student: st.key, subject: sub.key, held, attended: Math.round(held * rnd(k + 'att', 60, 98) / 100) });
        marks.push({ student: st.key, subject: sub.key, ia1: rnd(k + 'a', 10, 19), ia2: rnd(k + 'b', 9, 19), assignment: rnd(k + 'c', 6, 10) });
      }
    }
  }

  // sample history for earlier academic years (the current year is always computed from live data)
  const yearStats = [];
  for (let yi = 0; yi < 4; yi++) {
    for (const d of depts) {
      const back = 4 - yi, j = (k, a) => rnd(d.code + yi + k, -a, a), strength = students.filter((s) => s.dept === d.code).length;
      yearStats.push({
        year: YEARS[yi], dept: d.code, att: Math.round(79 - back * 1.3 + j('a', 2)), ia: Math.round(72 - back * 1.6 + j('i', 2)), pass: Math.round(60 - back * 3 + j('p', 3)),
        cgpa: +(8.45 - back * 0.11 + j('c', 3) / 40).toFixed(2), n: Math.round(strength * (0.8 + yi * 0.05)), placed: Math.round(48 + yi * 5 + rnd(d.code + yi + 'pl', 0, 6)),
        toppers: [0, 1, 2].map((k) => ({ name: FIRST[H(d.code + yi + k) % FIRST.length] + ' ' + LAST[H(d.code + yi + k + 'l') % LAST.length], cgpa: +(9.7 - k * 0.18 - rnd(d.code + yi + k, 0, 9) / 100).toFixed(2) })),
      });
    }
  }

  const notices = [
    { title: 'Mid-semester exams begin 24 Nov', body: 'Seating plan will be posted on the notice board by 20 Nov. Carry your ID card.', postedBy: 'Exam Cell', audience: 'All', priority: 'High', daysAgo: 2 },
    { title: 'Internal marks submission deadline', body: 'Faculty must enter IA-2 marks for all subjects by 22 Nov.', postedBy: 'Admin Office', audience: 'Faculty', priority: 'High', daysAgo: 3 },
    { title: 'TechNova hackathon registrations open', body: 'Teams of up to four. Register at the student desk before 19 Nov.', postedBy: 'Dr. Meera Iyer', audience: 'Students', priority: 'Normal', daysAgo: 4 },
    { title: 'Library closes early on Saturday', body: 'Reading room closes at 1 pm for stock verification.', postedBy: 'Library', audience: 'All', priority: 'Normal', daysAgo: 5 },
    { title: 'Fee and fine payment window', body: 'Pending fines can be cleared at the accounts counter until 30 Nov.', postedBy: 'Accounts', audience: 'Students', priority: 'Normal', daysAgo: 6 },
  ];

  const media = MEDIA.map(([n, type, title, event, dateLabel, year, artKind, artHue]) => ({ type, title, event, dateLabel, year, artKind, artHue, url: '', order: n }));

  const requests = [
    { role: 'student', name: 'Prisha Menon', email: 'prisha.menon@example.com', phone: '9876500011', dept: 'CSE', sem: 1, details: 'B.Tech CSE, Semester 1' },
    { role: 'faculty', name: 'Dr. Rakesh Pillai', email: 'rakesh.pillai@example.com', phone: '9876500022', dept: 'CSE', designation: 'Associate Professor', experience: 12, qualification: 'Ph.D.', details: 'Associate Professor, CSE, 12 yrs, Ph.D.' },
    { role: 'admin', name: 'Sunita Rao', email: 'sunita.rao@example.com', phone: '9876500033', designation: 'Exam Cell Coordinator', employeeId: 'EMP-2291', details: 'Exam Cell Coordinator, employee ID EMP-2291. Valid invite code' },
  ];

  const admin = { code: 'ADM-0007', name: 'Principal Office Admin', email: 'admin@aanmvvrsr.edu', designation: 'Registrar', primary: true };
  const activity = [['Admin', 'Approved Aditi Seth (Student)'], ['Dr. Meera Iyer', 'Uploaded IA-2 marks, CSE sem 6'], ['Admin', 'Added subject Cloud Computing']];

  return { depts, subjects, classKeys, students, faculty, attendance, marks, yearStats, notices, media, requests, admin, activity };
}
