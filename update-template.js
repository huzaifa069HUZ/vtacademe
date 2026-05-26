const fs = require('fs');
let code = fs.readFileSync('c:\\\\Users\\\\huzai\\\\Desktop\\\\vt academy\\\\admin-script.js', 'utf8');

const prefixMatch = code.match(/(html \+= \`[\s\S]*?<img src="data:image\/png;base64,)/);
const suffixMatch = code.match(/(" style="height: [\s\S]*?<\/div>\n    <\/div>\n<\/div>\n\`;)/);

if (!prefixMatch || !suffixMatch) {
    console.log('Could not find matches');
    process.exit(1);
}

const base64Data = code.substring(prefixMatch.index + prefixMatch[0].length, suffixMatch.index);

const newPrefix = `html += \`
<div style="width: 54mm; height: 86mm; overflow: hidden; break-inside: avoid; background: transparent;">
    <div style="transform: scale(0.6375); transform-origin: top left; width: 320px; height: 510px;">
        <div class="id-card" style="width: 320px; height: 510px; border-radius: 12px; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: inline-block;">
    
    <div style="position: absolute; left: 0; top: 80px; bottom: 80px; width: 40px; background-image: radial-gradient(#ea580c 1.5px, transparent 1.5px); background-size: 10px 10px; opacity: 0.3;"></div>
    <div style="position: absolute; right: 0; top: 80px; bottom: 80px; width: 40px; background-image: radial-gradient(#ea580c 1.5px, transparent 1.5px); background-size: 10px 10px; opacity: 0.3;"></div>
    
    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: auto; z-index: 1;" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0 H320 V70 Q240 10 160 20 T0 70 Z" fill="#ea580c"/>
    </svg>

    <div style="position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 50px; height: 8px; background: #fff; border-radius: 4px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); z-index: 30;"></div>

    <div style="position: absolute; top: 35px; left: 0; width: 100%; text-align: center; z-index: 20;">
        <img src="data:image/png;base64,`;

const newSuffix = \`" style="height: 55px; object-fit: contain; margin: 0 auto; display: block;" alt="Logo">
    </div>

    <div style="position: relative; z-index: 10; padding: 100px 20px 0; text-align: center;">
        <div style="width: 100px; height: 100px; margin: 0 auto 8px; border-radius: 50%; border: 3px solid #ea580c; padding: 3px; background: #fff; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <img src="${photoSrc}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Student Photo">
        </div>

        <h2 style="font-size: 22px; font-weight: 800; margin: 6px 0 4px; letter-spacing: 0.5px; line-height: 1.1; text-transform: uppercase;">
            <span style="color: #ea580c;">${firstName}</span> <span style="color: #111827;">${lastName}</span>
        </h2>

        <div style="background: #ea580c; color: #fff; display: inline-block; padding: 4px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 15px; box-shadow: 0 2px 6px rgba(234, 88, 12, 0.3);">
            Class : ${courseStr}
        </div>

        <div style="text-align: left; padding: 0 5px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 22px; height: 22px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 12px; height: 12px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 500; color: #374151; width: 80px;">Student ID</div>
                <div style="font-size: 11px; font-weight: 800; color: #ea580c; flex: 1;">: &nbsp;${admId}</div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 22px; height: 22px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 12px; height: 12px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 500; color: #374151; width: 80px;">Date of Birth</div>
                <div style="font-size: 11px; font-weight: 600; color: #111827; flex: 1;">: &nbsp;${dob}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 22px; height: 22px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 12px; height: 12px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 500; color: #374151; width: 80px;">Parent Mobile</div>
                <div style="font-size: 11px; font-weight: 600; color: #111827; flex: 1;">: &nbsp;${phone}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">
                <div style="width: 22px; height: 22px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 12px; height: 12px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.686 2 6 5.636 6 10c0 4.364 6 12 6 12s6-7.636 6-12c0-4.364-2.686-8-6-8z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 500; color: #374151; width: 80px;">Blood Group</div>
                <div style="font-size: 11px; font-weight: 600; color: #111827; flex: 1;">: &nbsp;${blood}</div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="width: 22px; height: 22px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                    <svg style="width: 12px; height: 12px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div style="font-size: 11px; font-weight: 500; color: #374151; width: 80px;">Address</div>
                <div style="font-size: 11px; font-weight: 600; color: #111827; flex: 1; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">: &nbsp;${addr}</div>
            </div>
        </div>
    </div>

    <svg style="position: absolute; bottom: 0; left: 0; width: 100%; height: auto; z-index: 1;" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 30 Q80 60 160 50 T320 30 V80 H0 Z" fill="#8c9196"/>
    </svg>
    <div style="position: absolute; bottom: 8px; left: 0; width: 100%; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg style="width: 16px; height: 16px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
        <span style="color: white; font-size: 12px; font-weight: 500; letter-spacing: 0.3px;">www.vtacademe.com</span>
    </div>
</div>
    </div>
</div>
\`;

const finalCode = code.substring(0, prefixMatch.index) + newPrefix + base64Data + newSuffix + code.substring(suffixMatch.index + suffixMatch[0].length);
fs.writeFileSync('c:\\\\Users\\\\huzai\\\\Desktop\\\\vt academy\\\\admin-script.js', finalCode, 'utf8');
console.log('Successfully updated template');
