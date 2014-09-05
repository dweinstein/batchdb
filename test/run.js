var test = require('tape');
var batchdb = require('../');
var mkdirp = require('mkdirp');
var os = require('os');
var path = require('path');
var spawn = require('child_process').spawn;
var duplexer = require('duplexer');
var concat = require('concat-stream');

var tmpdir = path.join((os.tmpdir || os.tmpDir)(), 'batchdb.' + Math.random());
mkdirp.sync(tmpdir);

var db = require('level')(path.join(tmpdir, 'compute.db'));

var expected = [
    [ 'CREATE', 'c0320d2f8e6fcee8145cdf7a8cb0fe11bf5820e44390097300adf05ad0ddbca5' ],
    'sleep 1; hostname',
    [ 'PUSH', 'c0320d2f8e6fcee8145cdf7a8cb0fe11bf5820e44390097300adf05ad0ddbca5' ],
    [ 'CREATE', '3435bb0065250a67c226fdcb1aefab113b738d17e4f43004b9b9d642e31fec10' ],
    'sleep 1; pwd',
    [ 'PUSH', '3435bb0065250a67c226fdcb1aefab113b738d17e4f43004b9b9d642e31fec10' ],
    [ 'CREATE', 'cda14a731876c0775efc30845bd3a8514e87502afb19919de858afed91e6adc0' ],
    'sleep 1; echo beep boop',
    [ 'PUSH', 'cda14a731876c0775efc30845bd3a8514e87502afb19919de858afed91e6adc0' ],
    [ 'RESULT', 'c0320d2f8e6fcee8145cdf7a8cb0fe11bf5820e44390097300adf05ad0ddbca5' ],
    os.hostname() + '\n',
    [ 'RESULT', '3435bb0065250a67c226fdcb1aefab113b738d17e4f43004b9b9d642e31fec10' ],
    __dirname + '\n',
    [ 'RESULT', 'cda14a731876c0775efc30845bd3a8514e87502afb19919de858afed91e6adc0' ],
    'beep boop\n'
];

test('run', function (t) {
    t.plan(expected.length);
    var compute = batchdb(db, { path: path.join(tmpdir, 'blobs'), run: run });
    
    compute.on('create', function (key) {
        t.deepEqual([ 'CREATE', key ], expected.shift());
        var cex = expected.shift();
        compute.getJob(key).pipe(concat(function (body) {
            t.equal(body.toString('utf8'), cex);
        }));
    });
    compute.on('push', function (key, created) {
        t.deepEqual([ 'PUSH', key ], expected.shift());
    });
    compute.on('result', function (key, id) {
        t.deepEqual([ 'RESULT', key ], expected.shift());
        var rex = expected.shift();
        compute.getResult(id).pipe(concat(function (body) {
            t.equal(body.toString('utf8'), rex);
        }));
    });
    
    compute.add().end('sleep 1; hostname');
    compute.add().end('sleep 1; pwd');
    compute.add().end('sleep 1; echo beep boop');
    
    compute.run();
    
    function run (key) {
        var ps = spawn('bash', [], { cwd: __dirname });
        return duplexer(ps.stdin, ps.stdout);
    }
});