#include <cstring>
#include <vector>
#include <iostream>

#include "webgl.h"

bool                   WebGLRenderingContext::HAS_DISPLAY = false;
EGLDisplay             WebGLRenderingContext::DISPLAY;
WebGLRenderingContext* WebGLRenderingContext::ACTIVE = NULL;
WebGLRenderingContext* WebGLRenderingContext::CONTEXT_LIST_HEAD = NULL;

#define BP if(inst->debug_mode==true) { \
  std::cout << "At " __FILE__ ":" << __FUNCTION__ << ":" << __LINE__ << std::endl; \
} \

#define GL_METHOD(method_name) NAN_METHOD(WebGLRenderingContext:: method_name)

#define GL_BOILERPLATE  \
  Nan::HandleScope();\
  if (info.This()->InternalFieldCount() <= 0) { \
    return Nan::ThrowError("Invalid WebGL Object"); \
  } \
  WebGLRenderingContext* inst = \
    node::ObjectWrap::Unwrap<WebGLRenderingContext>(info.This()); \
  if (!(inst && inst->setActive())) { \
    return Nan::ThrowError("Invalid GL context"); \
  }

WebGLRenderingContext::WebGLRenderingContext(
    int width
  , int height
  , bool alpha
  , bool depth
  , bool stencil
  , bool antialias
  , bool premultipliedAlpha
  , bool preserveDrawingBuffer
  , bool preferLowPowerToHighPerformance
  , bool failIfMajorPerformanceCaveat) :
      state(GLCONTEXT_STATE_INIT)
    , unpack_flip_y(false)
    , unpack_premultiply_alpha(false)
    , unpack_colorspace_conversion(0x9244)
    , unpack_alignment(4)
    , next(NULL)
    , prev(NULL)
    , lastError(GL_NO_ERROR) {

  //Get display
  if (!HAS_DISPLAY) {
    DISPLAY = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    if (DISPLAY == EGL_NO_DISPLAY) {
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    //Initialize EGL
    if (!eglInitialize(DISPLAY, NULL, NULL)) {
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    //Save display
    HAS_DISPLAY = true;
  }

  //Set up configuration
  EGLint attrib_list[] = {
      EGL_SURFACE_TYPE, EGL_PBUFFER_BIT
    , EGL_RED_SIZE,     8
    , EGL_GREEN_SIZE,   8
    , EGL_BLUE_SIZE,    8
    , EGL_ALPHA_SIZE,   8
    , EGL_DEPTH_SIZE,   24
    , EGL_STENCIL_SIZE, 8
    , EGL_NONE
  };
  EGLint num_config;
  if (!eglChooseConfig(
      DISPLAY,
      attrib_list,
      &config,
      1,
      &num_config) ||
      num_config != 1) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  //Create context
  EGLint contextAttribs[] = {
    EGL_CONTEXT_CLIENT_VERSION, 3,
    EGL_NONE
  };
  context = eglCreateContext(DISPLAY, config, EGL_NO_CONTEXT, contextAttribs);
  if (context == EGL_NO_CONTEXT) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  EGLint surfaceAttribs[] = {
        EGL_WIDTH,  (EGLint)width
      , EGL_HEIGHT, (EGLint)height
      , EGL_NONE
  };
  surface = eglCreatePbufferSurface(DISPLAY, config, surfaceAttribs);
  if (surface == EGL_NO_SURFACE) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  //Set active
  if (!eglMakeCurrent(DISPLAY, surface, surface, context)) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  //Success
  state = GLCONTEXT_STATE_OK;
  registerContext();
  ACTIVE = this;

  //Initialize function pointers
  initPointers();
}

bool WebGLRenderingContext::setActive() {
  if (state != GLCONTEXT_STATE_OK) {
    return false;
  }
  if (this == ACTIVE) {
    return true;
  }
  if (!eglMakeCurrent(DISPLAY, surface, surface, context)) {
    state = GLCONTEXT_STATE_ERROR;
    return false;
  }
  ACTIVE = this;
  return true;
}

void WebGLRenderingContext::setError(GLenum error) {
  if (error == GL_NO_ERROR || lastError != GL_NO_ERROR) {
    return;
  }
  GLenum prevError = (this->glGetError)();
  if (prevError == GL_NO_ERROR) {
    lastError = error;
  }
}

void WebGLRenderingContext::dispose() {
  //Unregister context
  unregisterContext();

  if (!setActive()) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  //Update state
  state = GLCONTEXT_STATE_DESTROY;

  //Store this pointer
  WebGLRenderingContext* inst = this;

  //Destroy all object references
  for (
    std::map< std::pair<GLuint, GLObjectType>, bool >::iterator
     iter = objects.begin();
     iter != objects.end();
     ++iter) {

    GLuint obj = iter->first.first;

    switch(iter->first.second) {
      case GLOBJECT_TYPE_PROGRAM:
        (inst->glDeleteProgram)(obj);
        break;
      case GLOBJECT_TYPE_BUFFER:
        (inst->glDeleteBuffers)(1,&obj);
        break;
      case GLOBJECT_TYPE_FRAMEBUFFER:
        (inst->glDeleteFramebuffers)(1,&obj);
        break;
      case GLOBJECT_TYPE_RENDERBUFFER:
        (inst->glDeleteRenderbuffers)(1,&obj);
        break;
      case GLOBJECT_TYPE_SHADER:
        (inst->glDeleteShader)(obj);
        break;
      case GLOBJECT_TYPE_TEXTURE:
        (inst->glDeleteTextures)(1,&obj);
        break;
      default:
        break;
    }
  }

  //Deactivate context
  eglMakeCurrent(DISPLAY, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
  ACTIVE = NULL;

  //Destroy surface and context

  //FIXME:  This shouldn't be commented out
  //eglDestroySurface(DISPLAY, surface);
  eglDestroyContext(DISPLAY, context);
}

WebGLRenderingContext::~WebGLRenderingContext() {
  dispose();
}

GL_METHOD(SetDebugMode) {
	GL_BOILERPLATE;
	BP
    inst->debug_mode = info[0]->BooleanValue();
}

GL_METHOD(SetError) {
  GL_BOILERPLATE;
  BP
}

GL_METHOD(DisposeAll) {
  Nan::HandleScope();

  while(CONTEXT_LIST_HEAD) {
    CONTEXT_LIST_HEAD->dispose();
  }

  if(WebGLRenderingContext::HAS_DISPLAY) {
    eglTerminate(WebGLRenderingContext::DISPLAY);
    WebGLRenderingContext::HAS_DISPLAY = false;
  }
}

GL_METHOD(New) {
  Nan::HandleScope();

  WebGLRenderingContext* instance = new WebGLRenderingContext(
      info[0]->Int32Value()   //Width
    , info[1]->Int32Value()   //Height
    , info[2]->BooleanValue() //Alpha
    , info[3]->BooleanValue() //Depth
    , info[4]->BooleanValue() //Stencil
    , info[5]->BooleanValue() //antialias
    , info[6]->BooleanValue() //premultipliedAlpha
    , info[7]->BooleanValue() //preserve drawing buffer
    , info[8]->BooleanValue() //low power
    , info[9]->BooleanValue() //fail if crap
  );

  if(instance->state != GLCONTEXT_STATE_OK){
    return Nan::ThrowError("Error creating WebGLContext");
  }

  instance->Wrap(info.This());

  info.GetReturnValue().Set(info.This());
}

GL_METHOD(Destroy) {
  GL_BOILERPLATE
  BP

  inst->dispose();
}

GL_METHOD(Uniform1f) {
  GL_BOILERPLATE;
  BP

  int location = info[0]->Int32Value();
  float x = (float) info[1]->NumberValue();

  (inst->glUniform1f)(location, x);
}

GL_METHOD(Uniform2f) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat y = static_cast<GLfloat>(info[2]->NumberValue());

  (inst->glUniform2f)(location, x, y);
}

GL_METHOD(Uniform3f) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat y = static_cast<GLfloat>(info[2]->NumberValue());
  GLfloat z = static_cast<GLfloat>(info[3]->NumberValue());

  (inst->glUniform3f)(location, x, y, z);
}

GL_METHOD(Uniform4f) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat y = static_cast<GLfloat>(info[2]->NumberValue());
  GLfloat z = static_cast<GLfloat>(info[3]->NumberValue());
  GLfloat w = static_cast<GLfloat>(info[4]->NumberValue());

  (inst->glUniform4f)(location, x, y, z, w);
}

