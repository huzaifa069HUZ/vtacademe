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

const initApp = () => {
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
                    branch: document.getElementById("branch").value,
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




};
initApp();
