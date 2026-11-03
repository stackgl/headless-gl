# gl

[![ci](https://github.com/stackgl/headless-gl/actions/workflows/ci.yml/badge.svg)](https://github.com/stackgl/headless-gl/actions/workflows/ci.yml)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

`gl` lets you create a WebGL context in [Node.js](https://nodejs.org/en/) without making a window or loading a full browser environment.

It aspires to fully conform to the [WebGL 1.0.3 specification](https://www.khronos.org/registry/webgl/specs/1.0.3/).

## Example

```javascript
// Create context
const createGL = require('gl')

const width = 64
const height = 64

const gl = createGL(width, height, { preserveDrawingBuffer: true })

//Clear screen to red
gl.clearColor(1, 0, 0, 1)
gl.clear(gl.COLOR_BUFFER_BIT)

//Write output as a PPM formatted image
const pixels = new Uint8Array(width * height * 4)
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
process.stdout.write(['P3\n# gl.ppm\n', width, " ", height, '\n255\n'].join(''))

for(let i = 0; i < pixels.length; i += 4) {
  for(let j = 0; j < 3; ++j) {
    process.stdout.write(pixels[i + j] + ' ')
  }
}
```

## Install
Installing `headless-gl` on a supported platform is a snap using one of the prebuilt binaries. Using [npm](https://www.npmjs.com/), run the command

```
npm install gl
```

And you are good to go!

npm 12 and later don't run the install scripts of dependencies you haven't approved, and `gl` uses its install script to download a prebuilt binary or build one from source. If `require('gl')` fails with "Could not locate the bindings file", approve the script and rebuild:

```
npm install-scripts approve gl
npm rebuild gl
```

Prebuilt binaries are generally available for LTS node versions (e.g. 22, 24, 26) until they reach EOL. If your system is not supported, then please see the [development](#system-dependencies) section on how to configure your build environment. Patches to improve support are always welcome!

When `gl` builds from source, it downloads the ANGLE libraries for your platform from this repository's [GitHub releases](https://github.com/stackgl/headless-gl/releases), since the npm package doesn't include them. To build without access to GitHub, set `HEADLESS_GL_ANGLE_MIRROR` to a URL or a local folder with the same `.gz` files.

## Supported platforms and Node.js versions

gl runs on Linux (including Alpine), macOS, and Windows.

Node.js versions 22 and up are tested and supported. Earlier versions may still function, however.

## API

`headless-gl` exports one function which you can use to create a WebGL context with the given context attributes:

```javascript
const createGL = require('gl')

const gl = createGL(width, height)
```

* `width` is the width of the drawing buffer
* `height` is the height of the drawing buffer
* `contextAttributes` is an optional object whose properties are the [context attributes for the WebGLRendering context](https://www.khronos.org/registry/webgl/specs/latest/1.0/#5.2). Only `alpha`, `depth`, `stencil`, `premultipliedAlpha` and `preserveDrawingBuffer` have an effect, and `antialias` is always off.

**Returns** A new `WebGLRenderingContext` object, or a `WebGL2RenderingContext` when `createWebGL2Context` is `true`.

**Throws** an `Error` with the code `HEADLESS_GL_CONTEXT_CREATION_FAILED` if the context can't be created, for example when a library that ANGLE needs isn't installed. The error message gives the reason, such as the name of the missing library. Throws a `RangeError` if `width` or `height` is less than 1.

The function also has `WebGLRenderingContext` and `WebGL2RenderingContext` properties, the classes of the contexts it creates, which you can also import by name. Use them with `instanceof` to check a context's version:

```javascript
const { WebGL2RenderingContext } = require('gl')
// or: import createGL, { WebGL2RenderingContext } from 'gl'

gl instanceof WebGL2RenderingContext
```

They can't be constructed directly.

### TypeScript

headless-gl includes TypeScript types for its contexts, so projects don't need TypeScript's DOM types. They follow the DOM's WebGL types, except that the contexts have no `canvas` or color space members, and texture uploads take an object with pixel data, like `ImageData`, or with a 2D context, like a node-canvas `Canvas`, instead of DOM elements.

To pass a context to code that expects the DOM's `WebGLRenderingContext`, such as three.js, cast it with `gl as WebGLRenderingContext`. To type every context as the DOM's, add this to your project:

```ts
declare module 'gl' {
  interface CustomContextTypes {
    WebGLRenderingContext: globalThis.WebGLRenderingContext
    WebGL2RenderingContext: globalThis.WebGL2RenderingContext
  }
}
```

Both need the DOM types in your project.

### Extensions

In addition to all the usual WebGL methods, `headless-gl` exposes some custom extensions to make it easier to manage WebGL context resources in a server side environment:

#### `STACKGL_resize_drawingbuffer`

This extension provides a mechanism to resize the drawing buffer of a WebGL context once it is created.

In a pure DOM implementation, this method would implemented by resizing the WebGLContext's canvas element by modifying its `width/height` properties. This canvas manipulation is not possible in headless-gl, since a headless context doesn't have a DOM or a canvas element associated to it.

#### Example

```javascript
const assert = require('assert')
const gl = require('gl')(10, 10)
assert(gl.drawingBufferHeight === 10 && gl.drawingBufferWidth === 10)

const ext = gl.getExtension('STACKGL_resize_drawingbuffer')
ext.resize(20, 5)
assert(gl.drawingBufferHeight === 20 && gl.drawingBufferWidth === 5)
```

#### IDL
```
[NoInterfaceObject]
interface STACKGL_resize_drawingbuffer {
    void resize(GLint width, GLint height);
};
```

#### `ext.resize(width, height)`
Resizes the drawing buffer of a WebGL rendering context

* `width` is the new width of the drawing buffer for the context
* `height` is the new height of the drawing buffer for the context

### `STACKGL_destroy_context`

Destroys the WebGL context immediately, reclaiming all resources associated with it.

For long running jobs, garbage collection of contexts is often not fast enough. To prevent the system from becoming overloaded with unused contexts, you can force the system to reclaim a WebGL context immediately by calling `.destroy()`.

#### Example

```javascript
const gl = require('gl')(10, 10)

const ext = gl.getExtension('STACKGL_destroy_context')
ext.destroy()
```

#### IDL

```
[NoInterfaceObject]
interface STACKGL_destroy_context {
    void destroy();
};
```

#### `gl.getExtension('STACKGL_destroy_context').destroy()`
Immediately destroys the context and all associated resources.

### Expiremental WebGL2 support

To create a WebGL 2 context, set the `createWebGL2Context` property to `true` in the `contextAttributes` argument.

## System dependencies

In most cases installing `headless-gl` from npm should just work. However, if you run into problems you might need to adjust your system configuration and make sure all your dependencies are up to date. For general information on building native modules, see the [`node-gyp`](https://github.com/nodejs/node-gyp) documentation.

#### Mac OS X

* [Python 3](https://www.python.org/)
* [XCode](https://developer.apple.com/xcode/)

#### Ubuntu/Debian

Prebuilt binaries for glibc 2.34 and later (x64 and arm64), such as Debian 12, Ubuntu 22.04, RHEL 9 and Amazon Linux 2023, need these libraries at runtime:

```
$ sudo apt-get install -y libx11-6 libxext6 libxcb1
```

On RHEL, Fedora and Amazon Linux, install `libX11 libXext libxcb` with `dnf`. If one is missing, `createGL` throws an error naming the library it couldn't load.

To build from source, also install `build-essential` and `python3`. For headless use, see [below](#how-can-headless-gl-be-used-on-a-headless-linux-machine).

#### Alpine Linux

Prebuilt binaries for Alpine 3.22 and later (x64 and arm64) need these libraries at runtime:

```
$ apk add libx11 libxext libxcb libdrm zlib
```

To build from source, also install `build-base` and `python3`. For headless use (see [below](#how-can-headless-gl-be-used-on-a-headless-linux-machine)), install Xvfb and Mesa with `apk add xvfb-run mesa-gl mesa-dri-gallium`.

#### Windows

* [Python 3](https://www.python.org/)
* [Microsoft Visual Studio](https://www.microsoft.com/en-us/download/details.aspx?id=5555)
* d3dcompiler_47.dll should be in c:\windows\system32, but if isn't then you can find another copy in the deps/ folder

## FAQ

### How can I use headless-gl with a continuous integration service?

`headless-gl` should work out of the box on most CI systems. Some notes on specific CI systems:

* GitHub Actions: refer to the workflow files, specifially the `ci` workflow for an example.
* [CircleCI](https://circleci.com/): `headless-gl` should just work in the default node environment.
* [AppVeyor](http://www.appveyor.com/): Again it should just work
* [TravisCI](https://travis-ci.org/): Works out of the box on the OS X image. For Linux VMs, you need to install mesa and xvfb. To do this, create a file in the root of your repo called `.travis.yml` and paste the following into it:

```
language: node_js
os: linux
sudo: required
dist: trusty
addons:
  apt:
    packages:
    - mesa-utils
    - xvfb
    - libgl1-mesa-dri
    - libglapi-mesa
    - libosmesa6
node_js:
  - '20'
before_script:
  - export DISPLAY=:99.0; sh -e /etc/init.d/xvfb start
```

### How can `headless-gl` be used on a headless Linux machine?

If you are running your own minimal Linux server, such as the one one would want to use on Amazon AWS or equivalent, it will likely not provide an X11 nor an OpenGL environment. To setup such an environment you can use those two packages:

1. [Xvfb](https://en.wikipedia.org/wiki/Xvfb) is a lightweight X11 server which provides a back buffer for displaying X11 application offscreen and reading back the pixels which were drawn offscreen. It is typically used in Continuous Integration systems. It can be installed on CentOS with `yum install -y Xvfb`, and comes preinstalled on Ubuntu.
2. [Mesa](https://docs.mesa3d.org) is the reference open source software implementation of OpenGL. It can be installed on CentOS with `yum install -y mesa-dri-drivers`, or `apt-get install libgl1-mesa-dev`. Since a cloud Linux instance will typically run on a machine that does not have a GPU, a software implementation of OpenGL will be required.

Interacting with `Xvfb` requires you to start it on the background and to execute your `node` program with the DISPLAY environment variable set to whatever was configured when running Xvfb (the default being :99). If you want to do that reliably you'll have to start Xvfb from an init.d script at boot time, which is extra configuration burden. Fortunately there is a wrapper script shipped with Xvfb known as `xvfb-run` which can start Xvfb on the fly, execute your Node.js program and finally shut Xvfb down. Here's how to run it:

    xvfb-run -s "-ac -screen 0 1280x1024x24" <node program>

### Does headless-gl work in a browser?

Yes, with [browserify](http://browserify.org/). The `STACKGL_destroy_context` and `STACKGL_resize_drawingbuffer` extensions are emulated as well.

In a browser, `createGL` creates a canvas and calls its `getContext`, and throws the same errors as in Node. The reason in the error message comes from the browser, which often gives little or no detail.

### How are `<image>` and `<video>` elements implemented?

They aren't. Texture uploads take a typed array, an object with pixel data like `ImageData`, or an object with a 2D context like a node-canvas `Canvas`. The RGBA pixels of the last two are converted to the upload's format and type, as browsers convert images. To help reading and saving images, you should check out the following modules:

* [`get-pixels`](https://www.npmjs.com/package/get-pixels)
* [`save-pixels`](https://www.npmjs.com/package/save-pixels)

### What extensions are supported?

Supported extensions by WebGL version. "Built in" means WebGL2 has the feature itself, so `getExtension` returns `null` for that extension on a WebGL2 context.

| Extension | WebGL1 | WebGL2 |
| --- | --- | --- |
| [`STACKGL_destroy_context`](https://github.com/stackgl/headless-gl#stackgl_destroy_context) | Yes | Yes |
| [`STACKGL_resize_drawingbuffer`](https://github.com/stackgl/headless-gl#stackgl_resize_drawingbuffer) | Yes | Yes |
| [`EXT_color_buffer_half_float`](https://www.khronos.org/registry/webgl/extensions/EXT_color_buffer_half_float/) | Yes | Yes |
| [`EXT_depth_clamp`](https://www.khronos.org/registry/webgl/extensions/EXT_depth_clamp/) | Yes | Yes |
| [`EXT_float_blend`](https://www.khronos.org/registry/webgl/extensions/EXT_float_blend/) | Yes | Yes |
| [`EXT_texture_compression_rgtc`](https://www.khronos.org/registry/webgl/extensions/EXT_texture_compression_rgtc/) | Yes | Yes |
| [`EXT_texture_filter_anisotropic`](https://www.khronos.org/registry/webgl/extensions/EXT_texture_filter_anisotropic/) | Yes | Yes |
| [`EXT_texture_mirror_clamp_to_edge`](https://www.khronos.org/registry/webgl/extensions/EXT_texture_mirror_clamp_to_edge/) | Yes | Yes |
| [`OES_texture_float_linear`](https://www.khronos.org/registry/webgl/extensions/OES_texture_float_linear/) | Yes | Yes |
| [`WEBGL_compressed_texture_s3tc`](https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/) | Yes | Yes |
| [`WEBGL_compressed_texture_s3tc_srgb`](https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc_srgb/) | Yes | Yes |
| [`WEBGL_debug_renderer_info`](https://www.khronos.org/registry/webgl/extensions/WEBGL_debug_renderer_info/) | Yes | Yes |
| [`EXT_color_buffer_float`](https://www.khronos.org/registry/webgl/extensions/EXT_color_buffer_float/) | No | Yes |
| [`WEBGL_color_buffer_float`](https://www.khronos.org/registry/webgl/extensions/WEBGL_color_buffer_float/) | Yes | Use `EXT_color_buffer_float` |
| [`ANGLE_instanced_arrays`](https://www.khronos.org/registry/webgl/extensions/ANGLE_instanced_arrays/) | Yes | Built in |
| [`EXT_blend_minmax`](https://www.khronos.org/registry/webgl/extensions/EXT_blend_minmax/) | Yes | Built in |
| [`EXT_frag_depth`](https://www.khronos.org/registry/webgl/extensions/EXT_frag_depth/) | Yes | Built in |
| [`EXT_sRGB`](https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/) | Yes | Built in |
| [`EXT_shader_texture_lod`](https://www.khronos.org/registry/webgl/extensions/EXT_shader_texture_lod/) | Yes | Built in |
| [`OES_element_index_uint`](https://www.khronos.org/registry/webgl/extensions/OES_element_index_uint/) | Yes | Built in |
| [`OES_fbo_render_mipmap`](https://www.khronos.org/registry/webgl/extensions/OES_fbo_render_mipmap/) | Yes | Built in |
| [`OES_standard_derivatives`](https://www.khronos.org/registry/webgl/extensions/OES_standard_derivatives/) | Yes | Built in |
| [`OES_texture_float`](https://www.khronos.org/registry/webgl/extensions/OES_texture_float/) | Yes | Built in |
| [`OES_texture_half_float`](https://www.khronos.org/registry/webgl/extensions/OES_texture_half_float/) | Yes | Built in |
| [`OES_texture_half_float_linear`](https://www.khronos.org/registry/webgl/extensions/OES_texture_half_float_linear/) | Yes | Built in |
| [`OES_vertex_array_object`](https://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/) | Yes | Built in |
| [`WEBGL_depth_texture`](https://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/) | Yes | Built in |
| [`WEBGL_draw_buffers`](https://www.khronos.org/registry/webgl/extensions/WEBGL_draw_buffers/) | Yes | Built in |

Float textures are built into WebGL2, but rendering to them still needs `EXT_color_buffer_float`, or `EXT_color_buffer_half_float` for 16-bit float textures.

### Why use this thing instead of `node-webgl`?

Despite the name, [node-webgl](https://github.com/mikeseven/node-webgl) doesn't actually implement WebGL - rather it gives you "WebGL"-flavored bindings to whatever OpenGL driver is configured on your system. If you are starting from an existing WebGL application or library, this means you'll have to do a bunch of work rewriting your WebGL code and shaders to deal with all the idiosyncrasies and bugs present on whatever platforms you try to run on. The upside though is that `node-webgl` exposes a lot of non-WebGL stuff that might be useful for games like window creation, mouse and keyboard input, requestAnimationFrame emulation, and some native OpenGL features.

`headless-gl` on the other hand just implements WebGL. It is built on top of [ANGLE](https://bugs.chromium.org/p/angleproject/issues/list) and passes the full Khronos ARB conformance suite, which means it works exactly the same on all supported systems. This makes it a great choice for running on a server or in a command line tool. You can use it to run tests, generate images or perform GPGPU computations using shaders.

### Why use this thing instead of [electron](http://electron.atom.io/)?

Electron is fantastic if you are writing a desktop application or if you need a full DOM implementation. On the other hand, because it is a larger dependency electron is more difficult to set up and configure in a server-side/CI environment. `headless-gl` is more modular in the sense that it just implements WebGL and nothing else. As a result creating a `headless-gl` context takes just a few milliseconds on most systems, while spawning a full electron instance can take upwards of 15-30 seconds. If you are using WebGL in a command line interface or need to execute WebGL in a service, `headless-gl` might be a more efficient and simpler choice.

### How should I set up a development environment for headless-gl?

After you have your [system dependencies installed](#system-dependencies), do the following:

1. Clone this repo: `git clone git@github.com:stackgl/headless-gl.git`
1. Switch to the headless gl directory: `cd headless-gl`
1. Install npm dependencies: `npm install`
1. Run node-gyp to generate build scripts: `npm run rebuild`

Once this is done, you should be good to go! A few more things

* To run the test cases, use the command `npm test`, or execute specific tests by just running them using `node`.
* On a Unix-like platform, you can do incremental rebuilds by going into the `build/` directory and running `make`. This is **way faster** running `npm build` each time you make a change.
* `webgl.d.ts` holds WebGL declarations copied from TypeScript's DOM types. After updating the `typescript` dev dependency, run `node scripts/webgl-types.js` to copy them again.
* When you replace the ANGLE libraries in `deps/`, run `node scripts/angle-assets.js <release tag> <folder>` with a new release tag, and commit the updated `src/angle.json` with the libraries. When the change reaches master, the ANGLE release workflow creates that release for source builds to download from.

Note: the `gl-conformance` package is currently hosted on GitHub Package Registry. To install from there, you may need to add `//npm.pkg.github.com` to your user directory's `.npmrc` file

### Debugging with RenderDoc

To debug with RenderDoc, you can set the `RENDERDOC_ENABLED` define in the `src/native/webgl.cc` file.

You'll need to also install RenderDoc and attach it to the gl process when you launch your program. The easiest way to attach to the running process is to uncomment the MessageBoxA call in the `src/native/webgl.cc` file.

## License

See LICENSES
