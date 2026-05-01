import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", () => {
    const photoInput = document.getElementById("photo");
    const photoPreview = document.getElementById("photoPreview");
    const photoStatusText = document.getElementById("photoStatusText");
    const photoBase64 = document.getElementById("photoBase64");

    // Handle photo preview and base64 conversion
    if (photoInput) {
        photoInput.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    photoPreview.src = event.target.result;
                    photoPreview.classList.remove("hidden");
                    photoStatusText.classList.add("hidden");
                    photoBase64.value = event.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                photoPreview.classList.add("hidden");
                photoStatusText.classList.remove("hidden");
                photoBase64.value = "";
            }
        });
    }

    const admissionForm = document.getElementById("admissionForm");
    const formAlert = document.getElementById("formAlert");
    const submitBtn = document.getElementById("submitBtn");
    const submitBtnText = document.getElementById("submitBtnText");

    if (admissionForm) {
        admissionForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Loading state
            submitBtn.disabled = true;
            submitBtnText.textContent = "Submitting...";

            try {
                // Collect form data
                const studentData = {
                    name: document.getElementById("name").value,
                    fatherName: document.getElementById("fatherName").value,
                    gender: document.getElementById("gender").value,
                    bloodGroup: document.getElementById("bloodGroup") ? document.getElementById("bloodGroup").value : "",
                    phone: document.getElementById("phone").value,
                    parentMobile: document.getElementById("parentMobile").value,
                    board: document.getElementById("board").value,
                    std: document.getElementById("std").value,
                    course: document.getElementById("course").value,
                    address: document.getElementById("address").value,
                    photoBase64: document.getElementById("photoBase64").value,
                    source: "admission",
                    feesTotal: 0,
                    feesPaid: 0,
                    createdAt: serverTimestamp()
                };

                // Add to Firestore
                await addDoc(collection(db, "students"), studentData);

                // Show success
                formAlert.classList.remove("hidden", "bg-red-50", "text-red-600", "border-red-200");
                formAlert.classList.add("bg-green-50", "text-green-600", "border-green-200");
                formAlert.textContent = "Registration Successful! Your details have been securely saved.";
                
                // Clear form
                admissionForm.reset();
                photoPreview.classList.add("hidden");
                photoStatusText.classList.remove("hidden");
                photoBase64.value = "";

                // Scroll to alert
                formAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });

            } catch (error) {
                console.error("Error adding document: ", error);
                
                // Show error
                formAlert.classList.remove("hidden", "bg-green-50", "text-green-600", "border-green-200");
                formAlert.classList.add("bg-red-50", "text-red-600", "border-red-200");
                formAlert.textContent = "An error occurred while saving your details. Please try again.";
            } finally {
                // Restore button
                submitBtn.disabled = false;
                submitBtnText.textContent = "Submit Registration";
            }
        });
    }

    // Custom Subject Multi-Select Logic
    const subjectSelector = document.getElementById('subject-selector');
    const subjectMenu = document.getElementById('subject-menu');
    const subjectCheckboxes = document.querySelectorAll('.subject-cb');
    const stdInput = document.getElementById('std');
    const subjectTags = document.getElementById('subject-tags');
    const subjectPlaceholder = document.getElementById('subject-placeholder');
    const subjectChevron = document.getElementById('subject-chevron');
    const subjectWrapper = document.getElementById('subject-dropdown-wrapper');

    if (subjectSelector && subjectMenu) {
        subjectSelector.addEventListener('click', () => {
            const isHidden = subjectMenu.classList.contains('hidden');
            if (isHidden) {
                subjectMenu.classList.remove('hidden');
                setTimeout(() => {
                    subjectMenu.classList.remove('opacity-0', 'translate-y-[-10px]');
                    subjectChevron.classList.add('rotate-180');
                }, 10);
            } else {
                subjectMenu.classList.add('opacity-0', 'translate-y-[-10px]');
                subjectChevron.classList.remove('rotate-180');
                setTimeout(() => subjectMenu.classList.add('hidden'), 200);
            }
        });

        document.addEventListener('click', (e) => {
            if (!subjectWrapper.contains(e.target) && !subjectMenu.classList.contains('hidden')) {
                subjectMenu.classList.add('opacity-0', 'translate-y-[-10px]');
                subjectChevron.classList.remove('rotate-180');
                setTimeout(() => subjectMenu.classList.add('hidden'), 200);
            }
        });

        function updateSubjectTags() {
            const selected = Array.from(subjectCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            stdInput.value = selected.join(', ');
            
            if (selected.length > 0) {
                subjectPlaceholder.classList.add('hidden');
                subjectTags.classList.remove('hidden');
                subjectTags.innerHTML = selected.map(val => 
                    `<span class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0B2447] text-white border border-[#0B2447]/20 shadow-sm">${val}</span>`
                ).join('');
            } else {
                subjectPlaceholder.classList.remove('hidden');
                subjectTags.classList.add('hidden');
                subjectTags.innerHTML = '';
            }
        }

        subjectCheckboxes.forEach(cb => {
            cb.addEventListener('change', updateSubjectTags);
        });
    }
});
