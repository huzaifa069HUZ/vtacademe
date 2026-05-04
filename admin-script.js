import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDocsFromCache, getDocsFromServer, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, onSnapshot, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBnXG_U4eWP_lS-5SyoPfk9h0WdVNAZbYc",
    authDomain: "vt-academy-37e0e.firebaseapp.com",
    projectId: "vt-academy-37e0e",
    storageBucket: "vt-academy-37e0e.firebasestorage.app",
    messagingSenderId: "498511573525",
    appId: "1:498511573525:web:4e41cd8322a1c813f2941c",
    measurementId: "G-8KZ5F4JBGE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence (cache data in IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Persistence failed:", err.code);
});

// Global State
let studentsList = [];
const MASTER_PASSWORD = "21DEVHUZAIFA";

// DOM Elements
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginAlert = document.getElementById("loginAlert");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const studentCardGrid = document.getElementById("studentCardGrid");
const searchInput = document.getElementById("searchInput");

// Init Auth Check
if (localStorage.getItem("vt_admin_logged_in") === "true") {
    showDashboard();
}

// Login Handler
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = document.getElementById("loginPassword").value;

    if (password === MASTER_PASSWORD) {
        localStorage.setItem("vt_admin_logged_in", "true");
        showDashboard();
    } else {
        showAlert("Incorrect password. Access denied.", "red");
    }
});

function showDashboard() {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    fetchStudents();
}

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("vt_admin_logged_in");
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    document.getElementById("loginPassword").value = "";
    loginAlert.classList.add("hidden");
});

function showAlert(msg, color) {
    loginAlert.classList.remove("hidden", "bg-red-50", "text-red-600", "border-red-200", "bg-green-50", "text-green-600", "border-green-200");
    loginAlert.classList.add(`bg-${color}-50`, `text-${color}-600`, `border-${color}-200`);
    loginAlert.textContent = msg;
}

// Fetch Students — tries cache first for instant load, then syncs from server
async function fetchStudents() {
    // Show loading spinner
    if (studentCardGrid) {
        studentCardGrid.innerHTML = '<div class="col-span-full py-16 text-center"><div class="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div><p class="mt-4 text-slate-400 text-sm font-medium">Loading students...</p></div>';
    }

    const studentsRef = collection(db, "students");
    let loadedFromCache = false;

    // Step 1: Try loading from cache first (instant)
    try {
        const cacheSnapshot = await getDocsFromCache(studentsRef);
        if (!cacheSnapshot.empty) {
            studentsList = [];
            cacheSnapshot.forEach((d) => studentsList.push({ id: d.id, ...d.data() }));
            studentsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            renderStudents(studentsList);
            updateDashboardStats(studentsList);
            loadedFromCache = true;
        }
    } catch (e) {
        // No cache available, that's fine
    }

    // Step 2: Always fetch from server to get latest data
    try {
        const serverSnapshot = await getDocsFromServer(studentsRef);
        studentsList = [];
        serverSnapshot.forEach((d) => studentsList.push({ id: d.id, ...d.data() }));
        studentsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        renderStudents(studentsList);
        updateDashboardStats(studentsList);
    } catch (error) {
        console.error("Server fetch failed:", error);
        // If we already loaded from cache, that's okay — user sees cached data
        if (!loadedFromCache) {
            // Last resort: try default getDocs (uses cache if available)
            try {
                const fallbackSnapshot = await getDocs(studentsRef);
                studentsList = [];
                fallbackSnapshot.forEach((d) => studentsList.push({ id: d.id, ...d.data() }));
                studentsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                renderStudents(studentsList);
                updateDashboardStats(studentsList);
            } catch (err2) {
                console.error("All fetch methods failed:", err2);
                if (studentCardGrid) {
                    studentCardGrid.innerHTML = '<div class="col-span-full py-12 text-center text-red-500 font-bold">Could not load students. Check your internet connection.<br><button onclick="window.retryFetch()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Retry</button></div>';
                }
            }
        }
    }
}

window.retryFetch = () => fetchStudents();

// Render Students Cards
function renderStudents(data) {
    studentCardGrid.innerHTML = "";
    
    if (data.length === 0) {
        studentCardGrid.innerHTML = '<div class="col-span-full py-16 text-center text-slate-400 font-medium italic">No students registered yet.</div>';
        return;
    }

    data.forEach(student => {
        const tFees = Number(student.feesTotal) || 0;
        const pFees = Number(student.feesPaid) || 0;
        const due = tFees - pFees;
        
        let statusBadge = '';
        let statusDot = '';
        if (tFees === 0) {
            statusBadge = '<span class="px-2.5 py-1 bg-gray-100 text-gray-500 text-[9px] font-black uppercase rounded-lg tracking-widest">Unset</span>';
            statusDot = 'bg-gray-400';
        } else if (due <= 0) {
            statusBadge = '<span class="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-lg tracking-widest">Paid</span>';
            statusDot = 'bg-emerald-500';
        } else {
            statusBadge = '<span class="px-2.5 py-1 bg-red-100 text-red-600 text-[9px] font-black uppercase rounded-lg tracking-widest">\u20B9' + due.toLocaleString('en-IN') + ' Due</span>';
            statusDot = 'bg-red-500';
        }

        const initials = (student.name || 'U').split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();
        const admId = student.admissionNo || student.formNo || student.id.slice(0, 6);

        let avatarHtml = '';
        if (student.photoBase64) {
            avatarHtml = '<img src="' + student.photoBase64 + '" class="w-full h-full object-cover rounded-xl" alt="">';
        } else {
            avatarHtml = '<span class="text-sm font-black text-slate-500">' + initials + '</span>';
        }

        let newWebLeadDot = '';
        if (student.source === 'admission' && !student.admissionNo) {
            newWebLeadDot = '<span class="absolute -top-2 -right-2 flex h-5 w-5 z-10" title="New Web Registration">' +
                                '<span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color: #ef4444;"></span>' +
                                '<span class="relative inline-flex rounded-full h-5 w-5 border-2 border-white" style="background-color: #ef4444; box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;"></span>' +
                            '</span>';
        }

        const card = document.createElement('div');
        card.className = 'relative bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-[0_4px_15px_rgba(59,130,246,0.08)] transition-all group mt-2';
        
        card.innerHTML = newWebLeadDot +
            '<div class="flex items-start gap-3 mb-3">' +
                '<div class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">' +
                    avatarHtml +
                '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-2 mb-0.5">' +
                        '<h3 class="text-[14px] font-black text-[#0B2447] truncate">' + (student.name || 'Unnamed') + '</h3>' +
                        '<div class="w-1.5 h-1.5 rounded-full ' + statusDot + ' shrink-0"></div>' +
                    '</div>' +
                    '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">' + admId + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center flex-wrap gap-2 mb-3">' +
                (student.course || student.batch ? '<span class="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase rounded-lg tracking-wide border border-blue-100">' + (student.course || student.batch) + '</span>' : '') +
                statusBadge +
                (student.phone ? '<span class="px-2.5 py-1 bg-slate-50 text-slate-500 text-[9px] font-bold rounded-lg tracking-wide border border-slate-100 ml-auto"><i data-lucide="phone" class="w-3 h-3 inline-block mr-1 -mt-px"></i>' + student.phone + '</span>' : '') +
            '</div>' +
            '<div class="flex items-center gap-2 pt-3 border-t border-slate-50">' +
                '<button onclick="window.editStudent(\'' + student.id + '\')" class="flex-1 py-2 text-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase tracking-widest border border-blue-100">Edit</button>' +
                '<button onclick="window.deleteStudent(\'' + student.id + '\')" class="py-2 px-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors text-[10px] font-bold uppercase tracking-widest border border-red-100"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>' +
            '</div>';

        studentCardGrid.appendChild(card);
    });
    
    lucide.createIcons();
}

function updateDashboardStats(data) {
    document.getElementById("statTotalStudents").textContent = data.length;
    // Update fee overview whenever students load
    renderFeeOverview(data);
}

