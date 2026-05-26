const https = require('https');

https.get('https://vtacademe.com/admin-script.js', (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
