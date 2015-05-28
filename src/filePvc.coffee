fs = require 'fs'
_path = require 'path'
{Transform, Duplex, Readable} = require 'stream'
chokidar = require 'chokidar'

_extend = ->
  base = arguments[0]
  return {} unless base

  exts = Array.prototype.slice arguments, 1
  for ext in exts
    for own k, v of ext
      base[k] = v

  return base


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

    # TODO: Take additional ignored in as an option
    # TODO: Take in a flag to not use default ignored.
    defaultIgnored = [
      /~$/,
      '.*.swp',
      /\.git\//,
      'node_modules',
      '*.pyc',
      '*.pyo',
      '.DS_Store',
      '\#*\#',
    ]

    defaultOptions =
      ignored: defaultIgnored

    options = _extend defaultOptions, options

    @watcher = chokidar.watch path, options
    ['add', 'change', 'unlink', 'addDir', 'unlinkDir'].forEach (type) =>
      @watcher.on type, (path) =>
        @push {type, path}

  # All the pushes happen above, but we need this for correctness.
  _read: ->

exports.watcher = (path, options) -> new Watcher path, options

###
Accepts incoming filepaths, and outputs their contents as a stream.

Note that this flattens the output, so that the streams are concatenated.
The output is NOT in objectMode.
###
class FileStreamer extends Duplex
  constructor: () ->
    super allowHalfOpen: true, writableObjectMode: true
    @queue = []
    @currentStream = null
    @finished = false
    @on 'finish', =>
      @finished = true

  _pump: ->
    while (chunk = @currentStream.read())?
      break unless @push chunk

  _makeStream: ->
    task = @queue.shift()

    unless task
      # No more inputs
      # If finished, signal end, else wait
      @push if @finished then null else ''
      return

    @currentStream = s = fs.createReadStream(task.filepath)
    s.on 'end', =>
      @currentStream = null
      task.done()
      @_makeStream()
    s.on 'error', (err) =>
      @emit 'error', err
    s.on 'readable', =>
      @_pump()


  _read: (size) ->
    if @currentStream
      @_pump()
    else
      # Must open a stream
      @_makeStream()


  _write: (filepath, encoding, done) ->
    if filepath
      @queue.push {filepath, done}
    else
      # just ignore falsey paths
      done()


exports.fileStreamer = -> new FileStreamer()