function renderFeeOverview(data) {
    var overviewEl = document.getElementById('feeOverviewSection');
    if (!overviewEl) return;

    // === HARDCODED FIXED TABS ===
    var FIXED_TABS = [
        { key: 'all',      label: 'All Students' },
        { key: 'Class 11', label: 'Class 11' },
        { key: 'Class 12', label: 'Class 12' }
    ];

    var activeFilter = overviewEl.dataset.activeFilter || 'all';

    // Filter students for active tab
    var filtered = activeFilter === 'all'
        ? data
        : data.filter(function(s) { return (s.course || '').trim() === activeFilter; });

    // Compute totals for active tab
    var totalExpected = 0, totalPaid = 0, totalDue = 0;
    filtered.forEach(function(s) {
        var t = Number(s.feesTotal) || 0;
        var p = Number(s.feesPaid) || 0;
        totalExpected += t;
        totalPaid += p;
        totalDue += Math.max(0, t - p);
    });
    var collectionPct = totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(0) : 0;
    var withDues = filtered.filter(function(s) {
        return (Number(s.feesTotal) || 0) > (Number(s.feesPaid) || 0);
    }).length;

    // === SUBJECT-WISE COLLECTION ===
    var SUBJECTS = ['Physics', 'Chemistry', 'Maths', 'Bio'];
    var knownClasses = ['class 7','class 8','class 9','class 10','class 11','class 12'];
    var subjectTotals = {};
    var subjectStudentCount = {};
    SUBJECTS.forEach(function(sub) { subjectTotals[sub] = 0; subjectStudentCount[sub] = 0; });

    // Use ALL data (not just active tab filter) for subject totals so it's always global
    data.forEach(function(s) {
        var rawStd = s.std || '';
        var subs = rawStd.split(',').map(function(x){ return x.trim(); }).filter(function(x){
            return x && knownClasses.indexOf(x.toLowerCase()) === -1;
        });
        if (subs.length === 0) return;
        var paid = Number(s.feesPaid) || 0;
        var sharePerSub = paid / subs.length;
        subs.forEach(function(sub) {
            if (subjectTotals.hasOwnProperty(sub)) {
                subjectTotals[sub] += sharePerSub;
                subjectStudentCount[sub]++;
            }
        });
    });

    // Build tab buttons
    var tabsHtml = FIXED_TABS.map(function(tab) {
        var isActive = activeFilter === tab.key;
        var count = tab.key === 'all'
            ? data.length
            : data.filter(function(s){ return (s.course||'').trim() === tab.key; }).length;
        return '<button onclick="window.setFeeOverviewFilter(\'' + tab.key + '\')" ' +
            'class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ' +
            (isActive ? 'bg-[#0B2447] text-white border-[#0B2447] shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600') + '">' +
            tab.label +
            ' <span class="ml-1 text-[8px] px-1.5 py-0.5 rounded-full ' + (isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400') + '">' + count + '</span>' +
        '</button>';
    }).join('');

    // Build student rows
    var rowsHtml = '';
    if (filtered.length === 0) {
        rowsHtml = '<div class="text-center text-slate-400 text-xs py-8 font-semibold">No students in ' + (activeFilter === 'all' ? 'the system' : activeFilter) + ' yet.</div>';
    } else {
        filtered.forEach(function(s) {
            var t = Number(s.feesTotal) || 0;
            var p = Number(s.feesPaid) || 0;
            var due = Math.max(0, t - p);
            var isPaid  = t > 0 && due <= 0;
            var isUnset = t === 0;
            var statusBg   = isUnset ? 'bg-slate-100 text-slate-400' : isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600';
            var statusText = isUnset ? 'Unset' : isPaid ? 'Paid \u2713' : '\u20B9' + due.toLocaleString('en-IN') + ' Due';
            var perc = t > 0 ? Math.min(100, (p / t) * 100) : 0;
            var barColor = isPaid ? '#10b981' : perc > 50 ? '#f59e0b' : '#ef4444';
            var initials = (s.name || 'U').split(' ').map(function(w){return w.charAt(0);}).join('').slice(0,2).toUpperCase();
            var cls = (s.course || '');

            rowsHtml +=
                '<div class="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 -mx-1 px-1 rounded-lg transition-colors">' +
                    '<div class="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[9px] font-black text-blue-600 shrink-0">' + initials + '</div>' +
                    '<div class="flex-1 min-w-0">' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="text-xs font-bold text-[#0B2447] truncate">' + (s.name || 'Unnamed') + '</span>' +
                            (activeFilter === 'all' && cls ? '<span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 shrink-0">' + cls + '</span>' : '') +
                        '</div>' +
                        '<div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">' + (s.admissionNo || s.formNo || s.id.slice(0,6)) + '</div>' +
                        '<div class="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">' +
                            '<div style="width:' + perc.toFixed(0) + '%;background:' + barColor + ';height:100%;border-radius:9999px;transition:width 0.5s ease;"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="text-right shrink-0 ml-2">' +
                        '<span class="inline-block text-[9px] font-black px-2 py-0.5 rounded-lg ' + statusBg + '">' + statusText + '</span>' +
                        '<div class="text-[9px] text-slate-400 mt-0.5">\u20B9' + p.toLocaleString('en-IN') + ' / \u20B9' + t.toLocaleString('en-IN') + '</div>' +
                    '</div>' +
                '</div>';
        });
    }

    overviewEl.innerHTML =
        '<div class="flex items-center justify-between mb-4">' +
            '<h3 class="text-xs font-black text-[#0B2447] uppercase tracking-widest flex items-center gap-2">' +
                '<svg class="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>' +
                'Fee Collection Overview' +
            '</h3>' +
        '</div>' +
        '<div class="flex flex-wrap gap-2 mb-5">' + tabsHtml + '</div>' +
        '<div class="grid grid-cols-3 gap-3 mb-5">' +
            '<div class="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">' +
                '<div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expected</div>' +
                '<div class="text-base font-black text-[#0B2447]">&#8377;' + totalExpected.toLocaleString('en-IN') + '</div>' +
                '<div class="text-[9px] text-slate-400 mt-0.5">' + filtered.length + ' student' + (filtered.length !== 1 ? 's' : '') + '</div>' +
            '</div>' +
            '<div class="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">' +
                '<div class="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Collected</div>' +
                '<div class="text-base font-black text-emerald-700">&#8377;' + totalPaid.toLocaleString('en-IN') + '</div>' +
                '<div class="text-[9px] text-emerald-400 mt-0.5">' + collectionPct + '% of expected</div>' +
            '</div>' +
            '<div class="bg-red-50 rounded-xl p-3 text-center border border-red-100">' +
                '<div class="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-1">Pending</div>' +
                '<div class="text-base font-black text-red-600">&#8377;' + totalDue.toLocaleString('en-IN') + '</div>' +
                '<div class="text-[9px] text-red-300 mt-0.5">' + withDues + ' with dues</div>' +
            '</div>' +
        '</div>' +
        (function() {
            var subjectColors = {
                'Physics':   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon: '⚛️' },
                'Chemistry': { bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-700', icon: '🧪' },
                'Maths':     { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', icon: '📐' },
                'Bio':       { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',icon: '🌿' }
            };
            var subHtml = SUBJECTS.map(function(sub) {
                var c = subjectColors[sub];
                var amt = Math.round(subjectTotals[sub]);
                var cnt = subjectStudentCount[sub];
                return '<div class="' + c.bg + ' ' + c.border + ' border rounded-xl p-3 text-center">' +
                    '<div class="text-base mb-0.5">' + c.icon + '</div>' +
                    '<div class="text-[9px] font-black uppercase tracking-widest ' + c.text + ' mb-1">' + sub + '</div>' +
                    '<div class="text-sm font-black ' + c.text + '">&#8377;' + amt.toLocaleString('en-IN') + '</div>' +
                    '<div class="text-[8px] text-slate-400 mt-0.5">' + cnt + ' student' + (cnt !== 1 ? 's' : '') + '</div>' +
                '</div>';
            }).join('');
            return '<div class="mb-4">' +
                '<div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">' +
                    '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>' +
                    'Total Collection by Subject' +
                '</div>' +
                '<div class="grid grid-cols-4 gap-2">' + subHtml + '</div>' +
            '</div>';
        })() +
        '<div class="max-h-[260px] overflow-y-auto custom-scroll pr-1">' + rowsHtml + '</div>';
}

window.setFeeOverviewFilter = function(cls) {
    var overviewEl = document.getElementById('feeOverviewSection');
    if (!overviewEl) return;
    overviewEl.dataset.activeFilter = cls;
    renderFeeOverview(studentsList);
};

// Search Functionality
searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = studentsList.filter(s => 
        (s.name && s.name.toLowerCase().includes(term)) || 
        (s.phone && s.phone.includes(term)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(term)) ||
        (s.formNo && s.formNo.toLowerCase().includes(term))
    );
    renderStudents(filtered);
});

// Windows Global Functions
window.deleteStudent = async (id) => {
    if (confirm("Permanently erase student record? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "students", id));
            fetchStudents(); // refresh
        } catch (error) {
            console.error("Error deleting student:", error);
            alert("Failed to execute deletion.");
        }
    }
};

window.openFeesModal = (id, name, total, paid) => {
    document.getElementById('feeStudentId').value = id;
    document.getElementById('feeStudentName').textContent = name;
    document.getElementById('feeTotal').value = total || 0;
    document.getElementById('feePaid').value = paid || 0;
    
    // Uses the function defined in HTML
    window.openModal('feesModal');
};

// Handle Fees Update
document.getElementById('updateFeesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('feeStudentId').value;
    const tFees = Number(document.getElementById('feeTotal').value);
    const pFees = Number(document.getElementById('feePaid').value);
    const btn = document.getElementById('saveFeeBtn');
    
    btn.disabled = true;
    btn.innerHTML = `<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent"></i> Compiling...`;

    try {
        await updateDoc(doc(db, "students", id), {
            feesTotal: tFees,
            feesPaid: pFees
        });
        
        window.closeModal('feesModal');
        fetchStudents(); // refresh
    } catch(err) {
        console.error(err);
        alert("Failed to perform fee update. Access denied.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check-square" class="w-5 h-5"></i> Execute Ledger Update`;
        lucide.createIcons();
    }
});

// Handle File Base64 Conversion
document.getElementById('admin_photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Only allow images up to 1MB to prevent Firestore limits issue
        if (file.size > 1024 * 1024) {
            alert('Image must be less than 1MB');
            this.value = '';
            document.getElementById('admin_photoBase64').value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
            document.getElementById('admin_photoBase64').value = evt.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Handle Manual Add Student with new fields
document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveStudentBtn');
    
    btn.disabled = true;
    btn.innerHTML = `<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent"></i> Registering...`;

    try {
        const studentData = {
            admissionNo: document.getElementById("admin_admissionNo").value || "",
            name: document.getElementById("admin_name").value,
            fatherName: document.getElementById("admin_fatherName").value,
            gender: document.getElementById("admin_gender").value,
            bloodGroup: document.getElementById("admin_bloodGroup") ? document.getElementById("admin_bloodGroup").value : "",
            phone: document.getElementById("admin_mobile").value,
            parentMobile: document.getElementById("admin_parentMobile").value,
            board: document.getElementById("admin_board").value,
            course: document.getElementById("admin_course").value,
            std: document.getElementById("admin_class").value,
            photoBase64: document.getElementById('admin_photoBase64').value || ""
        };

        const editId = document.getElementById("editStudentId").value;
        if (editId) {
            await updateDoc(doc(db, "students", editId), studentData);
        } else {
            studentData.address = ""; 
            studentData.feesTotal = 0;
            studentData.feesPaid = 0;
            studentData.createdAt = serverTimestamp();
            await addDoc(collection(db, "students"), studentData);
        }
        
        window.closeModal('studentModal');
        document.getElementById('addStudentForm').reset();
        fetchStudents(); // refresh

    } catch (error) {
        console.error("Error saving student manually: ", error);
        alert("Failed to save student. Permission Error.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Commit Record`;
        lucide.createIcons();
    }
});

// Handle Edit Profile Logic
window.editStudent = (id) => {
    const s = studentsList.find(x => x.id === id);
    if (!s) return;

    document.getElementById('editStudentId').value = s.id;
    document.getElementById('studentModalTitle').innerText = 'Edit Profile';

    // Populate Fields
    document.getElementById("admin_admissionNo").value = s.admissionNo || "";
    document.getElementById("admin_name").value = s.name || "";
    document.getElementById("admin_fatherName").value = s.fatherName || "";
    document.getElementById("admin_gender").value = s.gender || "Male";
    document.getElementById("admin_mobile").value = s.phone || "";
    document.getElementById("admin_parentMobile").value = s.parentMobile || "";
    if (document.getElementById("admin_bloodGroup")) document.getElementById("admin_bloodGroup").value = s.bloodGroup || "";
    document.getElementById("admin_board").value = s.board || "CBSE";
    document.getElementById("admin_course").value = s.course || "Class 11";
    
    const stdInput = document.getElementById("admin_class");
    stdInput.value = s.std || "";
    const adminSubjectCheckboxes = document.querySelectorAll('.admin-subject-cb');
    if (adminSubjectCheckboxes.length > 0) {
        adminSubjectCheckboxes.forEach(cb => {
            cb.checked = (s.std || "").includes(cb.value);
        });
        if (window.updateAdminSubjectTags) window.updateAdminSubjectTags();
    }

    const preview = document.getElementById("admin_photoPreview");
    if (s.photoBase64) {
        preview.src = s.photoBase64;
        preview.classList.remove("hidden");
        document.getElementById('admin_photoBase64').value = s.photoBase64;
    } else {
        preview.classList.add("hidden");
        document.getElementById('admin_photoBase64').value = "";
    }

    // Unrequire photo input specifically if editing to allow them to keep the old image
    document.getElementById("admin_photo").required = false;

    window.openModal('studentModal');
};

// Section Management
window.switchSection = (sectionId) => {
    document.querySelectorAll('.dashboard-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });
    
    document.querySelectorAll('.nav-active').forEach(el => {
        el.classList.remove('nav-active', 'text-white', 'font-bold');
        el.classList.add('text-[#5E6E82]');
    });
    
    if(sectionId === 'students') {
        document.getElementById('section-students').classList.remove('hidden');
        document.getElementById('section-students').classList.add('block');
        document.getElementById('nav-students').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-students').classList.remove('text-[#5E6E82]');
    } else if (sectionId === 'progression') {
        document.getElementById('section-progression').classList.remove('hidden');
        document.getElementById('section-progression').classList.add('block');
        document.getElementById('nav-progression').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-progression').classList.remove('text-[#5E6E82]');
        populateProgressionDropdown();
        document.getElementById('progStudentFilter').value = '';
    } else if (sectionId === 'scoreboard') {
        document.getElementById('section-scoreboard').classList.remove('hidden');
        document.getElementById('section-scoreboard').classList.add('block');
        document.getElementById('nav-scoreboard').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-scoreboard').classList.remove('text-[#5E6E82]');
        loadScoreboardTests();
    } else if (sectionId === 'fees') {
        document.getElementById('section-fees').classList.remove('hidden');
        document.getElementById('section-fees').classList.add('block');
        document.getElementById('nav-fees').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-fees').classList.remove('text-[#5E6E82]');
        populateFeesDropdown();
        document.getElementById('feesStudentFilter').value = '';
        document.getElementById('feesDashboard').classList.add('hidden');
    } else if (sectionId === 'notes') {
        document.getElementById('section-notes').classList.remove('hidden');
        document.getElementById('section-notes').classList.add('block');
        document.getElementById('nav-notes').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-notes').classList.remove('text-[#5E6E82]');
        if(window.loadNotes) window.loadNotes();
    } else if (sectionId === 'gallery') {
        document.getElementById('section-gallery').classList.remove('hidden');
        document.getElementById('section-gallery').classList.add('block');
        document.getElementById('nav-gallery').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-gallery').classList.remove('text-[#5E6E82]');
        if(window.loadGallery) window.loadGallery();
    } else if (sectionId === 'leads') {
        document.getElementById('section-leads').classList.remove('hidden');
        document.getElementById('section-leads').classList.add('block');
        document.getElementById('nav-leads').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-leads').classList.remove('text-[#5E6E82]');
        if(window.fetchLeads) window.fetchLeads();
    }
};

window.filterProgStudents = function() {
    var text = document.getElementById('progStudentFilter').value.toLowerCase();
    renderStudentPicker('prog', text);
};

window.filterFeesStudents = function() {
    var text = document.getElementById('feesStudentFilter').value.toLowerCase();
    renderStudentPicker('fees', text);
};

// Unified student picker renderer
function renderStudentPicker(prefix, filterText) {
    filterText = filterText || '';
    var listEl = document.getElementById(prefix + 'StudentPickerList');

    var filtered = studentsList.filter(function(s) {
        if (!filterText) return true;
        var haystack = ((s.name || '') + ' ' + (s.admissionNo || '') + ' ' + (s.formNo || '') + ' ' + (s.phone || '')).toLowerCase();
        return haystack.indexOf(filterText) !== -1;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="student-picker-empty">' + (filterText ? 'No students match "' + filterText + '"' : 'No students found') + '</div>';
        return;
    }

    var currentSelected = document.getElementById(prefix + 'SelectStudent').value;
    var html = '';

    for (var i = 0; i < filtered.length; i++) {
        var s = filtered[i];
        var initials = (s.name || 'U').split(' ').map(function(w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        var idStr = s.admissionNo || s.formNo || s.id.slice(0, 6);
        var isSelected = s.id === currentSelected;

        var avatarHtml = '';
        if (s.photoBase64) {
            avatarHtml = '<div class="sp-avatar"><img src="' + s.photoBase64 + '" alt=""></div>';
        } else {
            avatarHtml = '<div class="sp-avatar">' + initials + '</div>';
        }

        html += '<div class="student-picker-item' + (isSelected ? ' selected' : '') + '" onclick="window.selectStudentPicker(\'' + prefix + '\', \'' + s.id + '\')">' +
            avatarHtml +
            '<div class="flex-1 min-w-0">' +
                '<div class="sp-name truncate">' + (s.name || 'Unnamed') + '</div>' +
                '<div class="sp-id">' + idStr + (s.phone ? ' · ' + s.phone : '') + '</div>' +
            '</div>' +
            '<div class="sp-badge">' + (s.course || s.batch || 'N/A') + '</div>' +
        '</div>';
    }

    listEl.innerHTML = html;
}

// Called when user clicks a student card
window.selectStudentPicker = function(prefix, studentId) {
    var s = studentsList.find(function(x) { return x.id === studentId; });
    if (!s) return;

    // Set hidden input
    document.getElementById(prefix + 'SelectStudent').value = studentId;

    // Show selected card
    var selEl = document.getElementById(prefix + 'StudentPickerSelected');
    selEl.classList.remove('hidden');
    selEl.classList.add('flex');

    var initials = (s.name || 'U').split(' ').map(function(w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    var avatarEl = document.getElementById(prefix + 'SelectedAvatar');
    if (s.photoBase64) {
        avatarEl.innerHTML = '<img src="' + s.photoBase64 + '" alt="">';
    } else {
        avatarEl.innerHTML = initials;
    }
    document.getElementById(prefix + 'SelectedName').textContent = s.name || 'Unnamed';
    document.getElementById(prefix + 'SelectedId').textContent = (s.admissionNo || s.formNo || s.id.slice(0, 6)) + (s.course ? ' · ' + s.course : '');

    // Highlight in list
    var items = document.getElementById(prefix + 'StudentPickerList').querySelectorAll('.student-picker-item');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('selected');
    }
    // Find and highlight clicked
    var filter = document.getElementById(prefix + 'StudentFilter').value.toLowerCase();
    renderStudentPicker(prefix, filter);

    // Trigger change event for fees dashboard
    if (prefix === 'fees') {
        currentFeesStudentId = studentId;
        loadFeesDashboard(studentId);
    }
    // For progression, load history
    if (prefix === 'prog') {
        loadStudentAssessments(studentId);
    }

    lucide.createIcons();
};

window.clearProgSelection = function() {
    document.getElementById('progSelectStudent').value = '';
    document.getElementById('progStudentPickerSelected').classList.add('hidden');
    document.getElementById('progStudentPickerSelected').classList.remove('flex');
    document.getElementById('progHistoryBlock').classList.add('hidden');
    renderStudentPicker('prog', '');
    lucide.createIcons();
};

window.clearFeesSelection = function() {
    document.getElementById('feesSelectStudent').value = '';
    document.getElementById('feesStudentPickerSelected').classList.add('hidden');
    document.getElementById('feesStudentPickerSelected').classList.remove('flex');
    document.getElementById('feesDashboard').classList.add('hidden');
    currentFeesStudentId = null;
    renderStudentPicker('fees', '');
    lucide.createIcons();
};

function populateProgressionDropdown(text) {
    renderStudentPicker('prog', text || '');
}

function populateFeesDropdown(text) {
    renderStudentPicker('fees', text || '');
}

// Handle Progression Report Block Submit
document.getElementById('addProgressForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('progSelectStudent').value;
    const tName = document.getElementById('progTestName').value;
    const pDate = document.getElementById('progDate').value;
    const obtained = Number(document.getElementById('progMarks').value);
    const total = Number(document.getElementById('progTotalMarks').value);
    
    if(!id) return alert('Select a student first.');

    const btn = document.getElementById('saveProgressBtnNative');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Publishing...';

    try {
        const payload = {
            testName: tName,
            date: pDate,
            obtained: obtained,
            total: total,
            createdAt: serverTimestamp()
        };

        // Write to student's assessments subcollection
        const assessRef = await addDoc(collection(db, "students", id, "assessments"), payload);

        // Dual-write to scoreboard collection for leaderboard aggregation
        const student = studentsList.find(function(s) { return s.id === id; });
        const percentage = total > 0 ? ((obtained / total) * 100) : 0;
        await addDoc(collection(db, "scoreboard"), {
            testName: tName,
            date: pDate,
            studentId: id,
            assessmentId: assessRef.id,
            studentName: student ? student.name : 'Unknown',
            studentPhoto: student ? (student.photoBase64 || '') : '',
            course: student ? (student.course || '') : '',
            admissionNo: student ? (student.admissionNo || student.formNo || '') : '',
            obtained: obtained,
            total: total,
            percentage: Math.round(percentage * 10) / 10,
            createdAt: serverTimestamp()
        });
        
        // Reset only the test fields, keep the student selected
        document.getElementById('progTestName').value = '';
        document.getElementById('progMarks').value = '';
        document.getElementById('progTotalMarks').value = '10';
        document.getElementById('progDate').value = '';

        // Refresh the history list
        await loadStudentAssessments(id);
        
    } catch(err) {
        console.error(err);
        alert("Failed to publish assessment: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Publish to Database';
    }
});

// Load all assessments for a student
async function loadStudentAssessments(studentId) {
    var historyBlock = document.getElementById('progHistoryBlock');
    var historyList = document.getElementById('progHistoryList');
    var historyCount = document.getElementById('progHistoryCount');
    
    historyBlock.classList.remove('hidden');
    historyList.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading results...</div>';

    try {
        var snap = await getDocs(collection(db, 'students', studentId, 'assessments'));
        
        if (snap.empty) {
            historyCount.textContent = '0 records';
            historyList.innerHTML = '<div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">' +
                '<p class="text-xs font-bold uppercase tracking-widest text-slate-400">No assessments published yet for this student.</p>' +
            '</div>';
            return;
        }

        var results = [];
        snap.forEach(function(d) {
            results.push({ id: d.id, ...d.data() });
        });

        // Sort by date descending
        results.sort(function(a, b) {
            return (b.date || '').localeCompare(a.date || '');
        });

        historyCount.textContent = results.length + ' record' + (results.length !== 1 ? 's' : '');

        var html = '';
        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            var obtained = Number(r.obtained) || 0;
            var total = Number(r.total) || 1;
            var perc = ((obtained / total) * 100).toFixed(1);
            var percColor = perc >= 75 ? 'text-emerald-600' : perc >= 60 ? 'text-blue-600' : perc >= 45 ? 'text-yellow-600' : 'text-red-600';
            var barColor = perc >= 75 ? 'bg-emerald-500' : perc >= 60 ? 'bg-blue-500' : perc >= 45 ? 'bg-yellow-500' : 'bg-red-500';

            html += '<div class="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-3 mb-1">' +
                        '<span class="text-sm font-black text-[#0B2447] uppercase tracking-wide truncate">' + (r.testName || 'Assessment') + '</span>' +
                        '<span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">' + (r.date || 'No date') + '</span>' +
                    '</div>' +
                    '<div class="flex items-center gap-3">' +
                        '<div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">' +
                            '<div class="h-full rounded-full ' + barColor + '" style="width:' + perc + '%"></div>' +
                        '</div>' +
                        '<span class="text-xs font-black ' + percColor + ' shrink-0">' + obtained + '/' + total + ' (' + perc + '%)</span>' +
                    '</div>' +
                '</div>' +
                '<button onclick="window.deleteAssessment(\'' + studentId + '\', \'' + r.id + '\')" class="shrink-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete this result">' +
                    '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                '</button>' +
            '</div>';
        }

        historyList.innerHTML = html;
        lucide.createIcons();

    } catch(err) {
        console.error('Error loading assessments:', err);
        historyList.innerHTML = '<div class="text-xs text-red-600 font-bold p-4 bg-red-50 rounded-xl border border-red-200">Failed to load: ' + err.message + '</div>';
    }
}

// Delete a single assessment
window.deleteAssessment = async function(studentId, assessmentId) {
    if (!confirm('Delete this assessment result permanently?')) return;

    try {
        // Delete from student's subcollection
        await deleteDoc(doc(db, 'students', studentId, 'assessments', assessmentId));

        // Also delete from scoreboard collection
        try {
            const sbQuery = query(collection(db, 'scoreboard'), where('assessmentId', '==', assessmentId), where('studentId', '==', studentId));
            const sbSnap = await getDocs(sbQuery);
            sbSnap.forEach(async function(d) {
                await deleteDoc(doc(db, 'scoreboard', d.id));
            });
        } catch(sbErr) {
            console.warn('Scoreboard cleanup failed (non-critical):', sbErr);
        }

        await loadStudentAssessments(studentId);
    } catch(err) {
        console.error(err);
        alert('Failed to delete: ' + err.message);
    }
};

// ═══════════════════════════════════════════════════════════════════
// FEES MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

var currentFeesStudentId = null;


async function loadFeesDashboard(studentId) {
    var dashboard = document.getElementById('feesDashboard');
    dashboard.classList.remove('hidden');

    // Find the student in local list
    var student = studentsList.find(function(s) { return s.id === studentId; });
    if (!student) return;

    // Header
    document.getElementById('feesStudentName').textContent = student.name || 'Unnamed';
    document.getElementById('feesStudentId').textContent = 'ID: ' + (student.admissionNo || student.formNo || student.id.slice(0, 6));

    // Total fees input
    var totalFees = Number(student.feesTotal) || 0;
    document.getElementById('feesTotalInput').value = totalFees || '';

    // Load installments from sub-collection
    await loadInstallments(studentId, totalFees);
}

async function loadInstallments(studentId, totalFeesOverride) {
    var listEl = document.getElementById('feesInstallmentList');
    var countEl = document.getElementById('feesInstallmentCount');
    
    listEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading installments...</div>';

    // Get student's total fees
    var student = studentsList.find(function(s) { return s.id === studentId; });
    var totalFees = totalFeesOverride !== undefined ? totalFeesOverride : (Number(student?.feesTotal) || 0);

    try {
        var snap = await getDocs(collection(db, 'students', studentId, 'installments'));

        var installments = [];
        snap.forEach(function(d) {
            installments.push({ id: d.id, ...d.data() });
        });

        // Sort by date ascending
        installments.sort(function(a, b) {
            return (a.date || '').localeCompare(b.date || '');
        });

        // Calculate totals
        var totalPaid = 0;
        for (var i = 0; i < installments.length; i++) {
            totalPaid += Number(installments[i].amount) || 0;
        }
        var remaining = totalFees - totalPaid;
        if (remaining < 0) remaining = 0;

        // Update summary cards
        document.getElementById('feesTotalDisplay').innerHTML = '&#8377;' + totalFees.toLocaleString('en-IN');
        document.getElementById('feesPaidDisplay').innerHTML = '&#8377;' + totalPaid.toLocaleString('en-IN');
        document.getElementById('feesRemainingDisplay').innerHTML = '&#8377;' + remaining.toLocaleString('en-IN');

        // Progress bar
        var perc = totalFees > 0 ? Math.min(100, ((totalPaid / totalFees) * 100)) : 0;
        document.getElementById('feesProgressBar').style.width = perc.toFixed(1) + '%';
        document.getElementById('feesProgressPercent').textContent = perc.toFixed(1) + '%';

        // Status badge
        var badge = document.getElementById('feesStatusBadge');
        if (totalFees === 0) {
            badge.textContent = 'NOT SET';
            badge.className = 'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-400/20 text-yellow-300';
        } else if (remaining <= 0) {
            badge.textContent = 'FULLY PAID';
            badge.className = 'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-300';
        } else {
            badge.textContent = 'DUE: \u20B9' + remaining.toLocaleString('en-IN');
            badge.className = 'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-400/20 text-red-300';
        }

        // Subject breakdown — extract from 'std' (subjects field) falling back to 'course'
        var subjectBreakdownEl = document.getElementById('feesSubjectBreakdown');
        var subjectBreakdownList = document.getElementById('feesSubjectBreakdownList');
        var subjectCountEl = document.getElementById('feesSubjectCount');

        // Known class names to exclude (they are classes, not subjects)
        var knownClasses = ['class 7','class 8','class 9','class 10','class 11','class 12'];
        var rawStd = student.std || '';
        var subjects = rawStd.split(',').map(function(s){ return s.trim(); }).filter(function(s){
            return s && knownClasses.indexOf(s.toLowerCase()) === -1;
        });

        subjectBreakdownEl.classList.remove('hidden');

        if (subjects.length > 0) {
            var feePerSubject = totalFees > 0 ? totalFees / subjects.length : 0;
            subjectCountEl.textContent = subjects.length + ' Subject' + (subjects.length !== 1 ? 's' : '') + (totalFees > 0 ? ' · Equal Split' : '');

            var subjectHtml = '';
            subjects.forEach(function(sub) {
                subjectHtml += `
                    <div class="bg-white rounded-xl p-3 border border-indigo-100 flex flex-col gap-0.5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                        <span class="text-[9px] font-black text-[#546877] uppercase tracking-widest truncate" title="${sub}">${sub}</span>
                        <span class="text-base font-black text-indigo-700">&#8377;${feePerSubject > 0 ? Math.round(feePerSubject).toLocaleString('en-IN') : '—'}</span>
                        ${totalFees > 0 ? `<span class="text-[8px] text-slate-400 font-semibold">per subject</span>` : `<span class="text-[8px] text-yellow-500 font-semibold">Set total fees above</span>`}
                    </div>
                `;
            });
            subjectBreakdownList.innerHTML = subjectHtml;
        } else {
            subjectBreakdownEl.classList.remove('hidden');
            subjectCountEl.textContent = 'No Subjects';
            subjectBreakdownList.innerHTML = `<div class="col-span-full text-xs text-slate-400 font-semibold py-2">No subjects recorded for this student. Edit the student record to add subjects.</div>`;
        }

        // Update the student doc feesPaid for portal sync
        await updateDoc(doc(db, 'students', studentId), {
            feesPaid: totalPaid,
            feesTotal: totalFees
        });
        // Also update local cache
        if (student) {
            student.feesPaid = totalPaid;
            student.feesTotal = totalFees;
        }

        // Render installment list
        countEl.textContent = installments.length + ' payment' + (installments.length !== 1 ? 's' : '');

        if (installments.length === 0) {
            listEl.innerHTML = '<div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">' +
                '<p class="text-xs font-bold uppercase tracking-widest text-slate-400">No installments recorded yet. Add the first one below.</p>' +
            '</div>';
            return;
        }

        var html = '';
        var runningPaid = 0;
        for (var j = 0; j < installments.length; j++) {
            var inst = installments[j];
            var amt = Number(inst.amount) || 0;
            runningPaid += amt;
            var runningRemaining = totalFees - runningPaid;
            if (runningRemaining < 0) runningRemaining = 0;
            var instNum = j + 1;

            html += '<div class="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group">' +
                '<div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm shrink-0">' + instNum + '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-3 mb-1">' +
                        '<span class="text-sm font-black text-emerald-700">\u20B9' + amt.toLocaleString('en-IN') + '</span>' +
                        '<span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">' + (inst.date || 'No date') + '</span>' +
                        '<span class="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">' + (inst.mode || 'Cash') + '</span>' +
                    '</div>' +
                    '<div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">' +
                        'Remaining after this: \u20B9' + runningRemaining.toLocaleString('en-IN') +
                    '</div>' +
                '</div>' +
                '<button onclick="window.deleteInstallment(\'' + studentId + '\', \'' + inst.id + '\')" class="shrink-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete">' +
                    '<i data-lucide="trash-2" class="w-4 h-4"></i>' +
                '</button>' +
            '</div>';
        }

        listEl.innerHTML = html;
        lucide.createIcons();

    } catch(err) {
        console.error('Error loading installments:', err);
        listEl.innerHTML = '<div class="text-xs text-red-600 font-bold p-4 bg-red-50 rounded-xl border border-red-200">Failed to load: ' + err.message + '</div>';
    }
}

// Save total fees
window.saveTotalFees = async function() {
    if (!currentFeesStudentId) return;
    var totalVal = Number(document.getElementById('feesTotalInput').value) || 0;

    try {
        await updateDoc(doc(db, 'students', currentFeesStudentId), { feesTotal: totalVal });
        // Update local cache
        var student = studentsList.find(function(s) { return s.id === currentFeesStudentId; });
        if (student) student.feesTotal = totalVal;
        await loadInstallments(currentFeesStudentId, totalVal);
    } catch(err) {
        console.error(err);
        alert('Failed to update total fees: ' + err.message);
    }
};

// Add installment
window.addInstallment = async function() {
    if (!currentFeesStudentId) return alert('Select a student first.');

    var date = document.getElementById('feeInstDate').value;
    var amount = Number(document.getElementById('feeInstAmount').value);
    var mode = document.getElementById('feeInstMode').value;

    if (!date) return alert('Please enter the date.');
    if (!amount || amount <= 0) return alert('Please enter a valid amount.');

    var btn = document.getElementById('addInstallmentBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Recording...';

    try {
        await addDoc(collection(db, 'students', currentFeesStudentId, 'installments'), {
            date: date,
            amount: amount,
            mode: mode,
            createdAt: serverTimestamp()
        });

        // Clear inputs
        document.getElementById('feeInstDate').value = '';
        document.getElementById('feeInstAmount').value = '';
        document.getElementById('feeInstMode').value = 'Cash';

        // Reload
        await loadInstallments(currentFeesStudentId);

    } catch(err) {
        console.error(err);
        alert('Failed to record installment: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i> Record Installment';
        lucide.createIcons();
    }
};

// Delete installment
window.deleteInstallment = async function(studentId, installmentId) {
    if (!confirm('Delete this installment permanently?')) return;

    try {
        await deleteDoc(doc(db, 'students', studentId, 'installments', installmentId));
        await loadInstallments(studentId);
    } catch(err) {
        console.error(err);
        alert('Failed to delete: ' + err.message);
    }
};

// Admin Custom Subject Multi-Select Logic
const adminSubjectSelector = document.getElementById('admin-subject-selector');
const adminSubjectMenu = document.getElementById('admin-subject-menu');
const adminSubjectCheckboxes = document.querySelectorAll('.admin-subject-cb');
const adminStdInput = document.getElementById('admin_class');
const adminSubjectTags = document.getElementById('admin-subject-tags');
const adminSubjectPlaceholder = document.getElementById('admin-subject-placeholder');
const adminSubjectChevron = document.getElementById('admin-subject-chevron');
const adminSubjectWrapper = document.getElementById('admin-subject-wrapper');

if (adminSubjectSelector && adminSubjectMenu) {
    adminSubjectSelector.addEventListener('click', () => {
        const isHidden = adminSubjectMenu.classList.contains('hidden');
        if (isHidden) {
            adminSubjectMenu.classList.remove('hidden');
            setTimeout(() => {
                adminSubjectMenu.classList.remove('opacity-0', 'translate-y-[-10px]');
                adminSubjectChevron.classList.add('rotate-180');
            }, 10);
        } else {
            adminSubjectMenu.classList.add('opacity-0', 'translate-y-[-10px]');
            adminSubjectChevron.classList.remove('rotate-180');
            setTimeout(() => adminSubjectMenu.classList.add('hidden'), 200);
        }
    });

    document.addEventListener('click', (e) => {
        if (!adminSubjectWrapper.contains(e.target) && !adminSubjectMenu.classList.contains('hidden')) {
            adminSubjectMenu.classList.add('opacity-0', 'translate-y-[-10px]');
            adminSubjectChevron.classList.remove('rotate-180');
            setTimeout(() => adminSubjectMenu.classList.add('hidden'), 200);
        }
    });

    window.updateAdminSubjectTags = function() {
        const selected = Array.from(adminSubjectCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        adminStdInput.value = selected.join(', ');
        
        if (selected.length > 0) {
            adminSubjectPlaceholder.classList.add('hidden');
            adminSubjectTags.classList.remove('hidden');
            adminSubjectTags.innerHTML = selected.map(val => 
                `<span class="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">${val}</span>`
            ).join('');
        } else {
            adminSubjectPlaceholder.classList.remove('hidden');
            adminSubjectTags.classList.add('hidden');
            adminSubjectTags.innerHTML = '';
        }
    };

    adminSubjectCheckboxes.forEach(cb => {
        cb.addEventListener('change', window.updateAdminSubjectTags);
    });
}

// ==========================================
// NOTES MANAGEMENT LOGIC
// ==========================================

let notesList = [];

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

const uploadNoteForm = document.getElementById('uploadNoteForm');
if (uploadNoteForm) {
    uploadNoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('uploadNoteBtn');
        const fileInput = document.getElementById('noteFile');
        const errorMsg = document.getElementById('noteFileError');
        const title = document.getElementById('noteTitle').value;
        const noteClass = document.getElementById('noteClass').value;

        const file = fileInput.files[0];
        if (!file) return;

        if (file.size > 1048576) {
            errorMsg.classList.remove('hidden');
            return;
        }
        errorMsg.classList.add('hidden');

        btn.disabled = true;
        btn.innerHTML = `<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent"></i> Uploading...`;

        try {
            const base64Data = await getBase64(file);
            
            await addDoc(collection(db, "notes"), {
                title: title,
                class: noteClass,
                base64: base64Data,
                createdAt: serverTimestamp()
            });

            uploadNoteForm.reset();
            await loadNotes();
            alert('Note uploaded successfully!');

        } catch (error) {
            console.error("Error uploading note:", error);
            alert('Failed to upload note.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> Upload Note`;
            lucide.createIcons();
        }
    });
}

window.loadNotes = async function() {
    const tbody = document.getElementById('notesTableBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400 font-medium text-sm">Loading notes...</td></tr>';
    
    try {
        const q = query(collection(db, "notes"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        notesList = [];
        snapshot.forEach(doc => {
            notesList.push({ id: doc.id, ...doc.data() });
        });
        
        window.renderNotes();
    } catch (error) {
        console.error("Error loading notes:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500 font-medium text-sm">Failed to load notes.</td></tr>';
    }
};

window.renderNotes = function() {
    const tbody = document.getElementById('notesTableBody');
    if(!tbody) return;
    
    if (notesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400 font-medium text-sm">No notes uploaded yet.</td></tr>';
        return;
    }

    let html = '';
    notesList.forEach(note => {
        const dateStr = note.createdAt ? new Date(note.createdAt.toDate()).toLocaleDateString() : 'Unknown';
        
        html += `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="p-4 text-sm font-bold text-[#0B2447]">${note.title}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg tracking-widest">${note.class}</span>
                </td>
                <td class="p-4 text-sm font-semibold text-slate-500">${dateStr}</td>
                <td class="p-4 text-right">
                    <button onclick="window.deleteNote('${note.id}')" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all focus:outline-none" title="Delete Note">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.deleteNote = async function(noteId) {
    if (!confirm('Are you sure you want to delete this note permanently?')) return;
    
    try {
        await deleteDoc(doc(db, "notes", noteId));
        await loadNotes();
    } catch (error) {
        console.error("Error deleting note:", error);
        alert("Failed to delete note.");
    }
};

// --- GALLERY MANAGEMENT ---
let galleryList = [];

// Convert image to base64 and auto-optimize
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                const maxDim = 1200;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height *= maxDim / width));
                        width = maxDim;
                    } else {
                        width = Math.round((width *= maxDim / height));
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const quality = type === 'image/jpeg' ? 0.8 : undefined;
                
                resolve(canvas.toDataURL(type, quality));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// Upload Gallery Form Handler
document.getElementById('uploadGalleryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('galleryTitle').value;
    const category = document.getElementById('galleryCategory').value;
    const size = document.getElementById('gallerySize').value;
    const fileInput = document.getElementById('galleryFile');
    const btn = document.getElementById('uploadGalleryBtn');
    
    if (!fileInput.files.length) return alert('Please select an image file.');
    
    const file = fileInput.files[0];
    // Optimize/Check size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert("Image must be smaller than 10MB.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Optimizing & Uploading...';
    
    try {
        const base64Img = await fileToBase64(file);
        
        await addDoc(collection(db, "gallery_images"), {
            title: title,
            category: category,
            size: size,
            imageUrl: base64Img,
            timestamp: serverTimestamp()
        });
        
        document.getElementById('uploadGalleryForm').reset();
        await window.loadGallery();
        
    } catch(err) {
        console.error("Gallery Upload Error:", err);
        alert("Failed to upload image.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i> Upload to Gallery';
        lucide.createIcons();
    }
});

// Load Gallery Data
window.loadGallery = async function() {
    const tbody = document.getElementById('galleryTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400 font-medium text-sm">Loading gallery images...</td></tr>';
    
    try {
        const q = query(collection(db, "gallery_images"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        
        galleryList = [];
        snapshot.forEach(doc => {
            galleryList.push({ id: doc.id, ...doc.data() });
        });
        
        window.renderGalleryTable();
        
    } catch (error) {
        console.error("Error loading gallery:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500 font-medium text-sm">Failed to load images.</td></tr>';
    }
};

window.renderGalleryTable = function() {
    const tbody = document.getElementById('galleryTableBody');
    if (!tbody) return;
    
    if (galleryList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400 font-medium text-sm">No images uploaded yet.</td></tr>';
        return;
    }

    let html = '';
    galleryList.forEach(img => {
        html += `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="p-4">
                    <div class="w-16 h-12 bg-slate-100 rounded overflow-hidden shadow-sm">
                        <img src="${img.imageUrl}" alt="${img.title}" class="w-full h-full object-cover">
                    </div>
                </td>
                <td class="p-4 text-sm font-bold text-[#0B2447]">${img.title}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg tracking-widest border border-emerald-100">${img.category}</span>
                </td>
                <td class="p-4 text-right">
                    <button onclick="window.deleteGalleryImage('${img.id}')" class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all focus:outline-none" title="Delete Image">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.deleteGalleryImage = async function(imgId) {
    if (!confirm('Are you sure you want to delete this image permanently?')) return;
    
    try {
        await deleteDoc(doc(db, "gallery_images", imgId));
        await window.loadGallery();
    } catch (error) {
        console.error("Error deleting image:", error);
        alert("Failed to delete image.");
    }
};

// ==========================================
// LEADS MANAGEMENT
// ==========================================

window.fetchLeads = async function() {
    const tbody = document.getElementById('leadsTableBody');
    const statTotal = document.getElementById('statTotalLeads');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-slate-400"><i data-lucide="loader" class="animate-spin w-5 h-5 mx-auto mb-2 text-blue-500"></i> Loading leads...</td></tr>';
    lucide.createIcons();

    try {
        const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        const leads = [];
        snap.forEach(doc => {
            leads.push({ id: doc.id, ...doc.data() });
        });

        if (statTotal) statTotal.textContent = leads.length;
        window.renderLeads(leads);
    } catch (err) {
        console.error("Error fetching leads:", err);
        // Fallback without ordering in case index is missing
        try {
            const snap = await getDocs(collection(db, "leads"));
            const leads = [];
            snap.forEach(doc => {
                leads.push({ id: doc.id, ...doc.data() });
            });
            // Sort client side
            leads.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });
            if (statTotal) statTotal.textContent = leads.length;
            window.renderLeads(leads);
        } catch (innerErr) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-red-500 font-bold">Failed to load leads: ${innerErr.message}</td></tr>`;
        }
    }
};

window.renderLeads = function(data) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-12 text-center"><div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg></div><p class="text-sm font-bold text-slate-400 uppercase tracking-widest">No inquiries yet</p></td></tr>';
        return;
    }

    let html = '';
    data.forEach(lead => {
        const dateStr = lead.createdAt ? lead.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';
        const sourceColor = lead.source === 'Popup Demo Form' ? 'text-[#F97316] bg-[#F97316]/10' : 'text-blue-600 bg-blue-50';
        
        html += `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="p-4 align-top">
                    <div class="text-[13px] font-bold text-[#0B2447] mb-1">${dateStr}</div>
                    <span class="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${sourceColor}">${lead.source || 'Website'}</span>
                </td>
                <td class="p-4 align-top">
                    <div class="text-[14px] font-black text-[#0B2447] capitalize">${lead.studentName || 'Unnamed'}</div>
                    <div class="text-[11px] font-semibold text-slate-400 uppercase mt-0.5"><span class="text-slate-300 mr-1">P:</span>${lead.parentName || 'N/A'}</div>
                </td>
                <td class="p-4 align-top">
                    <div class="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 mb-1">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        ${lead.phone || 'N/A'}
                    </div>
                    ${lead.email ? `
                    <div class="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        ${lead.email}
                    </div>
                    ` : ''}
                </td>
                <td class="p-4 align-top">
                    <div class="flex flex-wrap gap-2">
                        <span class="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-bold uppercase tracking-wide">${lead.grade || 'Any'}</span>
                        <span class="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[10px] font-bold uppercase tracking-wide">${lead.branch || 'Any'}</span>
                    </div>
                </td>
                <td class="p-4 align-top text-right">
                    <button onclick="window.deleteLead('${lead.id}')" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none" title="Delete Lead">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.deleteLead = async function(id) {
    if (confirm("Are you sure you want to permanently delete this lead?")) {
        try {
            await deleteDoc(doc(db, "leads", id));
            window.fetchLeads();
        } catch (error) {
            console.error("Error deleting lead:", error);
            alert("Failed to delete lead. Permission Error.");
        }
    }
};

// ═══════════════════════════════════════════════════════════════════
// SCOREBOARD / LEADERBOARD (ADMIN VIEW)
// ═══════════════════════════════════════════════════════════════════

var scoreboardTestNames = [];
var scoreboardActiveTest = null;
var scoreboardActiveClass = 'all';

async function loadScoreboardTests() {
    var testListEl = document.getElementById('scoreboardTestList');
    var leaderboardEl = document.getElementById('scoreboardLeaderboard');

    testListEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading tests...</div>';
    leaderboardEl.innerHTML = '';

    try {
        var snap = await getDocs(collection(db, 'scoreboard'));
        var testMap = {};

        snap.forEach(function(d) {
            var data = d.data();
            var name = data.testName || 'Untitled';
            if (!testMap[name]) {
                testMap[name] = { count: 0, date: data.date || '', courses: new Set() };
            }
            testMap[name].count++;
            if (data.course) testMap[name].courses.add(data.course);
        });

        scoreboardTestNames = Object.keys(testMap).sort();

        if (scoreboardTestNames.length === 0) {
            testListEl.innerHTML = '<div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">' +
                '<div class="text-3xl mb-3">🏆</div>' +
                '<p class="text-xs font-bold uppercase tracking-widest text-slate-400">No scoreboard entries yet. Publish assessments with the same test name to build leaderboards.</p>' +
                '</div>';
            return;
        }

        var html = '';
        scoreboardTestNames.forEach(function(name) {
            var info = testMap[name];
            var isActive = name === scoreboardActiveTest;
            html += '<button onclick="window.loadAdminLeaderboard(\'' + name.replace(/'/g, "\\'") + '\')" ' +
                'class="flex items-center justify-between w-full px-4 py-3.5 rounded-xl border-2 transition-all ' +
                (isActive ? 'bg-[#0B2447] text-white border-[#0B2447] shadow-lg' : 'bg-white text-[#0B2447] border-slate-100 hover:border-blue-300 hover:bg-blue-50') + '">' +
                '<div class="text-left">' +
                    '<div class="text-sm font-black uppercase tracking-wide">' + name + '</div>' +
                    '<div class="text-[10px] font-bold ' + (isActive ? 'text-blue-200' : 'text-slate-400') + ' uppercase tracking-widest mt-0.5">' + info.count + ' entries · ' + (info.date || 'N/A') + '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<span class="text-[9px] font-black px-2 py-1 rounded-lg ' + (isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500') + '">' + info.count + '</span>' +
                    '<svg class="w-4 h-4 ' + (isActive ? 'text-white' : 'text-slate-300') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>' +
                '</div>' +
            '</button>';
        });

        testListEl.innerHTML = html;

        // Auto-load first test if none active
        if (!scoreboardActiveTest && scoreboardTestNames.length > 0) {
            window.loadAdminLeaderboard(scoreboardTestNames[0]);
        } else if (scoreboardActiveTest) {
            window.loadAdminLeaderboard(scoreboardActiveTest);
        }

    } catch(err) {
        console.error('Error loading scoreboard tests:', err);
        testListEl.innerHTML = '<div class="text-xs text-red-600 font-bold p-4 bg-red-50 rounded-xl border border-red-200">Failed to load: ' + err.message + '</div>';
    }
}

window.loadAdminLeaderboard = async function(testName) {
    scoreboardActiveTest = testName;
    var leaderboardEl = document.getElementById('scoreboardLeaderboard');
    var testTitleEl = document.getElementById('scoreboardTestTitle');

    leaderboardEl.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Loading leaderboard...</div>';
    if (testTitleEl) testTitleEl.textContent = testName;

    // Re-render test list to highlight active
    loadScoreboardTestButtons();

    try {
        var q = query(collection(db, 'scoreboard'), where('testName', '==', testName));
        var snap = await getDocs(q);

        var entries = [];
        snap.forEach(function(d) {
            entries.push({ id: d.id, ...d.data() });
        });

        // Filter by class if not 'all'
        if (scoreboardActiveClass !== 'all') {
            entries = entries.filter(function(e) { return e.course === scoreboardActiveClass; });
        }

        // Sort by percentage descending, then by obtained marks descending
        entries.sort(function(a, b) {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return (b.obtained || 0) - (a.obtained || 0);
        });

        // Build class filter pills
        var allCourses = new Set();
        snap.forEach(function(d) { if (d.data().course) allCourses.add(d.data().course); });
        var classFilterHtml = '<div class="flex flex-wrap gap-2 mb-6">';
        classFilterHtml += '<button onclick="window.filterScoreboardClass(\'all\')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ' +
            (scoreboardActiveClass === 'all' ? 'bg-[#0B2447] text-white border-[#0B2447]' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300') + '">All Classes</button>';
        allCourses.forEach(function(cls) {
            classFilterHtml += '<button onclick="window.filterScoreboardClass(\'' + cls + '\')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ' +
                (scoreboardActiveClass === cls ? 'bg-[#0B2447] text-white border-[#0B2447]' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300') + '">' + cls + '</button>';
        });
        classFilterHtml += '</div>';

        if (entries.length === 0) {
            leaderboardEl.innerHTML = classFilterHtml + '<div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">' +
                '<p class="text-xs font-bold uppercase tracking-widest text-slate-400">No entries for this filter.</p>' +
                '</div>';
            return;
        }

        var html = classFilterHtml;
        html += '<div class="space-y-2">';

        entries.forEach(function(entry, index) {
            var rank = index + 1;
            var perc = entry.percentage || 0;
            var percColor = perc >= 75 ? 'text-emerald-600' : perc >= 60 ? 'text-blue-600' : perc >= 45 ? 'text-yellow-600' : 'text-red-600';
            var barColor = perc >= 75 ? 'bg-emerald-500' : perc >= 60 ? 'bg-blue-500' : perc >= 45 ? 'bg-yellow-500' : 'bg-red-500';

            var medalHtml = '';
            if (rank === 1) medalHtml = '<div class="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-300 flex items-center justify-center text-lg shrink-0">🥇</div>';
            else if (rank === 2) medalHtml = '<div class="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-lg shrink-0">🥈</div>';
            else if (rank === 3) medalHtml = '<div class="w-8 h-8 rounded-lg bg-orange-100 border border-orange-300 flex items-center justify-center text-lg shrink-0">🥉</div>';
            else medalHtml = '<div class="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">' + rank + '</div>';

            var initials = (entry.studentName || 'U').split(' ').map(function(w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
            var avatarHtml = entry.studentPhoto ?
                '<img src="' + entry.studentPhoto + '" class="w-full h-full object-cover rounded-lg" alt="">' :
                '<span class="text-[10px] font-black text-slate-500">' + initials + '</span>';

            var rankBg = rank <= 3 ? 'bg-gradient-to-r from-yellow-50/50 to-white border-yellow-200/50' : 'bg-white border-slate-100';

            html += '<div class="flex items-center gap-3 p-3 rounded-xl border ' + rankBg + ' hover:shadow-md transition-all">' +
                medalHtml +
                '<div class="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">' + avatarHtml + '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-2 mb-0.5">' +
                        '<span class="text-sm font-black text-[#0B2447] truncate">' + (entry.studentName || 'Unknown') + '</span>' +
                        (entry.course ? '<span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 shrink-0">' + entry.course + '</span>' : '') +
                    '</div>' +
                    '<div class="flex items-center gap-3">' +
                        '<div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">' +
                            '<div class="h-full rounded-full ' + barColor + ' transition-all duration-700" style="width:' + perc + '%"></div>' +
                        '</div>' +
                        '<span class="text-xs font-black ' + percColor + ' shrink-0">' + (entry.obtained || 0) + '/' + (entry.total || 0) + ' (' + perc + '%)</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        html += '</div>';
        html += '<div class="mt-4 text-center"><span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">' + entries.length + ' student' + (entries.length !== 1 ? 's' : '') + ' ranked</span></div>';
        leaderboardEl.innerHTML = html;

    } catch(err) {
        console.error('Error loading leaderboard:', err);
        leaderboardEl.innerHTML = '<div class="text-xs text-red-600 font-bold p-4 bg-red-50 rounded-xl border border-red-200">Failed to load: ' + err.message + '</div>';
    }
};

window.filterScoreboardClass = function(cls) {
    scoreboardActiveClass = cls;
    if (scoreboardActiveTest) {
        window.loadAdminLeaderboard(scoreboardActiveTest);
    }
};

// Helper to re-render just test buttons (without full reload)
async function loadScoreboardTestButtons() {
    var testListEl = document.getElementById('scoreboardTestList');
    if (!testListEl) return;

    try {
        var snap = await getDocs(collection(db, 'scoreboard'));
        var testMap = {};
        snap.forEach(function(d) {
            var data = d.data();
            var name = data.testName || 'Untitled';
            if (!testMap[name]) { testMap[name] = { count: 0, date: data.date || '' }; }
            testMap[name].count++;
        });

        var names = Object.keys(testMap).sort();
        var html = '';
        names.forEach(function(name) {
            var info = testMap[name];
            var isActive = name === scoreboardActiveTest;
            html += '<button onclick="window.loadAdminLeaderboard(\'' + name.replace(/'/g, "\\'") + '\')" ' +
                'class="flex items-center justify-between w-full px-4 py-3.5 rounded-xl border-2 transition-all ' +
                (isActive ? 'bg-[#0B2447] text-white border-[#0B2447] shadow-lg' : 'bg-white text-[#0B2447] border-slate-100 hover:border-blue-300 hover:bg-blue-50') + '">' +
                '<div class="text-left">' +
                    '<div class="text-sm font-black uppercase tracking-wide">' + name + '</div>' +
                    '<div class="text-[10px] font-bold ' + (isActive ? 'text-blue-200' : 'text-slate-400') + ' uppercase tracking-widest mt-0.5">' + info.count + ' entries · ' + (info.date || 'N/A') + '</div>' +
                '</div>' +
                '<div class="flex items-center gap-2">' +
                    '<span class="text-[9px] font-black px-2 py-1 rounded-lg ' + (isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500') + '">' + info.count + '</span>' +
                    '<svg class="w-4 h-4 ' + (isActive ? 'text-white' : 'text-slate-300') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>' +
                '</div>' +
            '</button>';
        });

        testListEl.innerHTML = html;
    } catch(err) {
        // Silent fail for button re-render
    }
}