GL_METHOD(Uniform1i) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLint x = info[1]->Int32Value();

  (inst->glUniform1i)(location, x);
}

GL_METHOD(Uniform2i) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLint x = info[1]->Int32Value();
  GLint y = info[2]->Int32Value();

  (inst->glUniform2i)(location, x, y);
}

GL_METHOD(Uniform3i) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLint x = info[1]->Int32Value();
  GLint y = info[2]->Int32Value();
  GLint z = info[3]->Int32Value();

  (inst->glUniform3i)(location, x, y, z);
}

GL_METHOD(Uniform4i) {
  GL_BOILERPLATE;
  BP

  GLint location = info[0]->Int32Value();
  GLint x = info[1]->Int32Value();
  GLint y = info[2]->Int32Value();
  GLint z = info[3]->Int32Value();
  GLint w = info[4]->Int32Value();

  (inst->glUniform4i)(location, x, y, z, w);
}


GL_METHOD(PixelStorei) {
  GL_BOILERPLATE;
  BP

  GLenum pname = info[0]->Int32Value();
  GLenum param = info[1]->Int32Value();

  //Handle WebGL specific extensions
  switch(pname) {
    case 0x9240:
      inst->unpack_flip_y = param != 0;
    break;

    case 0x9241:
      inst->unpack_premultiply_alpha = param != 0;
    break;

    case 0x9243:
      inst->unpack_colorspace_conversion = param;
    break;

    case GL_UNPACK_ALIGNMENT:
      inst->unpack_alignment = param;
      (inst->glPixelStorei)(pname, param);
    break;

    default:
      (inst->glPixelStorei)(pname, param);
    break;
  }
}

GL_METHOD(BindAttribLocation) {
  GL_BOILERPLATE;
  BP

  GLint program = info[0]->Int32Value();
  GLint index   = info[1]->Int32Value();
  Nan::Utf8String name(info[2]);

  (inst->glBindAttribLocation)(program, index, *name);
}

GLenum WebGLRenderingContext::getError() {
  GLenum error = (this->glGetError)();
  if (lastError != GL_NO_ERROR) {
    error = lastError;
  }
  lastError = GL_NO_ERROR;
  return error;
}

GL_METHOD(GetError) {
  GL_BOILERPLATE;
  BP
  info.GetReturnValue().Set(Nan::New<v8::Integer>(inst->getError()));
}

GL_METHOD(VertexAttribDivisor) {
  GL_BOILERPLATE;
  BP

  GLuint index   = info[0]->Uint32Value();
  GLuint divisor = info[1]->Uint32Value();

  (inst->glVertexAttribDivisor)(index, divisor);
}

GL_METHOD(DrawArraysInstanced) {
  GL_BOILERPLATE;
  BP

  GLenum  mode   = info[0]->Int32Value();
  GLint   first  = info[1]->Int32Value();
  GLuint  count  = info[2]->Uint32Value();
  GLuint  icount = info[3]->Uint32Value();

  (inst->glDrawArraysInstanced)(mode, first, count, icount);
}

GL_METHOD(DrawElementsInstanced) {
  GL_BOILERPLATE;
  BP

  GLenum mode   = info[0]->Int32Value();
  GLint  count  = info[1]->Int32Value();
  GLenum type   = info[2]->Int32Value();
  GLint  offset = info[3]->Int32Value();
  GLuint icount = info[4]->Uint32Value();

  (inst->glDrawElementsInstanced)(
    mode,
    count,
    type,
    reinterpret_cast<GLvoid*>(offset),
    icount);
}

GL_METHOD(DrawArrays) {
  GL_BOILERPLATE;
  BP

  GLenum mode  = info[0]->Int32Value();
  GLint  first = info[1]->Int32Value();
  GLint  count = info[2]->Int32Value();

  (inst->glDrawArrays)(mode, first, count);
}

GL_METHOD(UniformMatrix2fv) {
  GL_BOILERPLATE;
  BP

  GLint location      = info[0]->Int32Value();
  GLboolean transpose = info[1]->BooleanValue();
  Nan::TypedArrayContents<GLfloat> data(info[2]);

  (inst->glUniformMatrix2fv)(location, data.length() / 4, transpose, *data);
}

GL_METHOD(UniformMatrix3fv) {
  GL_BOILERPLATE;
  BP

  GLint     location  = info[0]->Int32Value();
  GLboolean transpose = info[1]->BooleanValue();
  Nan::TypedArrayContents<GLfloat> data(info[2]);

  (inst->glUniformMatrix3fv)(location, data.length() / 9, transpose, *data);
}

GL_METHOD(UniformMatrix4fv) {
  GL_BOILERPLATE;
  BP

  GLint     location  = info[0]->Int32Value();
  GLboolean transpose = info[1]->BooleanValue();
  Nan::TypedArrayContents<GLfloat> data(info[2]);

  (inst->glUniformMatrix4fv)(location, data.length() / 16, transpose, *data);
}

GL_METHOD(GenerateMipmap) {
  GL_BOILERPLATE;
  BP

  GLint target = info[0]->Int32Value();
  (inst->glGenerateMipmap)(target);
}

GL_METHOD(GetAttribLocation) {
  GL_BOILERPLATE;
  BP

  GLint program = info[0]->Int32Value();
  Nan::Utf8String name(info[1]);

  GLint result = (inst->glGetAttribLocation)(program, *name);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(result));
}


GL_METHOD(DepthFunc) {
  GL_BOILERPLATE;
  BP

  (inst->glDepthFunc)(info[0]->Int32Value());
}


GL_METHOD(Viewport) {
  GL_BOILERPLATE;
  BP

  GLint   x       = info[0]->Int32Value();
  GLint   y       = info[1]->Int32Value();
  GLsizei width   = info[2]->Int32Value();
  GLsizei height  = info[3]->Int32Value();

  (inst->glViewport)(x, y, width, height);
}

