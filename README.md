pvc-file
========
[![Circle CI](https://circleci.com/gh/jagill/node-pvc-file/tree/master.svg?style=shield)](https://circleci.com/gh/jagill/node-pvc-file/tree/master)

In the spirit of [pvc](https://github.com/jagill/pvc), a set of Node.js
utilities to deal with the file as a stream.

To install:
```js
npm install pvc-file
```

To include:
```js
var pvcf = require('pvc-file');
```

### Walk a directory
When a stream writes a path to `pvcf.walker`, it walks down the directory
tree, pushing a `stats` object augmented by the name and path of the file.

```js
var walker = pvcf.walker()
walker.write('mydir');
walker.on('data', function (data) {
  console.log(data);
});
// {name: 'file1', path: 'mydir/file1', ... }
// {name: 'file2', path: 'mydir/file2', ... }
// {name: 'dir1', path: 'mydir/dir1', ... }
// {name: 'file3', path: 'mydir/dir1/file3', ... }
// ...
```

### Convert files to streams
When a stream writes a file path to `pvcf.fileStreamer`, it opens a Readable
file stream, pushing it line by line down the pipe.  It will only consume the
next line when it the pipeline requests it, and only open the next file if it
has exhausted the current file stream, which makes it very memory efficient.

```js
var streamer = pvcf.fileStreamer()
streamer.write('file1');
streamer.write('file2');
streamer.on('data', function (data) {
  console.log(data);
});
// 'first line from file 1'
// 'second line from file 1'
// 'first line from file 2'
// 'second line from file 2'
// 'third line from file 2'
// ...
```

### Watch a directory tree
Watch a directory tree, pushing changed or added files down the pipeline.
This basically connects [chokidar](https://github.com/paulmillr/chokidar) to a
pipe.

Note that unlike the other utilities, this is just a Readable stream, it's not
a Transform or Duplex.
```js
var watcher = pvcf.watcher('mydir')
watcher.on('data', function (data) {
  console.log(data);
});
// {type: 'addDir', path: 'dir1' }
// {type: 'add', path: 'dir1/file1' }
// {type: 'change', path: 'dir1/file1' }
// {type: 'unlink', path: 'dir1/file1' }
// {type: 'unlinkDir', path: 'dir1' }
```
