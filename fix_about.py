with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Find header end
header_end_idx = content.find("</header>") + len("</header>")
# Find footer start
footer_start_idx = content.find("<!-- Footer -->")

header = content[:header_end_idx]
footer = content[footer_start_idx:]

# the middle content
body = """
    <!-- Mobile Navigation Drawer -->
    <div id="mobile-menu-overlay" style="position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity 0.35s ease;" onclick="closeMobileMenu()"></div>

    <div id="mobile-menu-drawer" style="position:fixed;top:0;right:0;height:100%;width:min(320px,88vw);z-index:9999;background:linear-gradient(160deg,#0B1F3A 0%,#0d2e5e 60%,#0B2447 100%);transform:translateX(100%);transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);box-shadow:-8px 0 40px rgba(0,0,0,0.45);display:flex;flex-direction:column;overflow-y:auto;">
        <!-- Drawer Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 16px;border-bottom:1px solid rgba(249,115,22,0.2);">
            <div style="display:flex;align-items:center;gap:10px;">
                <img src="logo-with-text.png" alt="VT Academe Logo" style="height:50px;width:auto;object-fit:contain;">
            </div>
            <button id="mobile-menu-close" onclick="closeMobileMenu()" style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.07);border:1px solid rgba(249,115,22,0.3);color:#FDBA74;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s ease;font-size:20px;line-height:1;">&times;</button>
        </div>

        <!-- Nav Links -->
        <nav style="padding:24px 20px;display:flex;flex-direction:column;gap:4px;flex:1;">
            <a href="index.html" onclick="closeMobileMenu()" class="mobile-nav-link" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:1px solid transparent;transition:all 0.25s ease;">
                <svg style="width:18px;height:18px;flex-shrink:0;color:#F97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> Home
            </a>
            <a href="about.html" onclick="closeMobileMenu()" class="mobile-nav-link" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:1px solid transparent;transition:all 0.25s ease;">
                <svg style="width:18px;height:18px;flex-shrink:0;color:#F97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> About Us
            </a>
            <a href="COURSES.html" onclick="closeMobileMenu()" class="mobile-nav-link" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:1px solid transparent;transition:all 0.25s ease;">
                <svg style="width:18px;height:18px;flex-shrink:0;color:#F97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg> COURSES
            </a>
            <a href="gallery.html" onclick="closeMobileMenu()" class="mobile-nav-link" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:1px solid transparent;transition:all 0.25s ease;">
                <svg style="width:18px;height:18px;flex-shrink:0;color:#F97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> Gallery
            </a>
            <a href="student-portal.html" onclick="closeMobileMenu()" class="mobile-nav-link" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:1px solid transparent;transition:all 0.25s ease;">
                <svg style="width:18px;height:18px;flex-shrink:0;color:#F97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Students Portal
            </a>
            <a href="notes.html" onclick="closeMobileMenu()" class="mobile-nav-link" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.03em;text-decoration:none;border:1px solid transparent;transition:all 0.25s ease;">
                <svg style="width:18px;height:18px;flex-shrink:0;color:#F97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg> Free Notes
            </a>
        </nav>
    </div>

    <!-- ===== ABOUT US HEADER HERO ===== -->
    <section class="relative pt-32 pb-20 overflow-hidden bg-[#0B2447]">
        <div class="absolute inset-0 bg-[url('assets/hero bg.png')] opacity-20 bg-cover bg-center"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-[#0B2447]/90 to-[#0B2447]"></div>
        <div class="container mx-auto px-6 relative z-10 text-center text-white mt-12">
            <span class="text-[#F97316] uppercase tracking-[0.4em] text-xs font-bold block mb-4 animate-float">Our Story</span>
            <h1 class="text-5xl md:text-7xl font-black mb-6" style="font-family:'DM Serif Display',serif;">About <span class="text-[#F97316] italic font-light">VT Academe</span></h1>
            <p class="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto font-light leading-relaxed">
                Empowering the youth of Patna with world-class education, unyielding dedication, and a vision to build tomorrow's leaders.
            </p>
        </div>
    </section>

    <!-- ===== OUR VISION AND MISSION ===== -->
    <section class="py-24 bg-white relative overflow-hidden">
        <div class="absolute inset-0 bg-diamond-pattern opacity-30 pointer-events-none"></div>
        <div class="container mx-auto px-6 lg:px-16 relative z-10">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div class="relative group">
                    <div class="absolute inset-0 bg-gradient-to-r from-[#F97316] to-[#0B2447] rounded-3xl transform translate-x-4 translate-y-4 opacity-30 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500"></div>
                    <img src="assets/happy girl.jpeg" alt="Happy Student" class="relative rounded-3xl shadow-2xl w-full h-[500px] object-cover group-hover:scale-[1.02] transition-transform duration-500">
                    <div class="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 animate-float">
                        <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-[#F0F4FF] flex items-center justify-center text-[#F97316] text-2xl font-black">
                                500+
                            </div>
                            <div>
                                <h4 class="font-bold text-[#0B2447]">Selections</h4>
                                <p class="text-xs text-gray-500">And counting...</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-8">
                    <div>
                        <span class="text-[#F97316] uppercase tracking-[0.4em] text-xs font-bold block mb-2">Who We Are</span>
                        <h2 class="text-4xl md:text-5xl font-black text-[#0B2447]" style="font-family:'DM Serif Display',serif;">Welcome to VT Academe — <span class="text-[#F97316] italic font-light">Best Coaching in Patna</span></h2>
                    </div>
                    
                    <p class="text-gray-600 leading-relaxed text-lg">
                        <strong>VT Academe</strong> (also widely known as <strong>VT Academy</strong>) is a premier coaching institute located at <strong>Phulwari Sharif, Patna, Bihar</strong>. Whether you search for <em>VT Academy Patna</em>, <em>VT Academe</em>, <em>VTAcademy</em>, or simply <em>VT Academy</em> — you've found the right place. We are Patna's most trusted destination for <strong>NEET coaching</strong>, <strong>IIT-JEE (Main &amp; Advanced) preparation</strong>, <strong>Foundation courses for Class 7–10</strong>, and <strong>Board exam coaching for Class 11 &amp; 12</strong> (CBSE &amp; Bihar Board).
                    </p>
                    
                    <p class="text-gray-600 leading-relaxed text-lg">
                        Founded with the vision of providing world-class education in Patna, <strong>VT Academe Coaching Classes</strong> has grown into the region's leading institute with <strong>500+ successful selections</strong> in competitive exams. Our campus at <strong>Phulwari Khagaul Road, Patna 801505</strong> features modern classrooms, a digital learning lab, and a focused academic environment designed for excellence.
                    </p>
                    
                    <div class="flex flex-wrap gap-4 pt-4">
                        <div class="bg-[#F0F4FF] px-6 py-3 rounded-xl border border-blue-100 flex items-center gap-3 hover:shadow-md transition-shadow">
                            <span class="text-[#F97316]">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                            <span class="font-bold text-[#0B2447]">Experienced Faculty</span>
                        </div>
                        <div class="bg-[#F0F4FF] px-6 py-3 rounded-xl border border-blue-100 flex items-center gap-3 hover:shadow-md transition-shadow">
                            <span class="text-[#F97316]">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                            <span class="font-bold text-[#0B2447]">Small Batch Sizes</span>
                        </div>
                        <div class="bg-[#F0F4FF] px-6 py-3 rounded-xl border border-blue-100 flex items-center gap-3 hover:shadow-md transition-shadow">
                            <span class="text-[#F97316]">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </span>
                            <span class="font-bold text-[#0B2447]">Weekly Tests</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== WHY CHOOSE US CARDS ===== -->
    <section class="py-24 bg-[#0B2447] text-white relative">
        <div class="absolute inset-0 bg-luxury-pattern opacity-10"></div>
        <div class="container mx-auto px-6 lg:px-16 relative z-10">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-5xl font-black mb-4" style="font-family:'DM Serif Display',serif;">Why Choose <span class="text-[#F97316] italic font-light">VT Academe?</span></h2>
                <p class="text-blue-200 max-w-2xl mx-auto">We don't just teach — we build top rankers.</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Card 1 -->
                <div class="group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-orange-400 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Expert Faculty</h3>
                    <p class="text-blue-100/80 leading-relaxed">
                        Our expert faculty specializes in Physics, Chemistry, Mathematics, and Biology — covering the complete syllabus for NEET-UG, JEE Main, JEE Advanced, CBSE Board, and Bihar Board examinations.
                    </p>
                </div>
                <!-- Card 2 -->
                <div class="group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-orange-400 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Personalized Mentorship</h3>
                    <p class="text-blue-100/80 leading-relaxed">
                        Every student receives one-on-one attention. We identify strengths and weaknesses to provide a tailored learning path that ensures maximum growth and understanding.
                    </p>
                </div>
                <!-- Card 3 -->
                <div class="group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-orange-400 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-4">Proven Results</h3>
                    <p class="text-blue-100/80 leading-relaxed">
                        Students from across Patna, Phulwari Sharif, Danapur, Khagaul, and surrounding areas trust VT Academe. Our track record speaks for itself with countless top performers in competitive exams.
                    </p>
                </div>
            </div>
            
            <div class="mt-16 flex flex-wrap justify-center gap-4">
                <a href="admission.html" class="inline-flex items-center gap-2 bg-[#F97316] text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-orange-500 shadow-[0_4px_15px_rgba(249,115,22,0.4)] transition-all hover:-translate-y-1">Apply for Admission →</a>
                <a href="gallery.html" class="inline-flex items-center gap-2 border border-white/20 text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors">Explore Our Campus</a>
            </div>
        </div>
    </section>

    <!-- Include Mobile Nav Script -->
    <script>
        function openMobileMenu() {
            document.getElementById('mobile-menu-overlay').style.opacity = '1';
            document.getElementById('mobile-menu-overlay').style.pointerEvents = 'auto';
            document.getElementById('mobile-menu-drawer').style.transform = 'translateX(0)';
            document.body.style.overflow = 'hidden';
        }

        function closeMobileMenu() {
            document.getElementById('mobile-menu-overlay').style.opacity = '0';
            document.getElementById('mobile-menu-overlay').style.pointerEvents = 'none';
            document.getElementById('mobile-menu-drawer').style.transform = 'translateX(100%)';
            document.body.style.overflow = '';
        }

        document.getElementById('mobile-menu-button')?.addEventListener('click', openMobileMenu);
    </script>
"""

with open("about.html", "w", encoding="utf-8") as f:
    f.write(header + "\n" + body + "\n" + footer)