GL_METHOD(CreateShader) {
  GL_BOILERPLATE;
  BP

  GLuint shader=(inst->glCreateShader)(info[0]->Int32Value());
  inst->registerGLObj(GLOBJECT_TYPE_SHADER, shader);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(shader));
}


GL_METHOD(ShaderSource) {
  GL_BOILERPLATE;
  BP

  GLint id = info[0]->Int32Value();
  Nan::Utf8String code(info[1]);

  const char* codes[] = { *code };
  GLint length = code.length();

  (inst->glShaderSource)(id, 1, codes, &length);
}


GL_METHOD(CompileShader) {
  GL_BOILERPLATE;
  BP

  (inst->glCompileShader)(info[0]->Int32Value());
}

GL_METHOD(FrontFace) {
  GL_BOILERPLATE;
  BP

  (inst->glFrontFace)(info[0]->Int32Value());
}


GL_METHOD(GetShaderParameter) {
  GL_BOILERPLATE;
  BP

  GLint shader = info[0]->Int32Value();
  GLenum pname = info[1]->Int32Value();

  GLint value;
  (inst->glGetShaderiv)(shader, pname, &value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
}

GL_METHOD(GetShaderInfoLog) {
  GL_BOILERPLATE;
  BP

  GLint id = info[0]->Int32Value();

  GLint infoLogLength;
  (inst->glGetShaderiv)(id, GL_INFO_LOG_LENGTH, &infoLogLength);

  char* error = new char[infoLogLength+1];
  (inst->glGetShaderInfoLog)(id, infoLogLength+1, &infoLogLength, error);

  info.GetReturnValue().Set(
    Nan::New<v8::String>(error).ToLocalChecked());

  delete[] error;
}


GL_METHOD(CreateProgram) {
  GL_BOILERPLATE;
  BP

  GLuint program=(inst->glCreateProgram)();
  inst->registerGLObj(GLOBJECT_TYPE_PROGRAM, program);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(program));
}


GL_METHOD(AttachShader) {
  GL_BOILERPLATE;
  BP

  GLint program = info[0]->Int32Value();
  GLint shader  = info[1]->Int32Value();

  (inst->glAttachShader)(program, shader);
}

GL_METHOD(ValidateProgram) {
  GL_BOILERPLATE;
  BP

  (inst->glValidateProgram)(info[0]->Int32Value());
}

GL_METHOD(LinkProgram) {
  GL_BOILERPLATE;
  BP

  (inst->glLinkProgram)(info[0]->Int32Value());
}


GL_METHOD(GetProgramParameter) {
  GL_BOILERPLATE;
  BP

  GLint program = info[0]->Int32Value();
  GLenum pname  = (GLenum)(info[1]->Int32Value());
  GLint value = 0;

  (inst->glGetProgramiv)(program, pname, &value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
}


GL_METHOD(GetUniformLocation) {
  GL_BOILERPLATE;
  BP

  GLint program = info[0]->Int32Value();
  Nan::Utf8String name(info[1]);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(
    (inst->glGetUniformLocation)(program, *name)));
}


GL_METHOD(ClearColor) {
  GL_BOILERPLATE;
  BP

  GLfloat red   = static_cast<GLfloat>(info[0]->NumberValue());
  GLfloat green = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat blue  = static_cast<GLfloat>(info[2]->NumberValue());
  GLfloat alpha = static_cast<GLfloat>(info[3]->NumberValue());

  (inst->glClearColor)(red, green, blue, alpha);
}


GL_METHOD(ClearDepth) {
  GL_BOILERPLATE;
  BP

  GLfloat depth = static_cast<GLfloat>(info[0]->NumberValue());

  (inst->glClearDepthf)(depth);
}

GL_METHOD(Disable) {
  GL_BOILERPLATE;
  BP

  (inst->glDisable)(info[0]->Int32Value());
}

GL_METHOD(Enable) {
  GL_BOILERPLATE;
  BP

  (inst->glEnable)(info[0]->Int32Value());
}


GL_METHOD(CreateTexture) {
  GL_BOILERPLATE;
  BP

  GLuint texture;
  (inst->glGenTextures)(1, &texture);
  inst->registerGLObj(GLOBJECT_TYPE_TEXTURE, texture);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(texture));
}


GL_METHOD(BindTexture) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLint texture = info[1]->Int32Value();

  (inst->glBindTexture)(target, texture);
}

unsigned char* WebGLRenderingContext::unpackPixels(
  GLenum type,
  GLenum format,
  GLint width,
  GLint height,
  unsigned char* pixels) {

  //Compute pixel size
  GLint pixelSize = 1;
  if(type == GL_UNSIGNED_BYTE || type == GL_FLOAT) {
    if(type == GL_FLOAT) {
      pixelSize = 4;
    }
    switch(format) {
      case GL_ALPHA:
      case GL_LUMINANCE:
      case GL_RED:
      break;
      case GL_RG:
      case GL_LUMINANCE_ALPHA:
        pixelSize *= 2;
      break;
      case GL_RGB:
        pixelSize *= 3;
      break;
      case GL_RGBA:
        pixelSize *= 4;
      break;
    }
  } else {
    pixelSize = 2;
  }

  //Compute row stride
  GLint rowStride = pixelSize * width;
  if((rowStride % unpack_alignment) != 0) {
    rowStride += unpack_alignment - (rowStride % unpack_alignment);
  }

  GLint imageSize = rowStride * height;
  unsigned char* unpacked = new unsigned char[imageSize];

  if(unpack_flip_y) {
    for(int i=0,j=height-1; j>=0; ++i, --j) {
      memcpy(
          reinterpret_cast<void*>(unpacked + j*rowStride)
        , reinterpret_cast<void*>(pixels   + i*rowStride)
        , width * pixelSize);
    }
  } else {
    memcpy(
        reinterpret_cast<void*>(unpacked)
      , reinterpret_cast<void*>(pixels)
      , imageSize);
  }

  //Premultiply alpha unpacking
  if(unpack_premultiply_alpha &&
     (format == GL_LUMINANCE_ALPHA ||
      format == GL_RGBA)) {

    for(int row=0; row<height; ++row) {
      for(int col=0; col<width; ++col) {
        unsigned char* pixel = unpacked + (row * rowStride) + (col * pixelSize);
        if(format == GL_LUMINANCE_ALPHA) {
          pixel[0] *= pixel[1] / 255.0;
        } else if(type == GL_UNSIGNED_BYTE) {
          float scale = pixel[3] / 255.0;
          pixel[0] *= scale;
          pixel[1] *= scale;
          pixel[2] *= scale;
        } else if(type == GL_UNSIGNED_SHORT_4_4_4_4) {
          int r = pixel[0]&0x0f;
          int g = pixel[0]>>4;
          int b = pixel[1]&0x0f;
          int a = pixel[1]>>4;

          float scale = a / 15.0;
          r *= scale;
          g *= scale;
          b *= scale;

          pixel[0] = r + (g<<4);
          pixel[1] = b + (a<<4);
        } else if(type == GL_UNSIGNED_SHORT_5_5_5_1) {
          if((pixel[0]&1) == 0) {
            pixel[0] = 1; //why does this get set to 1?!?!?!
            pixel[1] = 0;
          }
        }
      }
    }
  }

  return unpacked;
}

