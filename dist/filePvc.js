(function() {
  var Duplex, FileStreamer, Readable, Transform, Walker, Watcher, _extend, _path, chokidar, fs, ref,
    hasProp = {}.hasOwnProperty,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  _path = require('path');

  ref = require('stream'), Transform = ref.Transform, Duplex = ref.Duplex, Readable = ref.Readable;

  chokidar = require('chokidar');

  _extend = function() {
    var base, ext, exts, i, k, len, v;
    base = arguments[0];
    if (!base) {
      return {};
    }
    exts = Array.prototype.slice(arguments, 1);
    for (i = 0, len = exts.length; i < len; i++) {
      ext = exts[i];
      for (k in ext) {
        if (!hasProp.call(ext, k)) continue;
        v = ext[k];
        base[k] = v;
      }
    }
    return base;
  };

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
      var defaultIgnored, defaultOptions;
      Watcher.__super__.constructor.call(this, {
        objectMode: true
      });
      defaultIgnored = [/~$/, '**/.*.swp', /\.git\//, 'node_modules', '**/*.pyc', '**/*.pyo', '.DS_Store', '\#*\#'];
      defaultOptions = {
        ignored: defaultIgnored
      };
      options = _extend(defaultOptions, options);
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


  /*
  Accepts incoming filepaths, and outputs their contents as a stream.
  
  Note that this flattens the output, so that the streams are concatenated.
  The output is NOT in objectMode.
   */

  FileStreamer = (function(superClass) {
    extend(FileStreamer, superClass);

    function FileStreamer() {
      FileStreamer.__super__.constructor.call(this, {
        allowHalfOpen: true,
        writableObjectMode: true
      });
      this.queue = [];
      this.currentStream = null;
      this.finished = false;
      this.on('finish', (function(_this) {
        return function() {
          return _this.finished = true;
        };
      })(this));
    }

    FileStreamer.prototype._pump = function() {
      var chunk, results;
      results = [];
      while ((chunk = this.currentStream.read()) != null) {
        if (!this.push(chunk)) {
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    FileStreamer.prototype._makeStream = function() {
      var s, task;
      task = this.queue.shift();
      if (!task) {
        this.push(this.finished ? null : '');
        return;
      }
      this.currentStream = s = fs.createReadStream(task.filepath);
      s.on('end', (function(_this) {
        return function() {
          _this.currentStream = null;
          task.done();
          return _this._makeStream();
        };
      })(this));
      s.on('error', (function(_this) {
        return function(err) {
          return _this.emit('error', err);
        };
      })(this));
      return s.on('readable', (function(_this) {
        return function() {
          return _this._pump();
        };
      })(this));
    };

    FileStreamer.prototype._read = function(size) {
      if (this.currentStream) {
        return this._pump();
      } else {
        return this._makeStream();
      }
    };

    FileStreamer.prototype._write = function(filepath, encoding, done) {
      if (filepath) {
        return this.queue.push({
          filepath: filepath,
          done: done
        });
      } else {
        return done();
      }
    };

    return FileStreamer;

  })(Duplex);

  exports.fileStreamer = function() {
    return new FileStreamer();
  };

}).call(this);
