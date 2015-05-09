fs = require 'fs'
_path = require 'path'
{Transform, Duplex, Readable} = require 'stream'
split = require 'split'
chokidar = require 'chokidar'

# Accepts incoming directory paths and outputs the filetree underneath them.
# The output is an lstat object, with the additional fields name: and path:
# filled in.
class Walker extends Transform
  constructor: (opt={}) ->
    opt.objectMode = true
    super opt

  _transform: (dir, encoding, done) ->
    self = this
    fs.readdir dir, (err, filenames) ->
      if err
        self.emit('error', err)
        return

      numFiles = filenames.length
      # If the dir is empty, move along.
      done() unless numFiles
      filenames.forEach (filename) ->
        filepath = _path.join(dir, filename)
        fs.lstat filepath, (err, stats) ->
          numFiles--
          if err
            self.emit('error', err)
            return
          if stats.isDirectory()
            # We are going to recursively walk down the tree
            self.write filepath
          stats.name = filename
          stats.path = filepath

          self.push stats
          done() unless numFiles

exports.walker = -> new Walker()

###
Accepts incoming filepaths, and outputs their contents as a stream of lines.

Note that this flattens the output.
###
class FileStreamer extends Duplex
  constructor: () ->
    super allowHalfOpen: true, readableObjectMode: true, writableObjectMode: true
    @currentStream = null

  _read: (size) ->
    if @currentStream
      @push @currentStream.read()
    else
      # Signal that we are not done, but don't have anything currently.
      @push ''

  _write: (filepath, encoding, done) ->
    s = fs.createReadStream(filepath)
    s.on 'end', ->
      @currentStream = null
      done()
    s.on 'error', (err) ->
      @emit 'error', err
    @currentStream = s.pipe(split())

exports.fileStreamer = -> new FileStreamer()

###*
Watches a directory, outputting any changes.  This is just a wrapper for
chokidar, converting its output into a stream.

@output:
  type: 'add', 'change', 'unlink', 'addDir', 'unlinkDir'
  path: relative path of file/dir changed
###
class Watcher extends Readable
  ###*
  @param path Path to watch; file, dir, or glob
  @param options Chokidar options
  ###
  constructor: (path, options) ->
    super objectMode: true
    @watcher = chokidar.watch path, options
    ['add', 'change', 'unlink', 'addDir', 'unlinkDir'].forEach (type) =>
      @watcher.on type, (path) =>
        @push {type, path}

  # All the pushes happen above, but we need this for correctness.
  _read: ->

exports.watcher = (path, options) -> new Watcher path, options