GL_METHOD(TexImage2D) {
  GL_BOILERPLATE;
  BP

  GLenum target         = info[0]->Int32Value();
  GLint level           = info[1]->Int32Value();
  GLenum internalformat = info[2]->Int32Value();
  GLsizei width         = info[3]->Int32Value();
  GLsizei height        = info[4]->Int32Value();
  GLint border          = info[5]->Int32Value();
  GLenum format         = info[6]->Int32Value();
  GLint type            = info[7]->Int32Value();
  Nan::TypedArrayContents<unsigned char> pixels(info[8]);

  if(*pixels) {
    if(inst->unpack_flip_y || inst->unpack_premultiply_alpha) {
      unsigned char* unpacked = inst->unpackPixels(
          type
        , format
        , width
        , height
        , *pixels);
      (inst->glTexImage2D)(
          target
        , level
        , internalformat
        , width
        , height
        , border
        , format
        , type
        , unpacked);
      delete[] unpacked;
    } else {
      (inst->glTexImage2D)(
          target
        , level
        , internalformat
        , width
        , height
        , border
        , format
        , type
        , *pixels);
    }
  } else {
    size_t length = width * height * 4;
    char* data = new char[length];
    memset(data, 0, length);
    (inst->glTexImage2D)(
        target
      , level
      , internalformat
      , width
      , height
      , border
      , format
      , type
      , data);
    delete[] data;
  }
}

GL_METHOD(TexSubImage2D) {
  GL_BOILERPLATE;
  BP

  GLenum target   = info[0]->Int32Value();
  GLint level     = info[1]->Int32Value();
  GLint xoffset   = info[2]->Int32Value();
  GLint yoffset   = info[3]->Int32Value();
  GLsizei width   = info[4]->Int32Value();
  GLsizei height  = info[5]->Int32Value();
  GLenum format   = info[6]->Int32Value();
  GLenum type     = info[7]->Int32Value();
  Nan::TypedArrayContents<unsigned char> pixels(info[8]);

  if(inst->unpack_flip_y ||
     inst->unpack_premultiply_alpha) {
    unsigned char* unpacked = inst->unpackPixels(
        type
      , format
      , width
      , height
      , *pixels);
    (inst->glTexSubImage2D)(
        target
      , level
      , xoffset
      , yoffset
      , width
      , height
      , format
      , type
      , unpacked);
    delete[] unpacked;
  } else {
    (inst->glTexSubImage2D)(
        target
      , level
      , xoffset
      , yoffset
      , width
      , height
      , format
      , type
      , *pixels);
  }
}



GL_METHOD(TexParameteri) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLenum pname  = info[1]->Int32Value();
  GLint param   = info[2]->Int32Value();

  (inst->glTexParameteri)(target, pname, param);
}

GL_METHOD(TexParameterf) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLenum pname  = info[1]->Int32Value();
  GLfloat param = static_cast<GLfloat>(info[2]->NumberValue());

  (inst->glTexParameterf)(target, pname, param);
}


GL_METHOD(Clear) {
  GL_BOILERPLATE;
  BP

  (inst->glClear)(info[0]->Int32Value());
}


GL_METHOD(UseProgram) {
  GL_BOILERPLATE;
  BP

  (inst->glUseProgram)(info[0]->Int32Value());
}

GL_METHOD(CreateBuffer) {
  GL_BOILERPLATE;
  BP

  GLuint buffer;
  (inst->glGenBuffers)(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_BUFFER, buffer);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(buffer));
}

GL_METHOD(BindBuffer) {
  GL_BOILERPLATE;
  BP

  GLenum target = (GLenum)info[0]->Int32Value();
  GLuint buffer = (GLuint)info[1]->Uint32Value();

  (inst->glBindBuffer)(target,buffer);
}


GL_METHOD(CreateFramebuffer) {
  GL_BOILERPLATE;
  BP

  GLuint buffer;
  (inst->glGenFramebuffers)(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(buffer));
}


GL_METHOD(BindFramebuffer) {
  GL_BOILERPLATE;
  BP

  GLint target = (GLint)info[0]->Int32Value();
  GLint buffer = (GLint)info[1]->Int32Value();

  (inst->glBindFramebuffer)(target, buffer);
}


GL_METHOD(FramebufferTexture2D) {
  GL_BOILERPLATE;
  BP

  GLenum target     = info[0]->Int32Value();
  GLenum attachment = info[1]->Int32Value();
  GLint textarget   = info[2]->Int32Value();
  GLint texture     = info[3]->Int32Value();
  GLint level       = info[4]->Int32Value();

  (inst->glFramebufferTexture2D)(target, attachment, textarget, texture, level);
}


GL_METHOD(BufferData) {
  GL_BOILERPLATE;
  BP

  GLint target = info[0]->Int32Value();
  GLenum usage = info[2]->Int32Value();

  if(info[1]->IsObject()) {
    Nan::TypedArrayContents<char> array(info[1]);
    (inst->glBufferData)(target, array.length(), static_cast<void*>(*array), usage);
  } else if(info[1]->IsNumber()) {
    (inst->glBufferData)(target, info[1]->Int32Value(), NULL, usage);
  }
}


GL_METHOD(BufferSubData) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLint offset  = info[1]->Int32Value();
  Nan::TypedArrayContents<char> array(info[2]);

  (inst->glBufferSubData)(target, offset, array.length(), *array);
}


GL_METHOD(BlendEquation) {
  GL_BOILERPLATE;
  BP

  GLenum mode = info[0]->Int32Value();;

  (inst->glBlendEquation)(mode);
}


GL_METHOD(BlendFunc) {
  GL_BOILERPLATE;
  BP

  GLenum sfactor = info[0]->Int32Value();
  GLenum dfactor = info[1]->Int32Value();

  (inst->glBlendFunc)(sfactor,dfactor);
}


GL_METHOD(EnableVertexAttribArray) {
  GL_BOILERPLATE;
  BP

  (inst->glEnableVertexAttribArray)(info[0]->Int32Value());
}

GL_METHOD(VertexAttribPointer) {
  GL_BOILERPLATE;
  BP

  GLint index          = info[0]->Int32Value();
  GLint size           = info[1]->Int32Value();
  GLenum type          = info[2]->Int32Value();
  GLboolean normalized = info[3]->BooleanValue();
  GLint stride         = info[4]->Int32Value();
  size_t offset        = info[5]->Uint32Value();

  (inst->glVertexAttribPointer)(
    index,
    size,
    type,
    normalized,
    stride,
    reinterpret_cast<GLvoid*>(offset));
}


GL_METHOD(ActiveTexture) {
  GL_BOILERPLATE;
  BP

  (inst->glActiveTexture)(info[0]->Int32Value());
}


GL_METHOD(DrawElements) {
  GL_BOILERPLATE;
  BP

  GLenum mode   = info[0]->Int32Value();
  GLint count   = info[1]->Int32Value();
  GLenum type   = info[2]->Int32Value();
  size_t offset = info[3]->Uint32Value();

  (inst->glDrawElements)(mode, count, type, reinterpret_cast<GLvoid*>(offset));
}


GL_METHOD(Flush) {
  GL_BOILERPLATE;
  BP

  (inst->glFlush)();
}

GL_METHOD(Finish) {
  GL_BOILERPLATE;
  BP

  (inst->glFinish)();
}

