# gl
`gl` lets you create a WebGL context in node.js without making a window or loading a full browser environment.

It aspires to fully conform to the [WebGL 1.0.3 specification](https://www.khronos.org/registry/webgl/specs/1.0.3/).

## Example

```javascript
//Create context
var width   = 64
var height  = 64
var gl = require('gl')(width, height, { preserveDrawingBuffer: true })

//Clear screen to red
gl.clearColor(1, 0, 0, 1)
gl.clear(gl.COLOR_BUFFER_BIT)

//Write output as a PPM formatted image
var pixels = new Uint8Array(width * height * 4)
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
process.stdout.write(['P3\n# gl.ppm\n', width, " ", height, '\n255\n'].join(''))
for(var i=0; i<pixels.length; i+=4) {
  for(var j=0; j<3; ++j) {
    process.stdout.write(pixels[i+j] + ' ')
  }
}
```

## Install
Because `gl` uses native code, it is a bit more involved to set up than a typical JavaScript npm module.  Before you can use it, you will need to ensure that your system has the correct dependencies installed.

### System dependencies
For general information on building native modules, see the [`node-gyp`](https://github.com/nodejs/node-gyp) documentation. System specific build instructions are as follows:

#### Mac OS X

* Python 2.7
* XCode

#### Ubuntu/Debian

* Python 2.7
* A GNU C++ environment (available via the `build-essential` package on `apt`)
* libxi-dev
* Working and up to date OpenGL drivers
* GLEW

```
$ sudo apt-get install -y build-essential libxi-dev libglu1-mesa-dev
```

#### Windows

* Python 2.7
* Microsoft Visual Studio

### npm
Once your system is set up, installing the `headless-gl` module is pretty easy to do with [npm](http://docs.npmjs.org).  Just run the following command:

```
npm i gl
```

And you are good to go!

## API

### Context creation

#### `var gl = require('gl')(width, height[, options])`
Creates a new `WebGLRenderingContext` with the given parameters.

* `width` is the width of the drawing buffer
* `height` is the height of the drawing buffer
* `options` is an optional object whose properties are the context attributes for the WebGLRendering context

**Returns** A new `WebGLRenderingContext` object

### Extra methods

In addition to all of the usual WebGL methods, `headless-gl` adds the following two methods to each WebGL context in order to support some functionality which would not otherwise be exposed at the WebGL level.

#### `gl.resize(width, height)`
Resizes the drawing buffer of a WebGL rendering context

* `width` is the new width of the drawing buffer for the context
* `height` is the new height of the drawing buffer for the context

**Note** In the DOM, this method would implemented by resizing the canvas, which is done by modifying the `width/height` properties.

#### `gl.destroy()`
Destroys the WebGL context immediately, reclaiming all resources

**Note** For long running jobs, garbage collection of contexts is often not fast enough.  To prevent the system from becoming overloaded with unused contexts, you can force the system to reclaim a WebGL context immediately by calling `.destroy()`.

## More information

### Improvements from version 1.0.0

The previous version of `gl` (aka `headless-gl`) was pretty much a terrible hack. Thanks to the support of @mapbox and @google's ANGLE project, `gl` is now actually kind of good!  The following things are now way better in version >=2.0.0:

* Vastly improved conformance
* Khronos ARB test suite integration via `gl-conformance`
* Works on node 0.12
* Windows and Linux support
* No default context
* Added `.destroy()` and `.resize()` methods

### Why use this thing instead of `node-webgl`?

It depends on what you are trying to do.  [node-webgl](https://github.com/mikeseven/node-webgl) is good if you are making a graphical application like a game, and allows for access to some features which are not part of ordinary WebGL.  On the other hand, because headless-gl does not create any windows, it is suitable for running in a server environment.  This means that you can use it to generate figures using OpenGL or perform GPGPU computations using shaders. Also, unlike `node-webgl`, `headless-gl` attempts to correctly implement the full WebGL standard making it more reliable.

### Why use this thing instead of `nw.js`/electron/atom shell/Chromium?

`nw.js` is good if you need a full DOM implementation.  On the other hand, because it is a larger dependency it can be more difficult to set up and configure.  `headless-gl` is lighter weight and more modular in the sense that it just implements WebGL and nothing else.

### How are `<image>` and `<video>` elements implemented?

They aren't for now.  If you want to upload data to a texture, you will need to unpack the pixels into a `Uint8Array` and feed it into `texImage2D`.

### What extensions are supported?

See https://github.com/stackgl/headless-gl/issues/5 for current status.

### How is the development environment set up?

1. Clone this repo: `git clone git@github.com:stackgl/headless-gl.git`
1. Switch to the headless gl directory: `cd headless-gl`
1. Initialize the angle submodule: `git submodule init`
1. Update the angle submodule: `git submodule update`
1. Install npm dependencies: `npm install`
1. Run node-gyp to generate build scripts: `npm run build`

Once this is done, you should be good to go!  A few more things

* To run the test cases, use the command `npm test`, or execute specific by just running it using node.
* On a Unix-like platform, you can do incremental rebuilds by going into the `build/` directory and running `make`

This should work on most environments, but hasn't been tested thoroughly with windows.

## License

See LICENSES
