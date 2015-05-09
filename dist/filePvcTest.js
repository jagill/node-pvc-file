(function() {
  var assert, filePvc;

  assert = require('chai').assert;

  filePvc = require('./filePvc');

  describe('walker', function() {
    var s;
    s = null;
    beforeEach(function() {
      return s = filePvc.walker();
    });
    it('emits the files from the directory', function(done) {
      var files;
      files = {};
      s.on('readable', function() {
        var f;
        f = s.read();
        if (f) {
          return files[f.path] = f;
        }
      });
      s.on('finish', function() {
        assert('test/data/a.txt' in files);
        assert('test/data/b.txt' in files);
        assert('test/data/stuff' in files);
        assert('test/data/stuff/c.txt' in files);
        assert('test/data/stuff/clink' in files);
        return done();
      });
      s.write('./test/data');
      return setTimeout(function() {
        return s.end();
      }, 10);
    });
    xit('does not die on an empty directory', function(done) {
      s.on('finish', function() {
        return done();
      });
      s.write('./test/data/empty');
      return setTimeout(function() {
        return s.end();
      }, 10);
    });
    it('emits stats object for files', function(done) {
      s.on('readable', function() {
        var f;
        f = s.read();
        if ((f != null ? f.path : void 0) === 'test/data/stuff/c.txt') {
          assert.isTrue(f.isFile());
          assert.isFalse(f.isDirectory());
          assert.equal('c.txt', f.name);
          assert.ok(f.mode);
          assert.ok(f.uid != null);
          assert.ok(f.gid != null);
          assert.ok(f.blksize != null);
          assert.ok(f.size != null);
          assert.ok(f.blocks != null);
          assert.ok(f.atime);
          assert.ok(f.ctime);
          return assert.ok(f.mtime);
        }
      });
      s.on('finish', function() {
        return done();
      });
      s.write('./test/data/stuff');
      return setTimeout(function() {
        return s.end();
      }, 10);
    });
    it('emits stats object for directories', function(done) {
      s.on('readable', function() {
        var f;
        f = s.read();
        if ((f != null ? f.path : void 0) === 'test/data/stuff') {
          assert.isTrue(f.isDirectory());
          assert.isFalse(f.isFile());
          assert.equal('stuff', f.name);
          assert.ok(f.mode);
          assert.ok(f.uid != null);
          assert.ok(f.gid != null);
          assert.ok(f.blksize != null);
          assert.ok(f.size != null);
          assert.ok(f.blocks != null);
          assert.ok(f.atime);
          assert.ok(f.ctime);
          return assert.ok(f.mtime);
        }
      });
      s.on('finish', function() {
        return done();
      });
      s.write('./test/data');
      return setTimeout(function() {
        return s.end();
      }, 10);
    });
    return it('emits stats object for symbolic links', function(done) {
      s.on('readable', function() {
        var f;
        f = s.read();
        if ((f != null ? f.path : void 0) === 'test/data/stuff/clink') {
          assert.isFalse(f.isDirectory());
          assert.isFalse(f.isFile());
          assert.isTrue(f.isSymbolicLink());
          assert.equal('clink', f.name);
          assert.ok(f.mode);
          assert.ok(f.uid != null);
          assert.ok(f.gid != null);
          assert.ok(f.blksize != null);
          assert.ok(f.size != null);
          assert.ok(f.blocks != null);
          assert.ok(f.atime);
          assert.ok(f.ctime);
          return assert.ok(f.mtime);
        }
      });
      s.on('finish', function() {
        return done();
      });
      s.write('./test/data');
      return setTimeout(function() {
        return s.end();
      }, 10);
    });
  });

}).call(this);