GL_METHOD(VertexAttrib1f) {
  GL_BOILERPLATE;
  BP

  GLuint index = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());

  (inst->glVertexAttrib1f)(index, x);
}

GL_METHOD(VertexAttrib2f) {
  GL_BOILERPLATE;
  BP

  GLuint index = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat y = static_cast<GLfloat>(info[2]->NumberValue());

  (inst->glVertexAttrib2f)(index, x, y);
}

GL_METHOD(VertexAttrib3f) {
  GL_BOILERPLATE;
  BP

  GLuint index = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat y = static_cast<GLfloat>(info[2]->NumberValue());
  GLfloat z = static_cast<GLfloat>(info[3]->NumberValue());

  (inst->glVertexAttrib3f)(index, x, y, z);
}

GL_METHOD(VertexAttrib4f) {
  GL_BOILERPLATE;
  BP

  GLuint index = info[0]->Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1]->NumberValue());
  GLfloat y = static_cast<GLfloat>(info[2]->NumberValue());
  GLfloat z = static_cast<GLfloat>(info[3]->NumberValue());
  GLfloat w = static_cast<GLfloat>(info[4]->NumberValue());

  (inst->glVertexAttrib4f)(index, x, y, z, w);
}

GL_METHOD(BlendColor) {
  GL_BOILERPLATE;
  BP

  GLclampf r = static_cast<GLclampf>(info[0]->NumberValue());
  GLclampf g = static_cast<GLclampf>(info[1]->NumberValue());
  GLclampf b = static_cast<GLclampf>(info[2]->NumberValue());
  GLclampf a = static_cast<GLclampf>(info[3]->NumberValue());

  (inst->glBlendColor)(r, g, b, a);
}

GL_METHOD(BlendEquationSeparate) {
  GL_BOILERPLATE;
  BP

  GLenum mode_rgb   = info[0]->Int32Value();
  GLenum mode_alpha = info[1]->Int32Value();

  (inst->glBlendEquationSeparate)(mode_rgb, mode_alpha);
}

GL_METHOD(BlendFuncSeparate) {
  GL_BOILERPLATE;
  BP

  GLenum src_rgb   = info[0]->Int32Value();
  GLenum dst_rgb   = info[1]->Int32Value();
  GLenum src_alpha = info[2]->Int32Value();
  GLenum dst_alpha = info[3]->Int32Value();

  (inst->glBlendFuncSeparate)(src_rgb, dst_rgb, src_alpha, dst_alpha);
}

GL_METHOD(ClearStencil) {
  GL_BOILERPLATE;
  BP

  GLint s = info[0]->Int32Value();

  (inst->glClearStencil)(s);
}

GL_METHOD(ColorMask) {
  GL_BOILERPLATE;
  BP

  GLboolean r = info[0]->BooleanValue();
  GLboolean g = info[1]->BooleanValue();
  GLboolean b = info[2]->BooleanValue();
  GLboolean a = info[3]->BooleanValue();

  (inst->glColorMask)(r, g, b, a);
}

GL_METHOD(CopyTexImage2D) {
  GL_BOILERPLATE;
  BP

  GLenum target         = info[0]->Int32Value();
  GLint level           = info[1]->Int32Value();
  GLenum internalformat = info[2]->Int32Value();
  GLint x               = info[3]->Int32Value();
  GLint y               = info[4]->Int32Value();
  GLsizei width         = info[5]->Int32Value();
  GLsizei height        = info[6]->Int32Value();
  GLint border          = info[7]->Int32Value();

  (inst->glCopyTexImage2D)(target, level, internalformat, x, y, width, height, border);
}

GL_METHOD(CopyTexSubImage2D) {
  GL_BOILERPLATE;
  BP

  GLenum target  = info[0]->Int32Value();
  GLint level    = info[1]->Int32Value();
  GLint xoffset  = info[2]->Int32Value();
  GLint yoffset  = info[3]->Int32Value();
  GLint x        = info[4]->Int32Value();
  GLint y        = info[5]->Int32Value();
  GLsizei width  = info[6]->Int32Value();
  GLsizei height = info[7]->Int32Value();

  (inst->glCopyTexSubImage2D)(target, level, xoffset, yoffset, x, y, width, height);
}

GL_METHOD(CullFace) {
  GL_BOILERPLATE;
  BP

  GLenum mode = info[0]->Int32Value();

  (inst->glCullFace)(mode);
}

GL_METHOD(DepthMask) {
  GL_BOILERPLATE;
  BP

  GLboolean flag = info[0]->BooleanValue();

  (inst->glDepthMask)(flag);
}

GL_METHOD(DepthRange) {
  GL_BOILERPLATE;
  BP

  GLclampf zNear  = static_cast<GLclampf>(info[0]->NumberValue());
  GLclampf zFar   = static_cast<GLclampf>(info[1]->NumberValue());

  (inst->glDepthRangef)(zNear, zFar);
}

GL_METHOD(DisableVertexAttribArray) {
  GL_BOILERPLATE;
  BP

  GLuint index = info[0]->Int32Value();

  (inst->glDisableVertexAttribArray)(index);
}

GL_METHOD(Hint) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLenum mode   = info[1]->Int32Value();

  (inst->glHint)(target, mode);
}

GL_METHOD(IsEnabled) {
  GL_BOILERPLATE;
  BP

  GLenum cap = info[0]->Int32Value();
  bool ret = (inst->glIsEnabled)(cap) != 0;

  info.GetReturnValue().Set(Nan::New<v8::Boolean>(ret));
}

GL_METHOD(LineWidth) {
  GL_BOILERPLATE;
  BP

  GLfloat width = (GLfloat)info[0]->NumberValue();

  (inst->glLineWidth)(width);
}

GL_METHOD(PolygonOffset) {
  GL_BOILERPLATE;
  BP

  GLfloat factor  = static_cast<GLfloat>(info[0]->NumberValue());
  GLfloat units   = static_cast<GLfloat>(info[1]->NumberValue());

  (inst->glPolygonOffset)(factor, units);
}

GL_METHOD(SampleCoverage) {
  GL_BOILERPLATE;
  BP

  GLclampf value   = static_cast<GLclampf>(info[0]->NumberValue());
  GLboolean invert = info[1]->BooleanValue();

  (inst->glSampleCoverage)(value, invert);
}

GL_METHOD(Scissor) {
  GL_BOILERPLATE;
  BP

  GLint x        = info[0]->Int32Value();
  GLint y        = info[1]->Int32Value();
  GLsizei width  = info[2]->Int32Value();
  GLsizei height = info[3]->Int32Value();

  (inst->glScissor)(x, y, width, height);
}

GL_METHOD(StencilFunc) {
  GL_BOILERPLATE;
  BP

  GLenum func = info[0]->Int32Value();
  GLint ref   = info[1]->Int32Value();
  GLuint mask = info[2]->Uint32Value();

  (inst->glStencilFunc)(func, ref, mask);
}

GL_METHOD(StencilFuncSeparate) {
  GL_BOILERPLATE;
  BP

  GLenum face = info[0]->Int32Value();
  GLenum func = info[1]->Int32Value();
  GLint ref   = info[2]->Int32Value();
  GLuint mask = info[3]->Uint32Value();

  (inst->glStencilFuncSeparate)(face, func, ref, mask);
}

