var db = require('level')('/tmp/compute.db');

var compute = require('../')(db, { path: './blobs' });
compute.create().end('sleep 5; date');

compute.on('create', function (key) {
    console.log('created', key);
});
