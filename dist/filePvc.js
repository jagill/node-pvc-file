(function() {
  var Duplex, FileStreamer, Readable, Transform, Walker, Watcher, _path, chokidar, fs, ref, split,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  fs = require('fs');

  _path = require('path');

  ref = require('stream'), Transform = ref.Transform, Duplex = ref.Duplex, Readable = ref.Readable;

  split = require('split');

  chokidar = require('chokidar');

  Walker = (function(superClass) {
    extend(Walker, superClass);

    function Walker(opt) {
      if (opt == null) {
        opt = {};
      }
      opt.objectMode = true;
      Walker.__super__.constructor.call(this, opt);
    }

    Walker.prototype._transform = function(dir, encoding, done) {
      var self;
      self = this;
      return fs.readdir(dir, function(err, filenames) {
        var numFiles;
        if (err) {
          self.emit('error', err);
          return;
        }
        numFiles = filenames.length;
        if (!numFiles) {
          done();
        }
        return filenames.forEach(function(filename) {
          var filepath;
          filepath = _path.join(dir, filename);
          return fs.lstat(filepath, function(err, stats) {
            numFiles--;
            if (err) {
              self.emit('error', err);
              return;
            }
            if (stats.isDirectory()) {
              self.write(filepath);
            }
            stats.name = filename;
            stats.path = filepath;
            self.push(stats);
            if (!numFiles) {
              return done();
            }
          });
        });
      });
    };

    return Walker;

  })(Transform);

  exports.walker = function() {
    return new Walker();
  };


  /*
  Accepts incoming filepaths, and outputs their contents as a stream of lines.
  
  Note that this flattens the output.
   */

  FileStreamer = (function(superClass) {
    extend(FileStreamer, superClass);

    function FileStreamer() {
      FileStreamer.__super__.constructor.call(this, {
        allowHalfOpen: true,
        readableObjectMode: true,
        writableObjectMode: true
      });
      this.currentStream = null;
    }

    FileStreamer.prototype._read = function(size) {
      if (this.currentStream) {
        return this.push(this.currentStream.read());
      } else {
        return this.push('');
      }
    };

    FileStreamer.prototype._write = function(filepath, encoding, done) {
      var s;
      s = fs.createReadStream(filepath);
      s.on('end', function() {
        this.currentStream = null;
        return done();
      });
      s.on('error', function(err) {
        return this.emit('error', err);
      });
      return this.currentStream = s.pipe(split());
    };

    return FileStreamer;

  })(Duplex);

  exports.fileStreamer = function() {
    return new FileStreamer();
  };


  /**
  Watches a directory, outputting any changes.  This is just a wrapper for
  chokidar, converting its output into a stream.
  
  @output:
    type: 'add', 'change', 'unlink', 'addDir', 'unlinkDir'
    path: relative path of file/dir changed
   */

  Watcher = (function(superClass) {
    extend(Watcher, superClass);


    /**
    @param path Path to watch; file, dir, or glob
    @param options Chokidar options
     */

    function Watcher(path, options) {
      Watcher.__super__.constructor.call(this, {
        objectMode: true
      });
      this.watcher = chokidar.watch(path, options);
      ['add', 'change', 'unlink', 'addDir', 'unlinkDir'].forEach((function(_this) {
        return function(type) {
          return _this.watcher.on(type, function(path) {
            return _this.push({
              type: type,
              path: path
            });
          });
        };
      })(this));
    }

    Watcher.prototype._read = function() {};

    return Watcher;

  })(Readable);

  exports.watcher = function(path, options) {
    return new Watcher(path, options);
  };

}).call(this);