GL_METHOD(StencilMask) {
  GL_BOILERPLATE;
  BP

  GLuint mask = info[0]->Uint32Value();

  (inst->glStencilMask)(mask);
}

GL_METHOD(StencilMaskSeparate) {
  GL_BOILERPLATE;
  BP

  GLenum face = info[0]->Int32Value();
  GLuint mask = info[1]->Uint32Value();

  (inst->glStencilMaskSeparate)(face, mask);
}

GL_METHOD(StencilOp) {
  GL_BOILERPLATE;
  BP

  GLenum fail   = info[0]->Int32Value();
  GLenum zfail  = info[1]->Int32Value();
  GLenum zpass  = info[2]->Int32Value();

  (inst->glStencilOp)(fail, zfail, zpass);
}

GL_METHOD(StencilOpSeparate) {
  GL_BOILERPLATE;
  BP

  GLenum face   = info[0]->Int32Value();
  GLenum fail   = info[1]->Int32Value();
  GLenum zfail  = info[2]->Int32Value();
  GLenum zpass  = info[3]->Int32Value();

  (inst->glStencilOpSeparate)(face, fail, zfail, zpass);
}

GL_METHOD(BindRenderbuffer) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLuint buffer = info[1]->Uint32Value();

  (inst->glBindRenderbuffer)(target, buffer);
}

GL_METHOD(CreateRenderbuffer) {
  GL_BOILERPLATE;
  BP

  GLuint renderbuffers;
  (inst->glGenRenderbuffers)(1, &renderbuffers);

  inst->registerGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffers);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(renderbuffers));
}

GL_METHOD(DeleteBuffer) {
  GL_BOILERPLATE;
  BP

  GLuint buffer = (GLuint)info[0]->Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_BUFFER, buffer);

  (inst->glDeleteBuffers)(1, &buffer);
}

GL_METHOD(DeleteFramebuffer) {
  GL_BOILERPLATE;
  BP

  GLuint buffer = info[0]->Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);

  (inst->glDeleteFramebuffers)(1, &buffer);
}

GL_METHOD(DeleteProgram) {
  GL_BOILERPLATE;
  BP

  GLuint program = info[0]->Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_PROGRAM, program);

  (inst->glDeleteProgram)(program);
}

GL_METHOD(DeleteRenderbuffer) {
  GL_BOILERPLATE;
  BP

  GLuint renderbuffer = info[0]->Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffer);

  (inst->glDeleteRenderbuffers)(1, &renderbuffer);
}

GL_METHOD(DeleteShader) {
  GL_BOILERPLATE;
  BP

  GLuint shader = info[0]->Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_SHADER, shader);

  (inst->glDeleteShader)(shader);
}

GL_METHOD(DeleteTexture) {
  GL_BOILERPLATE;
  BP

  GLuint texture = info[0]->Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_TEXTURE, texture);

  (inst->glDeleteTextures)(1, &texture);
}

GL_METHOD(DetachShader) {
  GL_BOILERPLATE;
  BP

  GLuint program  = info[0]->Uint32Value();
  GLuint shader   = info[1]->Uint32Value();

  (inst->glDetachShader)(program, shader);
}

GL_METHOD(FramebufferRenderbuffer) {
  GL_BOILERPLATE;
  BP

  GLenum target             = info[0]->Int32Value();
  GLenum attachment         = info[1]->Int32Value();
  GLenum renderbuffertarget = info[2]->Int32Value();
  GLuint renderbuffer       = info[3]->Uint32Value();

  (inst->glFramebufferRenderbuffer)(
      target
    , attachment
    , renderbuffertarget
    , renderbuffer);
}

GL_METHOD(GetVertexAttribOffset) {
  GL_BOILERPLATE;
  BP

  GLuint index = info[0]->Uint32Value();
  GLenum pname = info[1]->Int32Value();

  void *ret = NULL;
  (inst->glGetVertexAttribPointerv)(index, pname, &ret);

  GLuint offset = static_cast<GLuint>(reinterpret_cast<size_t>(ret));
  info.GetReturnValue().Set(Nan::New<v8::Integer>(offset));
}

GL_METHOD(IsBuffer) {
  GL_BOILERPLATE;
  BP

  info.GetReturnValue().Set(
    Nan::New<v8::Boolean>(
      (inst->glIsBuffer)(info[0]->Uint32Value()) != 0));
}

GL_METHOD(IsFramebuffer) {
  GL_BOILERPLATE;
  BP

  info.GetReturnValue().Set(
    Nan::New<v8::Boolean>(
      (inst->glIsFramebuffer)(info[0]->Uint32Value()) != 0));
}

GL_METHOD(IsProgram) {
  GL_BOILERPLATE;
  BP

  info.GetReturnValue().Set(
    Nan::New<v8::Boolean>(
      (inst->glIsProgram)(info[0]->Uint32Value()) != 0));
}

GL_METHOD(IsRenderbuffer) {
  GL_BOILERPLATE;
  BP

  info.GetReturnValue().Set(
    Nan::New<v8::Boolean>(
      (inst->glIsRenderbuffer)(info[0]->Uint32Value()) != 0));
}

GL_METHOD(IsShader) {
  GL_BOILERPLATE;
  BP

  info.GetReturnValue().Set(
    Nan::New<v8::Boolean>(
      (inst->glIsShader)(info[0]->Uint32Value()) != 0));
}

GL_METHOD(IsTexture) {
  GL_BOILERPLATE;
  BP

  info.GetReturnValue().Set(
    Nan::New<v8::Boolean>(
      (inst->glIsTexture)(info[0]->Uint32Value()) != 0));
}

GL_METHOD(RenderbufferStorage) {
  GL_BOILERPLATE;
  BP

  GLenum target         = info[0]->Int32Value();
  GLenum internalformat = info[1]->Int32Value();
  GLsizei width         = info[2]->Int32Value();
  GLsizei height        = info[3]->Int32Value();

  //In WebGL, we map GL_DEPTH_STENCIL to GL_DEPTH24_STENCIL8
  if (internalformat == GL_DEPTH_STENCIL) {
    internalformat = GL_DEPTH24_STENCIL8;
  }

  (inst->glRenderbufferStorage)(target, internalformat, width, height);
}

GL_METHOD(GetShaderSource) {
  GL_BOILERPLATE;
  BP

  GLint shader = info[0]->Int32Value();

  GLint len;
  (inst->glGetShaderiv)(shader, GL_SHADER_SOURCE_LENGTH, &len);

  GLchar *source = new GLchar[len];
  (inst->glGetShaderSource)(shader, len, NULL, source);
  v8::Local<v8::String> str = Nan::New<v8::String>(source).ToLocalChecked();
  delete source;

  info.GetReturnValue().Set(str);
}

GL_METHOD(ReadPixels) {
  GL_BOILERPLATE;
  BP

  GLint x        = info[0]->Int32Value();
  GLint y        = info[1]->Int32Value();
  GLsizei width  = info[2]->Int32Value();
  GLsizei height = info[3]->Int32Value();
  GLenum format  = info[4]->Int32Value();
  GLenum type    = info[5]->Int32Value();
  Nan::TypedArrayContents<char> pixels(info[6]);

  (inst->glReadPixels)(x, y, width, height, format, type, *pixels);
}

