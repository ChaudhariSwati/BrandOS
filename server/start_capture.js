var cp = require('child_process');
var child = cp.spawn('node', ['src/index.js'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
});
var output = '';
child.stdout.on('data', function(d) { output += d.toString(); process.stdout.write(d); });
child.stderr.on('data', function(d) { output += d.toString(); process.stderr.write(d); });
setTimeout(function() {
  console.log('\n=== CAPTURED OUTPUT ===');
  console.log(output);
  var http = require('http');
  var req = http.get('http://localhost:5000/api/health', function(res) {
    var data = '';
    res.on('data', function(c) { data += c; });
    res.on('end', function() {
      console.log('Health status:', res.statusCode, data.substring(0, 300));
      child.kill();
      process.exit(0);
    });
  });
  req.on('error', function(e) {
    console.log('Health FAILED:', e.message);
    child.kill();
    process.exit(1);
  });
  req.setTimeout(3000, function() {
    console.log('Health TIMEOUT');
    child.kill();
    process.exit(1);
  });
}, 12000);
