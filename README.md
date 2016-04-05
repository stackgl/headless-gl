# gl
`gl` lets you create a WebGL context in node.js without making a window or loading a full browser environment.

It aspires to fully conform to the [WebGL 1.0.3 specification](https://www.khronos.org/registry/webgl/specs/1.0.3/).

[![NPM](https://nodei.co/npm/gl.png?compact=true)](https://nodei.co/npm/gl/)
[![Build Status](https://travis-ci.org/stackgl/headless-gl.svg?branch=master)](https://travis-ci.org/stackgl/headless-gl)
[![Appveyor Status](https://ci.appveyor.com/api/projects/status/github/stackgl/headless-gl)](https://ci.appveyor.com/project/mikolalysenko/headless-gl)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

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
Installing headless-gl on a supported platform is a snap using one of the prebuilt binaries.  Just type,

```
npm install gl
```

And you are good to go!  If your system is not supported, then please see the [development](#system-dependencies) section on how to configure your build environment.

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

## Development
Because `gl` uses native code, it is a bit more involved to set up than a typical JavaScript npm module.  Before you can use it, you will need to ensure that your system has the correct dependencies installed.  To get started, first make sure you have your system dependencies set up (see below), then do the following:

1. Clone this repo: `git clone git@github.com:stackgl/headless-gl.git`
1. Switch to the headless gl directory: `cd headless-gl`
1. Initialize the angle submodule: `git submodule init`
1. Update the angle submodule: `git submodule update`
1. Install npm dependencies: `npm install`
1. Run node-gyp to generate build scripts: `npm run build`

Once this is done, you should be good to go!  A few more things

* To run the test cases, use the command `npm test`, or execute specific by just running it using node.
* On a Unix-like platform, you can do incremental rebuilds by going into the `build/` directory and running `make`.  This is **way faster** running `npm build` each time you make a change.

Windows support is still pretty flaky.

### System dependencies
For general information on building native modules, see the [`node-gyp`](https://github.com/nodejs/node-gyp) documentation. System specific build instructions are as follows:

#### Mac OS X

* [Python 2.7](https://www.python.org/)
* [XCode](https://developer.apple.com/xcode/)

#### Ubuntu/Debian

* [Python 2.7](https://www.python.org/)
* A GNU C++ environment (available via the `build-essential` package on `apt`)
* [libxi-dev](http://www.x.org/wiki/)
* Working and up to date OpenGL drivers
* [GLEW](http://glew.sourceforge.net/)

```
$ sudo apt-get install -y build-essential libxi-dev libglu1-mesa-dev libglew-dev
```

#### Windows

* [Python 2.7](https://www.python.org/)
* [Microsoft Visual Studio](https://www.microsoft.com/en-us/download/details.aspx?id=5555)
* d3dcompiler_47.dll should be in c:\windows\system32, but if isn't then you can find another copy in the deps/ folder
* (optional) A modern nodejs supporting es6 to run some examples https://iojs.org/en/es6.html

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

### How can `headless-gl` be used on a headless Linux machine?

A minimal server install of Linux, such as the one one would want to use on Amazon AWS or equivalent will likely not provide an X11 nor an OpenGL environment. To setup such an environment you can use those two packages:

1. [Xvfb](https://en.wikipedia.org/wiki/Xvfb) is a lightweight X11 server which provides a back buffer for displaying X11 application offscreen and reading back the pixels which were drawn offscreen. It is typically used in Continuous Integration systems. It can be installed on CentOS with `yum install -y Xvfb`, and comes preinstalled on Ubuntu.
2. [Mesa](http://www.mesa3d.org/intro.html) is the reference open source software implementation of OpenGL. It can be installed on CentOS with `yum install -y mesa-dri-drivers`, or `apt-get install libgl1-mesa-dev`. Since a cloud Linux instance will typically run on a machine that does not have a GPU, a software implementation of OpenGL will be required.

Interacting with `Xvfb` requires to start it on the background and to execute your `node` program with the DISPLAY environment variable set to whatever was configured when running Xvfb (the default being :99). If you want to do that reliably you'll have to start Xvfb from an init.d script at boot time, which is extra configuration burden. Fortunately there is a wrapper script shipped with Xvfb known as `xvfb-run` which can start Xvfb on the fly, execute your node program and finally shut Xvfb down. Here's how to run it:

    xvfb-run -s "-ac -screen 0 1280x1024x24” <node program>

## License

See LICENSES