GL_METHOD(GetTexParameter) {
  GL_BOILERPLATE;
  BP

  GLenum target     = info[0]->Int32Value();
  GLenum pname      = info[1]->Int32Value();
  GLint param_value = 0;

  (inst->glGetTexParameteriv)(target, pname, &param_value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(param_value));
}

GL_METHOD(GetActiveAttrib) {
  GL_BOILERPLATE;
  BP

  GLuint program = info[0]->Int32Value();
  GLuint index   = info[1]->Int32Value();

  GLint maxLength;
  (inst->glGetProgramiv)(program, GL_ACTIVE_ATTRIBUTE_MAX_LENGTH, &maxLength);

  char* name = new char[maxLength];
  GLsizei length = 0;
  GLenum  type;
  GLsizei size;
  (inst->glGetActiveAttrib)(program, index, maxLength, &length, &size, &type, name);

  if (length > 0) {
    v8::Local<v8::Object> activeInfo = Nan::New<v8::Object>();
    Nan::Set(activeInfo
      , Nan::New<v8::String>("size").ToLocalChecked()
      , Nan::New<v8::Integer>(size));
    Nan::Set(activeInfo
      , Nan::New<v8::String>("type").ToLocalChecked()
      , Nan::New<v8::Integer>(type));
    Nan::Set(activeInfo
      , Nan::New<v8::String>("name").ToLocalChecked()
      , Nan::New<v8::String>(name).ToLocalChecked());
    info.GetReturnValue().Set(activeInfo);
  } else {
    info.GetReturnValue().SetNull();
  }

  delete[] name;
}

GL_METHOD(GetActiveUniform) {
  GL_BOILERPLATE;
  BP

  GLuint program = info[0]->Int32Value();
  GLuint index   = info[1]->Int32Value();

  GLint maxLength;
  (inst->glGetProgramiv)(program, GL_ACTIVE_UNIFORM_MAX_LENGTH, &maxLength);


  char* name = new char[maxLength];
  GLsizei length = 0;
  GLenum  type;
  GLsizei size;
  (inst->glGetActiveUniform)(program, index, maxLength, &length, &size, &type, name);

  if (length > 0) {
    v8::Local<v8::Object> activeInfo = Nan::New<v8::Object>();
    Nan::Set(activeInfo
      , Nan::New<v8::String>("size").ToLocalChecked()
      , Nan::New<v8::Integer>(size));
    Nan::Set(activeInfo
      , Nan::New<v8::String>("type").ToLocalChecked()
      , Nan::New<v8::Integer>(type));
    Nan::Set(activeInfo
      , Nan::New<v8::String>("name").ToLocalChecked()
      , Nan::New<v8::String>(name).ToLocalChecked());
    info.GetReturnValue().Set(activeInfo);
  } else {
    info.GetReturnValue().SetNull();
  }

  delete[] name;
}

GL_METHOD(GetAttachedShaders) {
  GL_BOILERPLATE;
  BP

  GLuint program = info[0]->Int32Value();

  GLint numAttachedShaders;
  (inst->glGetProgramiv)(program, GL_ATTACHED_SHADERS, &numAttachedShaders);

  GLuint* shaders = new GLuint[numAttachedShaders];
  GLsizei count;
  (inst->glGetAttachedShaders)(program, numAttachedShaders, &count, shaders);

  v8::Local<v8::Array> shadersArr = Nan::New<v8::Array>(count);
  for (int i=0; i<count; i++) {
    Nan::Set(shadersArr, i, Nan::New<v8::Integer>((int)shaders[i]));
  }

  info.GetReturnValue().Set(shadersArr);

  delete[] shaders;
}

GL_METHOD(GetParameter) {
  GL_BOILERPLATE;
  BP
  GLenum name = info[0]->Int32Value();

  switch(name) {
    case 0x9240 /* UNPACK_FLIP_Y_WEBGL */:
      info.GetReturnValue().Set(
        Nan::New<v8::Boolean>(inst->unpack_flip_y));
    return;

    case 0x9241 /* UNPACK_PREMULTIPLY_ALPHA_WEBGL*/:
      info.GetReturnValue().Set(
        Nan::New<v8::Boolean>(inst->unpack_premultiply_alpha));
    return;

    case 0x9243 /* UNPACK_COLORSPACE_CONVERSION_WEBGL */:
      info.GetReturnValue().Set(
        Nan::New<v8::Integer>(inst->unpack_colorspace_conversion));
    return;

    case GL_BLEND:
    case GL_CULL_FACE:
    case GL_DEPTH_TEST:
    case GL_DEPTH_WRITEMASK:
    case GL_DITHER:
    case GL_POLYGON_OFFSET_FILL:
    case GL_SAMPLE_COVERAGE_INVERT:
    case GL_SCISSOR_TEST:
    case GL_STENCIL_TEST:
    {
      GLboolean params;
      (inst->glGetBooleanv)(name, &params);

      info.GetReturnValue().Set(Nan::New<v8::Boolean>(params != 0));

      return;
    }

    case GL_DEPTH_CLEAR_VALUE:
    case GL_LINE_WIDTH:
    case GL_POLYGON_OFFSET_FACTOR:
    case GL_POLYGON_OFFSET_UNITS:
    case GL_SAMPLE_COVERAGE_VALUE:
    {
      GLfloat params;
      (inst->glGetFloatv)(name, &params);

      info.GetReturnValue().Set(Nan::New<v8::Number>(params));

      return;
    }

    case GL_RENDERER:
    case GL_SHADING_LANGUAGE_VERSION:
    case GL_VENDOR:
    case GL_VERSION:
    case GL_EXTENSIONS:
    {
      const char *params = reinterpret_cast<const char*>((inst->glGetString)(name));
      if(params) {
        info.GetReturnValue().Set(
          Nan::New<v8::String>(params).ToLocalChecked());
      }
      return;
    }

    case GL_MAX_VIEWPORT_DIMS:
    {
      GLint params[2];
      (inst->glGetIntegerv)(name, params);

      v8::Local<v8::Array> arr = Nan::New<v8::Array>(2);
      Nan::Set(arr, 0, Nan::New<v8::Integer>(params[0]));
      Nan::Set(arr, 1, Nan::New<v8::Integer>(params[1]));
      info.GetReturnValue().Set(arr);

      return;
    }

    case GL_SCISSOR_BOX:
    case GL_VIEWPORT:
    {
      GLint params[4];
      (inst->glGetIntegerv)(name, params);

      v8::Local<v8::Array> arr=Nan::New<v8::Array>(4);
      Nan::Set(arr, 0, Nan::New<v8::Integer>(params[0]));
      Nan::Set(arr, 1, Nan::New<v8::Integer>(params[1]));
      Nan::Set(arr, 2, Nan::New<v8::Integer>(params[2]));
      Nan::Set(arr, 3, Nan::New<v8::Integer>(params[3]));
      info.GetReturnValue().Set(arr);

      return;
    }

    case GL_ALIASED_LINE_WIDTH_RANGE:
    case GL_ALIASED_POINT_SIZE_RANGE:
    case GL_DEPTH_RANGE:
    {
      GLfloat params[2];
      (inst->glGetFloatv)(name, params);

      v8::Local<v8::Array> arr=Nan::New<v8::Array>(2);
      Nan::Set(arr, 0, Nan::New<v8::Number>(params[0]));
      Nan::Set(arr, 1, Nan::New<v8::Number>(params[1]));
      info.GetReturnValue().Set(arr);

      return;
    }

    case GL_BLEND_COLOR:
    case GL_COLOR_CLEAR_VALUE:
    {
      GLfloat params[4];
      (inst->glGetFloatv)(name, params);

      v8::Local<v8::Array> arr = Nan::New<v8::Array>(4);
      Nan::Set(arr, 0, Nan::New<v8::Number>(params[0]));
      Nan::Set(arr, 1, Nan::New<v8::Number>(params[1]));
      Nan::Set(arr, 2, Nan::New<v8::Number>(params[2]));
      Nan::Set(arr, 3, Nan::New<v8::Number>(params[3]));
      info.GetReturnValue().Set(arr);

      return;
    }

    case GL_COLOR_WRITEMASK:
    {
      GLboolean params[4];
      (inst->glGetBooleanv)(name, params);

      v8::Local<v8::Array> arr = Nan::New<v8::Array>(4);
      Nan::Set(arr, 0, Nan::New<v8::Boolean>(params[0] == GL_TRUE));
      Nan::Set(arr, 1, Nan::New<v8::Boolean>(params[1] == GL_TRUE));
      Nan::Set(arr, 2, Nan::New<v8::Boolean>(params[2] == GL_TRUE));
      Nan::Set(arr, 3, Nan::New<v8::Boolean>(params[3] == GL_TRUE));
      info.GetReturnValue().Set(arr);

      return;
    }

    default:
    {
      GLint params;
      (inst->glGetIntegerv)(name, &params);
      info.GetReturnValue().Set(Nan::New<v8::Integer>(params));
      return;
    }
  }
}

