{assert} = require 'chai'
filePvc = require './filePvc'

describe 'walker', ->
  s = null
  beforeEach ->
    s = filePvc.walker()

  it 'emits the files from the directory', (done) ->
    files = {}
    s.on 'readable', ->
      f = s.read()
      files[f.path] = f if f
    s.on 'finish', ->
      assert 'test/data/a.txt' of files
      assert 'test/data/b.txt' of files
      assert 'test/data/stuff' of files
      assert 'test/data/stuff/c.txt' of files
      assert 'test/data/stuff/clink' of files
      done()
    s.write './test/data'
    setTimeout ->
        s.end()
      , 10

  # Git does not preserve these directories; can't test this automatically.
  xit 'does not die on an empty directory', (done) ->
    s.on 'finish', ->
      done()
    s.write './test/data/empty'
    setTimeout ->
        s.end()
      , 10

  it 'emits stats object for files', (done) ->
    s.on 'readable', ->
      f = s.read()
      if f?.path == 'test/data/stuff/c.txt'
        assert.isTrue f.isFile()
        assert.isFalse f.isDirectory()
        assert.equal 'c.txt', f.name
        assert.ok f.mode
        assert.ok f.uid?
        assert.ok f.gid?
        assert.ok f.blksize?
        assert.ok f.size?
        assert.ok f.blocks?
        assert.ok f.atime
        assert.ok f.ctime
        assert.ok f.mtime
    s.on 'finish', ->
      done()
    s.write './test/data/stuff'
    setTimeout ->
        s.end()
      , 10

  it 'emits stats object for directories', (done) ->
    s.on 'readable', ->
      f = s.read()
      if f?.path == 'test/data/stuff'
        assert.isTrue f.isDirectory()
        assert.isFalse f.isFile()
        assert.equal 'stuff', f.name
        assert.ok f.mode
        assert.ok f.uid?
        assert.ok f.gid?
        assert.ok f.blksize?
        assert.ok f.size?
        assert.ok f.blocks?
        assert.ok f.atime
        assert.ok f.ctime
        assert.ok f.mtime
    s.on 'finish', ->
      done()
    s.write './test/data'
    setTimeout ->
        s.end()
      , 10

  it 'emits stats object for symbolic links', (done) ->
    s.on 'readable', ->
      f = s.read()
      if f?.path == 'test/data/stuff/clink'
        assert.isFalse f.isDirectory()
        assert.isFalse f.isFile()
        assert.isTrue f.isSymbolicLink()
        assert.equal 'clink', f.name
        assert.ok f.mode
        assert.ok f.uid?
        assert.ok f.gid?
        assert.ok f.blksize?
        assert.ok f.size?
        assert.ok f.blocks?
        assert.ok f.atime
        assert.ok f.ctime
        assert.ok f.mtime
    s.on 'finish', ->
      done()
    s.write './test/data'
    setTimeout ->
        s.end()
      , 10
