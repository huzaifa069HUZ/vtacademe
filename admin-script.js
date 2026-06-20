import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDocsFromCache, getDocsFromServer, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, onSnapshot, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

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
const auth = getAuth(app);

// Enable offline persistence (cache data in IndexedDB)
enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Persistence failed:", err.code);
});

// Global State
let studentsList = [];

// DOM Elements
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginAlert = document.getElementById("loginAlert");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const studentCardGrid = document.getElementById("studentCardGrid");
const searchInput = document.getElementById("searchInput");

// Firebase Auth State Listener — auto-detects login/logout
onAuthStateChanged(auth, (user) => {
    if (user) {
        showDashboard();
    } else {
        loginSection.classList.remove("hidden");
        dashboardSection.classList.add("hidden");
    }
});

// Login Handler
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Authenticating...';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle showing the dashboard
    } catch (error) {
        let msg = "Login failed. Please check your credentials.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            msg = "Incorrect email or password.";
        } else if (error.code === 'auth/user-not-found') {
            msg = "No admin account found with this email.";
        } else if (error.code === 'auth/too-many-requests') {
            msg = "Too many failed attempts. Try again later.";
        }
        showAlert(msg, "red");
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Authenticate <i data-lucide="arrow-right" class="w-4 h-4"></i>';
        lucide.createIcons();
    }
});

function showDashboard() {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    fetchStudents();
}

logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    document.getElementById("loginEmail").value = "";
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
                '<button onclick="window.printForm(\'' + student.id + '\')" class="py-2 px-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors text-[10px] font-bold uppercase tracking-widest border border-emerald-100" title="Print Admission Form"><i data-lucide="printer" class="w-3.5 h-3.5"></i></button>' +
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
        { key: 'all',      label: 'Total Collection' },
        { key: 'Phulwari Block', label: 'Phulwari Block' },
        { key: 'Phulwari Golambar', label: 'Phulwari Golambar' }
    ];

    var activeFilter = overviewEl.dataset.activeFilter || 'all';

    // Filter students for active tab
    var filtered = activeFilter === 'all'
        ? data
        : data.filter(function(s) { return (s.branch || '').trim() === activeFilter; });

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

    // Use filtered data for subject totals to reflect the active tab
    filtered.forEach(function(s) {
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
            : data.filter(function(s){ return (s.branch||'').trim() === tab.key; }).length;
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
            branch: document.getElementById("admin_branch").value,
            address: document.getElementById("admin_address").value,
            photoBase64: document.getElementById('admin_photoBase64').value || ""
        };

        const editId = document.getElementById("editStudentId").value;
        if (editId) {
            await updateDoc(doc(db, "students", editId), studentData);
        } else {
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
    document.getElementById("admin_branch").value = s.branch || "Phulwari Block";
    document.getElementById("admin_address").value = s.address || "";
    
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
    } else if (sectionId === 'idcards') {
        document.getElementById('section-idcards').classList.remove('hidden');
        document.getElementById('section-idcards').classList.add('block');
        document.getElementById('nav-idcards').classList.add('nav-active', 'text-white', 'font-bold');
        document.getElementById('nav-idcards').classList.remove('text-[#5E6E82]');
        if(window.loadIDCardStudents) window.loadIDCardStudents();
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
        const noteSubject = document.getElementById('noteSubject').value;
        const progressContainer = document.getElementById('noteUploadProgress');
        const progressBar = document.getElementById('noteProgressBar');
        const progressPercent = document.getElementById('noteProgressPercent');

        const file = fileInput.files[0];
        if (!file) return;

        if (file.size > 26214400) { // 25 MB
            errorMsg.classList.remove('hidden');
            return;
        }
        errorMsg.classList.add('hidden');

        btn.disabled = true;
        btn.innerHTML = `<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Uploading...`;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';

        try {
            const cloudName = "dc77zv3qa";
            const uploadPreset = "vt_academy_notes";
            
            // Use Chunked Upload to bypass 10MB free tier limit (Cloudinary supports up to 100MB with chunking)
            const cloudinaryUrl = await new Promise(async (resolve, reject) => {
                try {
                    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
                    const uniqueUploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                    let start = 0;
                    let finalUrl = null;

                    while (start < file.size) {
                        const end = Math.min(start + chunkSize, file.size);
                        const chunk = file.slice(start, end);
                        
                        const fd = new FormData();
                        fd.append("file", chunk, file.name);
                        fd.append("upload_preset", uploadPreset);

                        const isLastChunk = end === file.size;

                        await new Promise((resChunk, rejChunk) => {
                            const xhr = new XMLHttpRequest();
                            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
                            xhr.setRequestHeader('X-Unique-Upload-Id', uniqueUploadId);
                            xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${file.size}`);
                            
                            xhr.upload.onprogress = (e) => {
                                if (e.lengthComputable) {
                                    const overallLoaded = start + e.loaded;
                                    const pct = Math.round((overallLoaded / file.size) * 100);
                                    progressBar.style.width = pct + '%';
                                    progressPercent.textContent = pct + '%';
                                    btn.innerHTML = `<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Uploading ${pct}%`;
                                }
                            };

                            xhr.onload = () => {
                                if (xhr.status >= 200 && xhr.status < 300) {
                                    if (isLastChunk) {
                                        const data = JSON.parse(xhr.responseText);
                                        finalUrl = data.secure_url;
                                    }
                                    resChunk();
                                } else {
                                    try {
                                        const errData = JSON.parse(xhr.responseText);
                                        rejChunk(new Error(errData.error?.message || 'Cloudinary upload failed'));
                                    } catch {
                                        rejChunk(new Error('Upload failed with status ' + xhr.status));
                                    }
                                }
                            };
                            
                            xhr.onerror = () => rejChunk(new Error('Network error during chunk upload'));
                            xhr.send(fd);
                        });

                        start = end;
                    }
                    resolve(finalUrl);
                } catch(err) {
                    reject(err);
                }
            });

            btn.innerHTML = `<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Saving...`;

            await addDoc(collection(db, "notes"), {
                title: title,
                class: noteClass,
                subject: noteSubject,
                fileUrl: cloudinaryUrl,
                createdAt: serverTimestamp()
            });

            uploadNoteForm.reset();
            progressContainer.classList.add('hidden');
            await loadNotes();
            alert('Note uploaded successfully!');

        } catch (error) {
            console.error("Error uploading note:", error);
            alert('Failed to upload note: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="upload" class="w-4 h-4"></i> Upload Note`;
            progressContainer.classList.add('hidden');
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
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium text-sm">No notes uploaded yet.</td></tr>';
        return;
    }

    let html = '';
    notesList.forEach(note => {
        const dateStr = note.createdAt ? new Date(note.createdAt.toDate()).toLocaleDateString() : 'Unknown';
        const subjectLabel = note.subject || '—';
        
        html += `
            <tr class="hover:bg-slate-50/50 transition-colors group">
                <td class="p-4 text-sm font-bold text-[#0B2447]">${note.title}</td>
                <td class="p-4">
                    <span class="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg tracking-widest">${note.class}</span>
                </td>
                <td class="p-4">
                    <span class="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg tracking-widest">${subjectLabel}</span>
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
                testMap[name] = { count: 0, date: data.date || '', createdAt: data.createdAt ? data.createdAt.seconds : 0, courses: new Set() };
            } else {
                var dataSec = data.createdAt ? data.createdAt.seconds : 0;
                if (dataSec > testMap[name].createdAt) {
                    testMap[name].createdAt = dataSec;
                }
            }
            testMap[name].count++;
            if (data.course) testMap[name].courses.add(data.course);
            if (data.testClass) testMap[name].courses.add(data.testClass);
        });

        scoreboardTestNames = Object.keys(testMap).sort(function(a, b) {
            var dateA = new Date(testMap[a].date || 0).getTime();
            var dateB = new Date(testMap[b].date || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return testMap[b].createdAt - testMap[a].createdAt;
        });

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
            entries = entries.filter(function(e) { return (e.testClass || e.course) === scoreboardActiveClass; });
        }

        // Sort by percentage descending, then by obtained marks descending
        entries.sort(function(a, b) {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return (b.obtained || 0) - (a.obtained || 0);
        });

        // Build class filter pills
        var allCourses = new Set();
        snap.forEach(function(d) { 
            var cls = d.data().testClass || d.data().course;
            if (cls) allCourses.add(cls); 
        });
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
            var printBtn = document.getElementById('adminPrintScoreboardBtn');
            if (printBtn) printBtn.style.display = 'none';
            return;
        }

        var printBtn = document.getElementById('adminPrintScoreboardBtn');
        if (printBtn) printBtn.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();

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

window.printAdminScoreboard = async function() {
    if (!scoreboardActiveTest) return;

    var printContainer = document.getElementById('printContainer');
    if (!printContainer) return;

    var btn = document.getElementById('adminPrintScoreboardBtn');
    var originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<i class="animate-spin w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent inline-block mr-1"></i> Printing...';
    btn.disabled = true;

    try {
        var q = query(collection(db, 'scoreboard'), where('testName', '==', scoreboardActiveTest));
        var snap = await getDocs(q);

        var entries = [];
        snap.forEach(function(d) {
            entries.push({ id: d.id, ...d.data() });
        });

        if (scoreboardActiveClass !== 'all') {
            entries = entries.filter(function(e) { return e.course === scoreboardActiveClass; });
        }

        entries.sort(function(a, b) {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return (b.obtained || 0) - (a.obtained || 0);
        });

        if (entries.length === 0) {
            alert("No data to print.");
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
            return;
        }

        var printTitle = scoreboardActiveTest + " - Results";
        if (scoreboardActiveClass !== 'all') printTitle += " | Class: " + scoreboardActiveClass;

        var html = `
            <div style="font-family: 'Outfit', sans-serif; max-width: 800px; margin: 0 auto; padding-top: 0px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                    <div style="flex: 1;"></div>
                    <div style="flex: 2; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                            <img src="logo black academe.png" style="height: 120px; object-fit: contain;" alt="VT Academe Logo">
                        </div>
                        <h2 style="font-size: 16px; font-weight: 700; color: #475569; margin: 0;">${printTitle}</h2>
                    </div>
                    <div style="flex: 1; text-align: right; font-family: 'Ink Free', cursive; font-size: 18px; font-weight: bold; color: #0B2447;">The Best Teachers-At one Place</div>
                </div>
        `;

        if (entries.length >= 3) {
            html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; page-break-inside: avoid;">`;
            
            const podiumOrder = [
                { e: entries[1], rank: 2, medal: '🥈', border: '#cbd5e1', bg: '#f8fafc' },
                { e: entries[0], rank: 1, medal: '🥇', border: '#fde047', bg: '#fefce8' },
                { e: entries[2], rank: 3, medal: '🥉', border: '#fdba74', bg: '#fff7ed' }
            ];

            podiumOrder.forEach(item => {
                const initials = (item.e.studentName || 'U').split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();
                const avatarHtml = item.e.studentPhoto 
                    ? `<img src="${item.e.studentPhoto}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`
                    : `<span style="font-size: 16px; font-weight: 900; color: #64748b;">${initials}</span>`;
                
                html += `
                    <div style="background-color: ${item.bg}; border: 1.5px solid ${item.border}; border-radius: 12px; padding: 12px 8px; text-align: center; ${item.rank === 1 ? 'transform: translateY(-8px);' : ''}">
                        <div style="font-size: 24px; margin-bottom: 6px;">${item.medal}</div>
                        <div style="width: 45px; height: 45px; border-radius: 10px; background: white; border: 1.5px solid ${item.border}; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            ${avatarHtml}
                        </div>
                        <h3 style="font-size: 13px; font-weight: 900; color: #0B2447; margin: 0 0 3px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.e.studentName || 'Unknown'}</h3>
                        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                            ${item.e.course || ''} ${item.e.subject ? '• ' + item.e.subject : ''}
                        </div>
                        <div style="font-size: 18px; font-weight: 900; color: #0B2447;">${item.e.percentage || 0}<span style="font-size: 11px; color: #64748b;">%</span></div>
                        <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px;">${item.e.obtained || 0} / ${item.e.total || 0}</div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px;">`;
        
        const listEntries = entries.length >= 3 ? entries.slice(3) : entries;
        
        listEntries.forEach((entry, idx) => {
            const rank = entries.length >= 3 ? idx + 4 : idx + 1;
            const perc = entry.percentage || 0;
            
            let medalHtml = `<div style="width: 20px; height: 20px; border-radius: 4px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #64748b; flex-shrink: 0;">${rank}</div>`;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                        ${medalHtml}
                        <div style="font-size: 12px; font-weight: 800; color: #0B2447; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${entry.studentName || 'Unknown'}</div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                        <span style="font-size: 12px; font-weight: 900; color: #0B2447;">${perc}%</span>
                        <span style="font-size: 9px; font-weight: 700; color: #64748b; margin-left: 3px;">(${entry.obtained || 0}/${entry.total || 0})</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;

        html += `
            <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 10px; font-weight: 600; color: #64748b; margin: 0; letter-spacing: 0.05em; text-transform: uppercase;">
                    Check the authenticity of the result from: <a href="https://www.vtacademe.com/scoreboard.html" style="color: #0B2447; font-weight: 900; text-decoration: none;">https://www.vtacademe.com/scoreboard.html</a>
                </p>
            </div>
        `;
        
        html += `</div>`;

        printContainer.innerHTML = html;

        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        setTimeout(() => {
            window.print();
        }, 300);

    } catch(err) {
        console.error('Error preparing print:', err);
        alert("Failed to prepare print view: " + err.message);
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
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

// ═══════════════════════════════════════════════════════════════════
// SCOREBOARD BATCH TEST LOGIC
// ═══════════════════════════════════════════════════════════════════

window.switchScoreboardTab = function(tab) {
    if (tab === 'create') {
        document.getElementById('sbPanelCreate').classList.remove('hidden');
        document.getElementById('sbPanelView').classList.add('hidden');
        document.getElementById('sbTabCreate').classList.replace('text-slate-500', 'text-[#0B2447]');
        document.getElementById('sbTabCreate').classList.add('bg-white', 'shadow-md', 'border', 'border-slate-200');
        document.getElementById('sbTabView').classList.replace('text-[#0B2447]', 'text-slate-500');
        document.getElementById('sbTabView').classList.remove('bg-white', 'shadow-md', 'border', 'border-slate-200');
    } else {
        document.getElementById('sbPanelCreate').classList.add('hidden');
        document.getElementById('sbPanelView').classList.remove('hidden');
        document.getElementById('sbTabView').classList.replace('text-slate-500', 'text-[#0B2447]');
        document.getElementById('sbTabView').classList.add('bg-white', 'shadow-md', 'border', 'border-slate-200');
        document.getElementById('sbTabCreate').classList.replace('text-[#0B2447]', 'text-slate-500');
        document.getElementById('sbTabCreate').classList.remove('bg-white', 'shadow-md', 'border', 'border-slate-200');
        loadScoreboardTests();
    }
};

window.loadBatchStudents = function() {
    const cls = document.getElementById('batchTestClass').value;
    const container = document.getElementById('batchStudentsContainer');
    const emptyState = document.getElementById('batchEmptyState');
    const listEl = document.getElementById('batchStudentsList');
    
    if (!cls) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    const filtered = studentsList.filter(s => s.course === cls || s.batch === cls || s.std === cls || (s.std && s.std.includes(cls)));
    document.getElementById('batchStudentCount').textContent = filtered.length;
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-slate-200 rounded-xl">No students found in ' + cls + '</div>';
        return;
    }
    
    let html = '';
    filtered.forEach(s => {
        const initials = (s.name || 'U').split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();
        const avatarHtml = s.photoBase64 ? 
            '<img src="' + s.photoBase64 + '" class="w-full h-full object-cover rounded-lg">' : 
            '<span class="text-[10px] font-black text-slate-500">' + initials + '</span>';
        const idStr = s.admissionNo || s.formNo || s.id.slice(0, 6);
        
        html += `
            <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors batch-student-row" data-id="${s.id}" data-name="${(s.name||'').replace(/"/g, '&quot;')}" data-photo="${s.photoBase64||''}" data-course="${s.course||s.batch||s.std||''}" data-adm="${idStr}">
                <input type="checkbox" checked class="batch-student-cb w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" onchange="window.updateBatchSelectedCount()">
                <div class="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300 overflow-hidden">
                    ${avatarHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-black text-[#0B2447] truncate">${s.name || 'Unnamed'}</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${idStr}</div>
                </div>
                <div class="shrink-0 w-24">
                    <input type="number" step="0.5" min="0" placeholder="Marks" class="batch-student-marks w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-[#0B2447] font-black text-center shadow-sm">
                </div>
            </div>
        `;
    });
    
    listEl.innerHTML = html;
    window.updateBatchSelectedCount();
};

window.batchToggleAll = function() {
    const visibleRows = Array.from(document.querySelectorAll('.batch-student-row')).filter(row => row.style.display !== 'none');
    if (visibleRows.length === 0) return;
    
    const visibleCbs = visibleRows.map(row => row.querySelector('.batch-student-cb')).filter(cb => cb !== null);
    if (visibleCbs.length === 0) return;
    
    const allChecked = visibleCbs.every(cb => cb.checked);
    visibleCbs.forEach(cb => cb.checked = !allChecked);
    
    const btn = document.getElementById('batchSelectAllBtn');
    btn.textContent = allChecked ? 'Select All' : 'Deselect All';
    window.updateBatchSelectedCount();
};

window.updateBatchSelectedCount = function() {
    const cbs = document.querySelectorAll('.batch-student-cb:checked');
    document.getElementById('batchSelectedCount').textContent = cbs.length + ' selected';
};

window.filterBatchStudents = function() {
    const query = (document.getElementById('batchStudentSearch').value || '').toLowerCase();
    const rows = document.querySelectorAll('.batch-student-row');
    rows.forEach(row => {
        const name = (row.dataset.name || '').toLowerCase();
        const adm = (row.dataset.adm || '').toLowerCase();
        if (name.includes(query) || adm.includes(query)) {
            row.style.display = 'flex';
        } else {
            row.style.display = 'none';
        }
    });
};

window.publishBatchTest = async function() {
    const tName = document.getElementById('batchTestName').value.trim();
    const tDate = document.getElementById('batchTestDate').value;
    const tSub = document.getElementById('batchTestSubject').value;
    const tClass = document.getElementById('batchTestClass').value;
    const tTotal = Number(document.getElementById('batchTestTotal').value);
    
    if (!tName || !tDate || !tSub || !tClass || !tTotal) {
        return alert("Please fill all test details (Name, Date, Subject, Class, Total Marks).");
    }
    
    const rows = document.querySelectorAll('.batch-student-row');
    const entries = [];
    
    rows.forEach(row => {
        const cb = row.querySelector('.batch-student-cb');
        if (cb.checked) {
            const marksInput = row.querySelector('.batch-student-marks');
            const marksStr = marksInput.value.trim();
            if (marksStr !== "") {
                entries.push({
                    id: row.dataset.id,
                    name: row.dataset.name,
                    photo: row.dataset.photo,
                    course: row.dataset.course,
                    adm: row.dataset.adm,
                    obtained: Number(marksStr)
                });
            }
        }
    });
    
    if (entries.length === 0) {
        return alert("Please enter marks for at least one selected student.");
    }
    
    const btn = document.getElementById('batchPublishBtn');
    btn.disabled = true;
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Publishing...';
    
    try {
        const timestamp = serverTimestamp();
        let successCount = 0;
        
        for (const entry of entries) {
            // Write to student's assessments subcollection
            const payload = {
                testName: tName,
                date: tDate,
                obtained: entry.obtained,
                total: tTotal,
                createdAt: timestamp
            };
            const assessRef = await addDoc(collection(db, "students", entry.id, "assessments"), payload);
            
            // Write to scoreboard collection
            const percentage = tTotal > 0 ? ((entry.obtained / tTotal) * 100) : 0;
            await addDoc(collection(db, "scoreboard"), {
                testName: tName,
                date: tDate,
                studentId: entry.id,
                assessmentId: assessRef.id,
                studentName: entry.name,
                studentPhoto: entry.photo,
                course: entry.course,
                admissionNo: entry.adm,
                obtained: entry.obtained,
                total: tTotal,
                percentage: Math.round(percentage * 10) / 10,
                subject: tSub,
                testClass: tClass,
                createdAt: timestamp
            });
            successCount++;
        }
        
        alert(`Successfully published results for ${successCount} students!`);
        
        // Reset inputs
        document.getElementById('batchTestName').value = '';
        document.getElementById('batchTestDate').value = '';
        const rowsToClear = document.querySelectorAll('.batch-student-marks');
        rowsToClear.forEach(r => r.value = '');
        
        // Switch to View Tests tab automatically
        window.switchScoreboardTab('view');
        
    } catch (err) {
        console.error("Batch Publish Error:", err);
        alert("An error occurred while publishing: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
};

// Print Form Function
window.printForm = (id) => {
    const student = studentsList.find(s => s.id === id);
    if (!student) return;

    const printContainer = document.getElementById('printContainer');
    if (!printContainer) return;

    const b = (student.branch || '').toLowerCase();
    const isMain = b === 'phulwari block';
    const isSecond = b === 'phulwari golambar';

    const mainBranchClass = isMain ? 'text-[#800000] underline' : 'text-[#2B4B7C]';
    const secondBranchClass = isSecond ? 'text-[#800000] underline' : 'text-[#800000]';

    const photoSrc = student.photoBase64 || '';
    const photoHtml = photoSrc 
        ? `<img src="${photoSrc}" class="w-full h-full object-cover" />` 
        : `<div class="flex items-center justify-center w-full h-full text-center text-[10px] text-slate-500 p-2 border-2 border-slate-200">Paste recent passport size photo</div>`;

    // Helpers to create letter boxes
    const createBoxes = (str, len) => {
        let h = '';
        for (let i = 0; i < len; i++) {
            const char = (str && str[i] && str[i] !== ' ') ? str[i] : '';
            h += `<div class="w-[20px] h-[24px] border border-[#2B4B7C] flex items-center justify-center font-black uppercase text-[#2B4B7C]">${char}</div>`;
        }
        return h;
    };

    const createDigitBoxes = (str, len) => {
        const digits = (str || '').replace(/\\D/g, '');
        let h = '';
        for (let i = 0; i < len; i++) {
            const char = (digits && digits[i]) ? digits[i] : '';
            h += `<div class="w-[20px] h-[24px] border border-[#2B4B7C] flex items-center justify-center font-black uppercase text-[#2B4B7C]">${char}</div>`;
        }
        return h;
    };

    // Admission HTML
    printContainer.innerHTML = `
        <div class="border-[3px] border-[#2B4B7C] p-4 text-[#2B4B7C] relative min-h-[290mm] bg-white">
            
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <!-- Logo side -->
                <div class="w-[150px]">
                    <img src="logo black academe.png" onerror="this.src='logo1.png'" alt="VT Academe" class="w-full h-auto">
                    <div class="text-[10px] font-bold text-center mt-1 text-[#D4AF37] uppercase">ADM NO: ${student.admissionNo || ''}</div>
                </div>

                <!-- Center text -->
                <div class="flex-1 text-center px-2">
                    <div class="flex justify-center gap-3 text-xs font-bold text-[#800000] mb-1">
                        <span>Mob.: 8083832058, 7044536503</span>
                        <span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> www.vtacademe.com</span>
                    </div>
                    <h2 class="text-xl font-black underline mb-2 uppercase">Admission Form</h2>
                    
                    <div class="flex justify-center items-start gap-4 mb-1">
                        <div class="text-center w-[160px]">
                            <h3 class="text-lg font-black ${mainBranchClass}">MAIN BRANCH</h3>
                            <p class="text-[8px] text-slate-800 font-semibold leading-tight mt-0.5">Opposite phulwari block gate</p>
                        </div>
                        <div class="w-px h-10 bg-slate-400 mt-1"></div>
                        <div class="text-center w-[160px]">
                            <h3 class="text-lg font-black ${secondBranchClass}">SECOND BRANCH</h3>
                            <p class="text-[8px] text-slate-800 font-semibold leading-tight mt-0.5">2nd floor above motichoor building beside Fashion up mall , phulwari sharif golambar pin 801505</p>
                        </div>
                    </div>
                    
                    <div class="text-sm font-black text-[#1A365D] mt-2">
                        Registration Fee 500/-
                    </div>
                </div>

                <!-- Photo Box -->
                <div class="w-[100px] h-[125px] border-2 border-[#800000] shrink-0 bg-white">
                    ${photoHtml}
                </div>
            </div>

            <div class="w-full h-0.5 bg-[#008080] mb-3"></div>

            <!-- Instructions -->
            <div class="space-y-1 mb-5 text-[11px] font-bold text-[#800000]">
                <div class="flex items-start gap-2">
                    <span class="text-base leading-none">★</span> 
                    <span>Use Blue/Black Ball Point Pen to fill this form in CAPITAL Letters.</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-base leading-none">★</span> 
                    <span>Please Tick as ☑</span>
                </div>
            </div>

            <!-- Form Fields -->
            <div class="space-y-4 text-[11px] font-bold text-black">
                
                <!-- Student Name -->
                <div class="flex items-start gap-2">
                    <div class="w-[140px] flex items-center gap-2 shrink-0 text-[#800000]">
                        <span class="text-base leading-none">★</span> Student's Name :
                    </div>
                    <div class="flex-1 flex flex-wrap gap-[2px]">
                        ${createBoxes(student.name, 25)}
                    </div>
                </div>

                <!-- Father's Name -->
                <div class="flex items-start gap-2 mt-2">
                    <div class="w-[140px] flex items-start gap-2 shrink-0 text-[#800000]">
                        <span class="text-base leading-none">★</span> Father's / <br>&nbsp;&nbsp;&nbsp;Guardian's Name :
                    </div>
                    <div class="flex-1 flex flex-wrap gap-[2px]">
                        ${createBoxes(student.fatherName, 25)}
                    </div>
                </div>

                <!-- DOB & Gender -->
                <div class="flex items-center gap-4 mt-5 pl-5">
                    <div class="w-[120px]">Date of Birth <span class="float-right">:</span></div>
                    <div class="flex gap-[2px]">
                        ${createBoxes('', 2)} <div class="w-3 text-center">-</div>
                        ${createBoxes('', 2)} <div class="w-3 text-center">-</div>
                        ${createBoxes('', 4)}
                    </div>
                    
                    <div class="ml-auto flex items-center gap-2">
                        <div>Gender :</div>
                        <div class="w-[80px] h-[24px] border border-[#2B4B7C] px-2 flex items-center uppercase font-black text-[#2B4B7C]">${student.gender || ''}</div>
                    </div>
                </div>

                <!-- Mobile No -->
                <div class="flex items-center gap-2 mt-5">
                    <div class="w-[140px] flex items-center gap-2 shrink-0 text-[#800000]">
                        <span class="text-base leading-none">★</span> Mobile No. :
                    </div>
                    <div class="flex gap-[2px]">
                        ${createDigitBoxes(student.phone, 10)}
                    </div>
                    
                    <div class="ml-auto flex items-center gap-2">
                        <div class="text-[#800000]"><span class="text-base leading-none">★</span> Parent's / Guardian's Mobile No.</div>
                        <div class="flex gap-[2px]">
                            ${createDigitBoxes(student.parentMobile, 10)}
                        </div>
                    </div>
                </div>
                
                <!-- Parent Mobile Boxes & Aadhar & Board -->
                <div class="flex items-center gap-2 mt-1.5">
                    <div class="w-[140px] pl-5">Aadhar No. <span class="float-right">:</span></div>
                    <div class="flex gap-[2px]">
                        ${createDigitBoxes('', 12)}
                    </div>
                    
                    <div class="ml-auto flex gap-1 items-center">
                        <div class="mr-1">Board:</div>
                        <div class="w-[100px] h-[24px] border border-[#2B4B7C] px-2 flex items-center uppercase text-[#2B4B7C] font-black">${student.board || ''}</div>
                    </div>
                </div>
                
                <!-- School & Address -->
                <div class="flex items-center gap-2 mt-5">
                    <div class="w-[140px] flex items-start gap-2 shrink-0 text-[#800000]">
                        <span class="text-base leading-none mt-0.5">★</span> <div>Name of School/<br>College</div>
                    </div>
                    <div class="flex-1 h-[24px] border border-[#2B4B7C] px-2 uppercase flex items-center text-[#2B4B7C]">
                        
                    </div>
                </div>

                <div class="flex items-end gap-2 mt-3 pl-5">
                    <div class="w-[120px]">Present Address</div>
                    <div class="flex-1 border-b-[1.5px] border-dotted border-black min-h-[20px] uppercase text-[#2B4B7C] flex items-end pb-0.5 whitespace-nowrap overflow-hidden">
                        ${student.address || ''}
                    </div>
                </div>
                <div class="flex items-end gap-2 mt-3 pl-5">
                    <div class="w-full border-b-[1.5px] border-dotted border-black min-h-[20px]"></div>
                </div>

                <!-- Medium -->
                <div class="flex items-center gap-4 mt-5 pl-5">
                    <div class="ml-auto flex items-center gap-2 border border-black px-2 py-1 bg-slate-50">
                        <span class="font-bold">Medium :</span>
                        <span>Hindi</span><div class="w-[16px] h-[16px] border border-[#2B4B7C] bg-white flex items-center justify-center"></div>
                        <span class="ml-1">English</span><div class="w-[16px] h-[16px] border border-[#2B4B7C] bg-white flex items-center justify-center"></div>
                    </div>
                </div>
            </div>

            <!-- Note Text -->
            <div class="mt-8 text-[9px] text-center font-bold px-4 leading-tight">
                (Note 1: It is the responsibility of guardians to pick and drop their wards at coaching premises. 2: If misbehaviour is found toward the student they can be eliminated. 3: There is no responsibility of the students outside the coachong premises)
            </div>

            <!-- Signatures and Bottom section -->
            <div class="mt-10 flex justify-between px-4 pb-4">
                <div class="text-center w-[180px]">
                    <div class="border-t border-black pt-1 mb-5 text-[11px] font-bold">Signature of student</div>
                    
                    <div class="flex items-end gap-2 mb-3 text-left">
                        <span class="text-[#2B4B7C] text-[11px] font-bold">Form No...............</span>
                    </div>
                    <div class="flex items-center gap-2 mb-3 text-left">
                        <span class="text-[#2B4B7C] text-[11px] font-bold">Batch</span>
                        <div class="w-[80px] h-[24px] border border-[#2B4B7C] ml-4 uppercase text-[11px] flex items-center px-1 font-black text-[#2B4B7C]">${student.batch || student.course || ''}</div>
                    </div>
                    <div class="flex items-center gap-2 text-left">
                        <span class="text-[#2B4B7C] text-[11px] font-bold">Admission No.</span>
                        <div class="w-[80px] h-[24px] border border-[#2B4B7C] uppercase text-[11px] flex items-center px-1 font-black text-[#2B4B7C]">${student.admissionNo || ''}</div>
                    </div>
                </div>

                <div class="text-center w-[180px] flex flex-col items-center">
                    <div class="border-t border-black pt-1 mb-1 w-[80%] text-[11px] font-bold">Signature of Father/Guardian</div>
                    <div class="text-[#800000] text-[11px] font-bold mt-1">*FOR OFFICE USE ONLY*</div>
                    
                    <div class="flex items-center gap-2 mt-6 w-full text-left">
                        <span class="text-[#2B4B7C] text-[11px] font-bold w-[70px]">Class</span>
                        <div class="flex-1 h-[24px] border border-[#2B4B7C] uppercase text-[11px] flex items-center px-1 font-black text-[#2B4B7C]">${student.course || ''}</div>
                    </div>
                    <div class="flex items-center gap-2 mt-3 w-full text-left">
                        <span class="text-[#2B4B7C] text-[11px] font-bold w-[70px]">SUBJECT</span>
                        <div class="flex-1 border-b-[1.5px] border-dotted border-[#2B4B7C] min-h-[18px] uppercase text-[11px] flex items-end font-black text-[#2B4B7C]">${student.std || ''}</div>
                    </div>
                </div>

                <div class="text-center w-[180px]">
                    <div class="border-t border-black pt-1 mb-5 text-[11px] font-bold">Signature of Receiver</div>
                    <div class="text-left text-[#2B4B7C] text-[11px] font-bold">
                        Date: .........................
                    </div>
                </div>
            </div>
            
            <div class="absolute bottom-0 left-4 right-4 border-b-[3px] border-dotted border-slate-400"></div>
        </div>
    `;

    // Wait for dynamic DOM changes then print
    setTimeout(() => {
        window.print();
    }, 300);
};

// ═══════════════════════════════════════════════════════════════════
// ID CARD PRINT LOGIC
// ═══════════════════════════════════════════════════════════════════

window.loadIDCardStudents = function() {
    const cls = document.getElementById('idcardClassFilter').value;
    const listEl = document.getElementById('idcardStudentsList');
    
    let filtered = studentsList;
    if (cls) {
        filtered = studentsList.filter(s => s.course === cls || s.batch === cls || s.std === cls || (s.std && s.std.includes(cls)));
    }
    
    document.getElementById('idcardStudentCount').textContent = filtered.length;
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="col-span-full text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest border-2 border-dashed border-slate-200 rounded-xl">No students found</div>';
        return;
    }
    
    let html = '';
    filtered.forEach(s => {
        const initials = (s.name || 'U').split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();
        const avatarHtml = s.photoBase64 ? 
            '<img src="' + s.photoBase64 + '" class="w-full h-full object-cover rounded-lg">' : 
            '<span class="text-[10px] font-black text-slate-500">' + initials + '</span>';
        const idStr = s.admissionNo || s.formNo || s.id.slice(0, 6);
        
        html += `
            <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors idcard-student-row cursor-pointer" data-id="${s.id}" onclick="this.querySelector('.idcard-student-cb').click()">
                <input type="checkbox" class="idcard-student-cb w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" onclick="event.stopPropagation()" onchange="window.updateIDCardSelectedCount()">
                <div class="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300 overflow-hidden">
                    ${avatarHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-black text-[#0B2447] truncate">${s.name || 'Unnamed'}</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${idStr} | ${s.course || s.std || s.batch || 'N/A'}</div>
                </div>
            </div>
        `;
    });
    
    listEl.innerHTML = html;
    window.updateIDCardSelectedCount();
};

window.idcardToggleAll = function() {
    const cbs = document.querySelectorAll('.idcard-student-cb');
    if (cbs.length === 0) return;
    
    const allChecked = Array.from(cbs).every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
    
    window.updateIDCardSelectedCount();
};

window.updateIDCardSelectedCount = function() {
    const cbs = document.querySelectorAll('.idcard-student-cb');
    const checked = document.querySelectorAll('.idcard-student-cb:checked');
    document.getElementById('idcardSelectedCount').textContent = checked.length + ' selected';
    const btn = document.getElementById('idcardSelectAllBtn');
    
    if (checked.length === 0) {
        btn.textContent = 'Select All';
    } else if (checked.length === cbs.length) {
        btn.textContent = 'Deselect All';
    } else {
        btn.textContent = 'Select All';
    }
};

window.printSelectedIDCards = function() {
    const selectedCbs = document.querySelectorAll('.idcard-student-cb:checked');
    if (selectedCbs.length === 0) {
        alert("Please select at least one student to print ID card.");
        return;
    }
    
    const printContainer = document.getElementById('printContainer');
    if (!printContainer) return;
    
    const btn = document.getElementById('printIDCardsBtn');
    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = '<i class="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent inline-block mr-2"></i> Generating...';
    btn.disabled = true;

    let html = '';
    const cbArray = Array.from(selectedCbs);
    
    for (let i = 0; i < cbArray.length; i += 9) {
        const chunk = cbArray.slice(i, i + 9);
        html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 5px; justify-items: center; align-content: start; max-width: 800px; margin: 0 auto; page-break-after: always; padding-top: 15px;">';
        
        chunk.forEach(cb => {
            const row = cb.closest('.idcard-student-row');
        const id = row.dataset.id;
        const student = studentsList.find(s => s.id === id);
        if (!student) return;

        const nameParts = (student.name || '').trim().split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ');
        // using transparent pixel if no photo
        const photoSrc = student.photoBase64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

        const dob = student.dob || 'N/A';
        const phone = student.parentPhone || student.phone || 'N/A';
        const blood = student.bloodGroup || student.blood || 'N/A';
        const addr = student.address || 'N/A';
        const courseStr = student.course || student.std || student.batch || 'N/A';
        const admId = student.admissionNo || student.id.slice(0,6).toUpperCase();

        let displayClass = courseStr.toUpperCase();
        if (!displayClass.includes('CLASS') && courseStr !== 'N/A') {
            displayClass = 'CLASS ' + displayClass;
        }

        html += `
<div style="width: 54mm; height: 86mm; overflow: hidden; break-inside: avoid; background: transparent;">
    <div style="transform: scale(0.6375); transform-origin: top left; width: 320px; height: 510px;">
        <div class="id-card" style="width: 320px; height: 510px; border-radius: 16px; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: inline-block;">
    <!-- Dotted Backgrounds -->
    <div style="position: absolute; left: 0; top: 0; width: 40px; height: 100%; background-image: radial-gradient(#f97316 1.5px, transparent 1.5px); background-size: 8px 8px; opacity: 0.25;"></div>
    <div style="position: absolute; right: 0; top: 0; width: 40px; height: 100%; background-image: radial-gradient(#f97316 1.5px, transparent 1.5px); background-size: 8px 8px; opacity: 0.25;"></div>
    
    <!-- Top Orange Wave -->
    <svg style="position: absolute; top: -30px; left: 0; width: 100%; height: auto;" viewBox="0 0 320 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H320V70C270 40 220 110 160 100C100 90 50 40 0 70V0Z" fill="#ea580c"/>
    </svg>

    <!-- Punch Hole -->
    <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 50px; height: 8px; background: #fff; border-radius: 4px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); z-index: 30;"></div>

    <!-- Logo (Absolutely Positioned to overlap white bg mostly) -->
    <div style="position: absolute; top: 35px; left: 0; width: 100%; text-align: center; z-index: 20;">
        <img src="logo black academe.png" style="height: 90px; object-fit: contain; margin: 0 auto; display: block;" alt="Logo">
    </div>

    <!-- Content Wrapper -->
    <div style="position: relative; z-index: 10; padding: 135px 20px 0; text-align: center;">
        <!-- Photo -->
        <div style="width: 95px; height: 95px; margin: 0 auto 10px; border-radius: 50%; border: 3px solid #ea580c; padding: 3px; background: #fff; position: relative;">
            <img src="${photoSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Student Photo">
        </div>

        <!-- Name -->
        <h2 style="font-size: 19px; font-weight: 900; margin: 0 0 6px; letter-spacing: 0.5px; line-height: 1.1; text-transform: uppercase;">
            <span style="color: #ea580c;">${firstName}</span> <span style="color: #111827;">${lastName}</span>
        </h2>

        <!-- Class Badge -->
        <div style="background: #ea580c; color: #fff; display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; margin-bottom: 14px; box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);">
            ${displayClass}
        </div>

        <!-- Details -->
        <div style="text-align: left; padding: 0 10px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 20px; height: 20px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 11px; height: 11px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #374151; width: 85px;">Student ID</div>
                <div style="font-size: 11px; font-weight: 800; color: #ea580c;">: &nbsp;${admId}</div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 20px; height: 20px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 11px; height: 11px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #374151; width: 85px;">Parent Mobile</div>
                <div style="font-size: 11px; font-weight: 700; color: #111827;">: &nbsp;${phone}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 20px; height: 20px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 11px; height: 11px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.686 2 6 5.636 6 10c0 4.364 6 12 6 12s6-7.636 6-12c0-4.364-2.686-8-6-8z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #374151; width: 85px;">Blood Group</div>
                <div style="font-size: 11px; font-weight: 700; color: #111827;">: &nbsp;${blood}</div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <div style="width: 20px; height: 20px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                    <svg style="width: 11px; height: 11px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #374151; width: 85px;">Address</div>
                <div style="font-size: 11px; font-weight: 700; color: #111827; flex: 1; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">: &nbsp;${addr}</div>
            </div>
        </div>
    </div>

    <!-- Bottom Bar & Footers (flat design, no wave) -->
    <div style="position: absolute; bottom: 20px; left: 0; width: 100%; height: 36px; background: #9ca3af; border-radius: 0; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg style="width: 16px; height: 16px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
        <span style="color: white; font-size: 12px; font-weight: 700;">www.vtacademe.com</span>
    </div>
    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 20px; background: #ea580c; border-radius: 0 0 16px 16px; z-index: 3; display: flex; align-items: center; justify-content: center; overflow: visible;">
        <span style="color: #ffffff; font-size: 5.5px; font-weight: 800; letter-spacing: 0px; white-space: nowrap; text-transform: uppercase;">OUR BRANCHES: IN FRONT OF PHULWARI BLOCK GATE &nbsp;|&nbsp; PHULWARI GOLAMBAR ABOVE MOTICHOOR</span>
    </div>
</div>
    </div>
</div>
`;
        });
        html += '</div>';
    }
    
    printContainer.innerHTML = html;
    
    setTimeout(() => {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
        if(typeof lucide !== 'undefined') lucide.createIcons();
        window.print();
    }, 2000);
};