GL_METHOD(GetBufferParameter) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLenum pname  = info[1]->Int32Value();

  GLint params;
  (inst->glGetBufferParameteriv)(target, pname, &params);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(params));
}

GL_METHOD(GetFramebufferAttachmentParameter) {
  GL_BOILERPLATE;
  BP

  GLenum target     = info[0]->Int32Value();
  GLenum attachment = info[1]->Int32Value();
  GLenum pname      = info[2]->Int32Value();

  GLint params;
  (inst->glGetFramebufferAttachmentParameteriv)(target, attachment, pname, &params);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(params));
}

GL_METHOD(GetProgramInfoLog) {
  GL_BOILERPLATE;
  BP

  GLuint program = info[0]->Int32Value();

  GLint infoLogLength;
  (inst->glGetProgramiv)(program, GL_INFO_LOG_LENGTH, &infoLogLength);

  char* error = new char[infoLogLength+1];
  (inst->glGetProgramInfoLog)(program, infoLogLength+1, &infoLogLength, error);

  info.GetReturnValue().Set(
    Nan::New<v8::String>(error).ToLocalChecked());

  delete[] error;
}

GL_METHOD(GetShaderPrecisionFormat) {
  GL_BOILERPLATE;
  BP

  GLenum shaderType    = info[0]->Int32Value();
  GLenum precisionType = info[1]->Int32Value();

  GLint range[2];
  GLint precision;

  (inst->glGetShaderPrecisionFormat)(shaderType, precisionType, range, &precision);

  v8::Local<v8::Object> result = Nan::New<v8::Object>();
  Nan::Set(result
    , Nan::New<v8::String>("rangeMin").ToLocalChecked()
    , Nan::New<v8::Integer>(range[0]));
  Nan::Set(result
    , Nan::New<v8::String>("rangeMax").ToLocalChecked()
    , Nan::New<v8::Integer>(range[1]));
  Nan::Set(result
    , Nan::New<v8::String>("precision").ToLocalChecked()
    , Nan::New<v8::Integer>(precision));

  info.GetReturnValue().Set(result);
}

GL_METHOD(GetRenderbufferParameter) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();
  GLenum pname  = info[1]->Int32Value();

  int value;
  (inst->glGetRenderbufferParameteriv)(target, pname, &value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
}

GL_METHOD(GetUniform) {
  GL_BOILERPLATE;
  BP

  GLint program  = info[0]->Int32Value();
  GLint location = info[1]->Int32Value();

  float data[4096];
  (inst->glGetUniformfv)(program, location, data);

  v8::Local<v8::Array> arr = Nan::New<v8::Array>(16);
  for (int i=0; i<16; i++) {
    Nan::Set(arr, i, Nan::New<v8::Number>(data[i]));
  }

  info.GetReturnValue().Set(arr);
}

GL_METHOD(GetVertexAttrib) {
  GL_BOILERPLATE;
  BP

  GLint index  = info[0]->Int32Value();
  GLenum pname = info[1]->Int32Value();

  GLint value;

  switch (pname) {
    case GL_VERTEX_ATTRIB_ARRAY_ENABLED:
    case GL_VERTEX_ATTRIB_ARRAY_NORMALIZED:
    {
      (inst->glGetVertexAttribiv)(index, pname, &value);
      info.GetReturnValue().Set(Nan::New<v8::Boolean>(value != 0));
      return;
    }

    case GL_VERTEX_ATTRIB_ARRAY_SIZE:
    case GL_VERTEX_ATTRIB_ARRAY_STRIDE:
    case GL_VERTEX_ATTRIB_ARRAY_TYPE:
    {
      (inst->glGetVertexAttribiv)(index, pname, &value);
      info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
      return;
    }

    case GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
    {
      (inst->glGetVertexAttribiv)(index, pname, &value);
      info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
      return;
    }

    case GL_CURRENT_VERTEX_ATTRIB:
    {
      float vextex_attribs[4];

      (inst->glGetVertexAttribfv)(index, pname, vextex_attribs);

      v8::Local<v8::Array> arr=Nan::New<v8::Array>(4);
      Nan::Set(arr, 0,
        Nan::New<v8::Number>(vextex_attribs[0]));
      Nan::Set(arr, 1,
        Nan::New<v8::Number>(vextex_attribs[1]));
      Nan::Set(arr, 2,
        Nan::New<v8::Number>(vextex_attribs[2]));
      Nan::Set(arr, 3,
        Nan::New<v8::Number>(vextex_attribs[3]));
      info.GetReturnValue().Set(arr);

      return;
    }

    default:
      inst->setError(GL_INVALID_ENUM);
  }

  info.GetReturnValue().SetNull();
}

GL_METHOD(GetSupportedExtensions) {
  GL_BOILERPLATE;
  BP

  const char *extensions = reinterpret_cast<const char*>(
    (inst->glGetString)(GL_EXTENSIONS));

  info.GetReturnValue().Set(
    Nan::New<v8::String>(extensions).ToLocalChecked());
}

GL_METHOD(GetExtension) {
  GL_BOILERPLATE;
  BP

  //TODO
}

GL_METHOD(CheckFramebufferStatus) {
  GL_BOILERPLATE;
  BP

  GLenum target = info[0]->Int32Value();

  info.GetReturnValue().Set(
    Nan::New<v8::Integer>(
      static_cast<int>((inst->glCheckFramebufferStatus)(target))));
}
