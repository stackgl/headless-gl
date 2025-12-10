#include <array>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>

#include "webgl.h"

// Uncomment this to enable RenderDoc debugging
// #define RENDERDOC_ENABLED

#if defined(RENDERDOC_ENABLED)
#include "renderdoc_app.h"

RENDERDOC_API_1_1_2 *rdoc_api = NULL;
#endif

const char *GetDebugMessageSourceString(GLenum source) {
  switch (source) {
  case GL_DEBUG_SOURCE_API:
    return "API";
  case GL_DEBUG_SOURCE_WINDOW_SYSTEM:
    return "Window System";
  case GL_DEBUG_SOURCE_SHADER_COMPILER:
    return "Shader Compiler";
  case GL_DEBUG_SOURCE_THIRD_PARTY:
    return "Third Party";
  case GL_DEBUG_SOURCE_APPLICATION:
    return "Application";
  case GL_DEBUG_SOURCE_OTHER:
    return "Other";
  default:
    return "Unknown Source";
  }
}

const char *GetDebugMessageTypeString(GLenum type) {
  switch (type) {
  case GL_DEBUG_TYPE_ERROR:
    return "Error";
  case GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR:
    return "Deprecated behavior";
  case GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR:
    return "Undefined behavior";
  case GL_DEBUG_TYPE_PORTABILITY:
    return "Portability";
  case GL_DEBUG_TYPE_PERFORMANCE:
    return "Performance";
  case GL_DEBUG_TYPE_OTHER:
    return "Other";
  case GL_DEBUG_TYPE_MARKER:
    return "Marker";
  default:
    return "Unknown Type";
  }
}

const char *GetDebugMessageSeverityString(GLenum severity) {
  switch (severity) {
  case GL_DEBUG_SEVERITY_HIGH:
    return "High";
  case GL_DEBUG_SEVERITY_MEDIUM:
    return "Medium";
  case GL_DEBUG_SEVERITY_LOW:
    return "Low";
  case GL_DEBUG_SEVERITY_NOTIFICATION:
    return "Notification";
  default:
    return "Unknown Severity";
  }
}

void KHRONOS_APIENTRY DebugMessageCallback(GLenum source, GLenum type, GLuint id, GLenum severity,
                                           GLsizei length, const GLchar *message,
                                           const void *userParam) {
  std::string sourceText = GetDebugMessageSourceString(source);
  std::string typeText = GetDebugMessageTypeString(type);
  std::string severityText = GetDebugMessageSeverityString(severity);
  std::cout << sourceText << ", " << typeText << ", " << severityText << ": " << message << "\n";
}

void EnableDebugCallback(const void *userParam) {
  glEnable(GL_DEBUG_OUTPUT);
  glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
  // Enable medium and high priority messages.
  glDebugMessageControlKHR(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_HIGH, 0, nullptr, GL_TRUE);
  glDebugMessageControlKHR(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_MEDIUM, 0, nullptr,
                           GL_TRUE);
  // Disable low and notification priority messages.
  glDebugMessageControlKHR(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_LOW, 0, nullptr, GL_FALSE);
  glDebugMessageControlKHR(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_NOTIFICATION, 0, nullptr,
                           GL_FALSE);
  // Disable performance messages to reduce spam.
  glDebugMessageControlKHR(GL_DONT_CARE, GL_DEBUG_TYPE_PERFORMANCE, GL_DONT_CARE, 0, nullptr,
                           GL_FALSE);
  glDebugMessageCallbackKHR(DebugMessageCallback, userParam);
}

// Massage format parameter for compatibility with ANGLE's desktop GL
// restrictions.
GLenum SizeFloatingPointFormat(GLenum format) {
  switch (format) {
  case GL_RGBA:
    return GL_RGBA32F;
  case GL_RGB:
    return GL_RGB32F;
  case GL_RG:
    return GL_RG32F;
  case GL_RED:
    return GL_R32F;
  default:
    break;
  }

  return format;
}

GLenum OverrideDrawBufferEnum(GLenum buffer) {
  switch (buffer) {
  case GL_BACK:
    return GL_COLOR_ATTACHMENT0;
  case GL_DEPTH:
    return GL_DEPTH_ATTACHMENT;
  case GL_STENCIL:
    return GL_STENCIL_ATTACHMENT;
  }
}

std::set<std::string> GetStringSetFromCString(const char *cstr) {
  std::set<std::string> result;
  std::istringstream iss(cstr); // Create an input string stream
  std::string word;

  // Use the string stream to extract words separated by spaces
  while (iss >> word) {
    result.insert(word);
  }

  return result;
}

std::string JoinStringSet(const std::set<std::string> &inputSet,
                          const std::string &delimiter = " ") {
  std::ostringstream oss;
  for (auto it = inputSet.begin(); it != inputSet.end(); ++it) {
    if (it != inputSet.begin()) {
      oss << delimiter; // Add delimiter before each element except the first
    }
    oss << *it;
  }
  return oss.str();
}

// Helper function to potentially end RenderDoc frame capture after a few draw calls
#if defined(RENDERDOC_ENABLED)
constexpr int RenderDocCaptureFrameCount = 200;

static void MaybeEndRenderDocCapture() {
  static int drawCallCounter = 0;
  if (drawCallCounter++ >= RenderDocCaptureFrameCount && rdoc_api) {
    rdoc_api->EndFrameCapture(NULL, NULL);
    printf("RenderDoc capture ended after %d draw calls.\n", drawCallCounter);
    drawCallCounter = 0;
    rdoc_api->StartFrameCapture(NULL, NULL);
  }
}

#define RENDERDOC_COUNTER() MaybeEndRenderDocCapture()
#else
#define RENDERDOC_COUNTER()
#endif

bool WebGLRenderingContext::HAS_DISPLAY = false;
EGLDisplay WebGLRenderingContext::DISPLAY;
WebGLRenderingContext *WebGLRenderingContext::ACTIVE = NULL;
WebGLRenderingContext *WebGLRenderingContext::CONTEXT_LIST_HEAD = NULL;

#define GL_METHOD(method_name) NAN_METHOD(WebGLRenderingContext::method_name)

#define GL_BOILERPLATE                                                                             \
  Nan::HandleScope();                                                                              \
  if (info.This()->InternalFieldCount() <= 0) {                                                    \
    return Nan::ThrowError("Invalid WebGL Object");                                                \
  }                                                                                                \
  WebGLRenderingContext *inst = node::ObjectWrap::Unwrap<WebGLRenderingContext>(info.This());      \
  if (!(inst && inst->setActive())) {                                                              \
    return Nan::ThrowError("Invalid GL context");                                                  \
  }

bool ContextSupportsExtensions(WebGLRenderingContext *inst,
                               const std::vector<std::string> &extensions) {
  for (const std::string &extension : extensions) {
    if (inst->enabledExtensions.count(extension) == 0 &&
        inst->requestableExtensions.count(extension) == 0) {
      return false;
    }
  }
  return true;
}

bool CaseInsensitiveCompare(const std::string &a, const std::string &b) {
  std::string aLower = a;
  std::string bLower = b;
  std::transform(aLower.begin(), aLower.end(), aLower.begin(),
                 [](unsigned char c) { return std::tolower(c); });
  std::transform(bLower.begin(), bLower.end(), bLower.begin(),
                 [](unsigned char c) { return std::tolower(c); });
  return aLower < bLower;
};

WebGLRenderingContext::WebGLRenderingContext(int width, int height, bool alpha, bool depth,
                                             bool stencil, bool antialias, bool premultipliedAlpha,
                                             bool preserveDrawingBuffer,
                                             bool preferLowPowerToHighPerformance,
                                             bool failIfMajorPerformanceCaveat,
                                             bool createWebGL2Context)
    : state(GLCONTEXT_STATE_INIT), unpack_flip_y(false), unpack_premultiply_alpha(false),
      unpack_colorspace_conversion(0x9244), unpack_alignment(4),
      webGLToANGLEExtensions(&CaseInsensitiveCompare), next(NULL), prev(NULL) {

  // Uncomment on Windows to attach debugger
  // MessageBoxA(NULL, "Hello", "Hello", MB_OK);

#if defined(RENDERDOC_ENABLED)
  if (!rdoc_api) {
    if (HMODULE mod = GetModuleHandleA("renderdoc.dll")) {
      pRENDERDOC_GetAPI RENDERDOC_GetAPI =
          (pRENDERDOC_GetAPI)GetProcAddress(mod, "RENDERDOC_GetAPI");
      int ret = RENDERDOC_GetAPI(eRENDERDOC_API_Version_1_1_2, (void **)&rdoc_api);
      printf("RENDERDOC_GetAPI ret: %d %p\n", ret, rdoc_api);
      assert(ret == 1);
    } else {
      printf("renderdoc.dll not found\n");
    }
  }
#endif

  if (!eglGetProcAddress) {
    if (!eglLibrary.open("libEGL")) {
      errorMessage = "Error opening ANGLE shared library.";
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    auto getProcAddress = eglLibrary.getFunction<PFNEGLGETPROCADDRESSPROC>("eglGetProcAddress");
    ::LoadEGL(getProcAddress);
  }

  // Get display
  if (!HAS_DISPLAY) {
    DISPLAY = eglGetDisplay(EGL_DEFAULT_DISPLAY);
    if (DISPLAY == EGL_NO_DISPLAY) {
      errorMessage = "Error retrieving EGL default display.";
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    // Initialize EGL
    if (!eglInitialize(DISPLAY, NULL, NULL)) {
      errorMessage = "Error initializing EGL.";
      state = GLCONTEXT_STATE_ERROR;
      return;
    }

    // Save display
    HAS_DISPLAY = true;
  }

  // Set up configuration
  EGLint renderableTypeBit = createWebGL2Context ? EGL_OPENGL_ES2_BIT : EGL_OPENGL_ES3_BIT;
  EGLint attrib_list[] = {EGL_SURFACE_TYPE,
                          EGL_PBUFFER_BIT,
                          EGL_RED_SIZE,
                          8,
                          EGL_GREEN_SIZE,
                          8,
                          EGL_BLUE_SIZE,
                          8,
                          EGL_ALPHA_SIZE,
                          8,
                          EGL_DEPTH_SIZE,
                          24,
                          EGL_STENCIL_SIZE,
                          8,
                          EGL_RENDERABLE_TYPE,
                          renderableTypeBit,
                          EGL_NONE};
  EGLint num_config;
  if (!eglChooseConfig(DISPLAY, attrib_list, &config, 1, &num_config) || num_config != 1) {
    errorMessage = "Error choosing EGL config.";
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  // Create context
  EGLint contextAttribs[] = {EGL_CONTEXT_CLIENT_VERSION,
                             createWebGL2Context ? 3 : 2,
                             EGL_CONTEXT_WEBGL_COMPATIBILITY_ANGLE,
                             EGL_TRUE,
                             EGL_CONTEXT_OPENGL_BACKWARDS_COMPATIBLE_ANGLE,
                             EGL_FALSE,
                             EGL_ROBUST_RESOURCE_INITIALIZATION_ANGLE,
                             EGL_TRUE,
                             EGL_NONE};
  context = eglCreateContext(DISPLAY, config, EGL_NO_CONTEXT, contextAttribs);
  if (context == EGL_NO_CONTEXT) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  EGLint surfaceAttribs[] = {EGL_WIDTH, (EGLint)width, EGL_HEIGHT, (EGLint)height, EGL_NONE};
  surface = eglCreatePbufferSurface(DISPLAY, config, surfaceAttribs);
  if (surface == EGL_NO_SURFACE) {
    errorMessage = "Error creating EGL surface.";
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  // Set active
  if (!eglMakeCurrent(DISPLAY, surface, surface, context)) {
    errorMessage = "Error making context current.";
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  // Success
  state = GLCONTEXT_STATE_OK;
  registerContext();
  ACTIVE = this;

  LoadGLES(eglGetProcAddress);

  // Enable the debug callback to debug GL errors.
  // EnableDebugCallback(nullptr);

  // Log the GL_RENDERER and GL_VERSION strings.
  // const char *rendererString = (const char *)glGetString(GL_RENDERER);
  // const char *versionString = (const char *)glGetString(GL_VERSION);
  // std::cout << "ANGLE GL_RENDERER: " << rendererString << std::endl;
  // std::cout << "ANGLE GL_VERSION: " << versionString << std::endl;

  // Check extensions
  const char *extensionsString = (const char *)(glGetString(GL_EXTENSIONS));
  enabledExtensions = GetStringSetFromCString(extensionsString);

  const char *requestableExtensionsString =
      (const char *)glGetString(GL_REQUESTABLE_EXTENSIONS_ANGLE);
  requestableExtensions = GetStringSetFromCString(requestableExtensionsString);

  // Request necessary WebGL extensions.
  glRequestExtensionANGLE("GL_EXT_texture_storage");

  // Select best preferred depth
  preferredDepth = GL_DEPTH_COMPONENT16;
  if (strstr(extensionsString, "GL_OES_depth32")) {
    preferredDepth = GL_DEPTH_COMPONENT32_OES;
  } else if (strstr(extensionsString, "GL_OES_depth24")) {
    preferredDepth = GL_DEPTH_COMPONENT24_OES;
  }

  // Each WebGL extension maps to one or more required ANGLE extensions.
  webGLToANGLEExtensions.insert({"STACKGL_destroy_context", {}});
  webGLToANGLEExtensions.insert({"STACKGL_resize_drawingbuffer", {}});
  webGLToANGLEExtensions.insert(
      {"EXT_texture_filter_anisotropic", {"GL_EXT_texture_filter_anisotropic"}});
  webGLToANGLEExtensions.insert({"OES_texture_float_linear", {"GL_OES_texture_float_linear"}});
  if (createWebGL2Context) {
    webGLToANGLEExtensions.insert({"EXT_color_buffer_float", {"GL_EXT_color_buffer_float"}});
  } else {
    webGLToANGLEExtensions.insert({"ANGLE_instanced_arrays", {"GL_ANGLE_instanced_arrays"}});
    webGLToANGLEExtensions.insert({"OES_element_index_uint", {"GL_OES_element_index_uint"}});
    webGLToANGLEExtensions.insert({"EXT_blend_minmax", {"GL_EXT_blend_minmax"}});
    webGLToANGLEExtensions.insert({"OES_standard_derivatives", {"GL_OES_standard_derivatives"}});
    webGLToANGLEExtensions.insert({"OES_texture_float",
                                   {"GL_OES_texture_float", "GL_CHROMIUM_color_buffer_float_rgba",
                                    "GL_CHROMIUM_color_buffer_float_rgb"}});
    webGLToANGLEExtensions.insert({"WEBGL_draw_buffers", {"GL_EXT_draw_buffers"}});
    webGLToANGLEExtensions.insert({"OES_vertex_array_object", {"GL_OES_vertex_array_object"}});
    webGLToANGLEExtensions.insert({"EXT_shader_texture_lod", {"GL_EXT_shader_texture_lod"}});
  }

  for (const auto &iter : webGLToANGLEExtensions) {
    const std::string &webGLExtension = iter.first;
    const std::vector<std::string> &angleExtensions = iter.second;
    if (ContextSupportsExtensions(this, angleExtensions)) {
      supportedWebGLExtensions.insert(webGLExtension);
    }
  }

#if defined(RENDERDOC_ENABLED)
  if (rdoc_api) {
    rdoc_api->StartFrameCapture(NULL, NULL);
  }
#endif
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
  if (error == GL_NO_ERROR || errorSet.count(error) > 0) {
    return;
  }
  errorSet.insert(error);
}

void WebGLRenderingContext::dispose() {

  // Finish RenderDoc frame capture
#if defined(RENDERDOC_ENABLED)
  if (rdoc_api) {
    rdoc_api->EndFrameCapture(NULL, NULL);
  }
#endif

  // Unregister context
  unregisterContext();

  if (!setActive()) {
    state = GLCONTEXT_STATE_ERROR;
    return;
  }

  // Update state
  state = GLCONTEXT_STATE_DESTROY;

  // Destroy all object references
  for (std::map<std::pair<GLuint, GLObjectType>, bool>::iterator iter = objects.begin();
       iter != objects.end(); ++iter) {

    GLuint obj = iter->first.first;

    switch (iter->first.second) {
    case GLOBJECT_TYPE_PROGRAM:
      glDeleteProgram(obj);
      break;
    case GLOBJECT_TYPE_BUFFER:
      glDeleteBuffers(1, &obj);
      break;
    case GLOBJECT_TYPE_FRAMEBUFFER:
      glDeleteFramebuffers(1, &obj);
      break;
    case GLOBJECT_TYPE_RENDERBUFFER:
      glDeleteRenderbuffers(1, &obj);
      break;
    case GLOBJECT_TYPE_SHADER:
      glDeleteShader(obj);
      break;
    case GLOBJECT_TYPE_TEXTURE:
      glDeleteTextures(1, &obj);
      break;
    case GLOBJECT_TYPE_VERTEX_ARRAY:
      glDeleteVertexArraysOES(1, &obj);
      break;
    default:
      break;
    }
  }

  // Deactivate context
  eglMakeCurrent(DISPLAY, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
  ACTIVE = NULL;

  // Destroy surface and context

  // FIXME:  This shouldn't be commented out
  // eglDestroySurface(DISPLAY, surface);
  eglDestroyContext(DISPLAY, context);
}

WebGLRenderingContext::~WebGLRenderingContext() { dispose(); }

GL_METHOD(SetError) {
  GL_BOILERPLATE;
  inst->setError((GLenum)(Nan::To<int32_t>(info[0]).ToChecked()));
}

GL_METHOD(DisposeAll) {
  Nan::HandleScope();

  while (CONTEXT_LIST_HEAD) {
    CONTEXT_LIST_HEAD->dispose();
  }

  if (WebGLRenderingContext::HAS_DISPLAY) {
    eglTerminate(WebGLRenderingContext::DISPLAY);
    WebGLRenderingContext::HAS_DISPLAY = false;
  }
}

GL_METHOD(New) {
  Nan::HandleScope();

  bool createWebGL2Context = Nan::To<bool>(info[10]).ToChecked();

  WebGLRenderingContext *instance =
      new WebGLRenderingContext(Nan::To<int32_t>(info[0]).ToChecked(), // Width
                                Nan::To<int32_t>(info[1]).ToChecked(), // Height
                                Nan::To<bool>(info[2]).ToChecked(),    // Alpha
                                Nan::To<bool>(info[3]).ToChecked(),    // Depth
                                Nan::To<bool>(info[4]).ToChecked(),    // Stencil
                                Nan::To<bool>(info[5]).ToChecked(),    // antialias
                                Nan::To<bool>(info[6]).ToChecked(),    // premultipliedAlpha
                                Nan::To<bool>(info[7]).ToChecked(),    // preserve drawing buffer
                                Nan::To<bool>(info[8]).ToChecked(),    // low power
                                Nan::To<bool>(info[9]).ToChecked(),    // fail if crap
                                createWebGL2Context);

  if (instance->state != GLCONTEXT_STATE_OK) {
    if (!instance->errorMessage.empty()) {
      std::string error = std::string("Error creating WebGLContext: ") + instance->errorMessage;
      return Nan::ThrowError(error.c_str());
    } else {
      return Nan::ThrowError("Error creating WebGLContext");
    }
  }

  instance->Wrap(info.This());

  if (createWebGL2Context) {
    BindWebGL2(info);
  }

  info.GetReturnValue().Set(info.This());
}

GL_METHOD(Destroy) {
  GL_BOILERPLATE

  inst->dispose();
}

GL_METHOD(Uniform1f) {
  GL_BOILERPLATE;

  int location = Nan::To<int32_t>(info[0]).ToChecked();
  float x = (float)Nan::To<double>(info[1]).ToChecked();

  glUniform1f(location, x);
}

GL_METHOD(Uniform2f) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat y = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());

  glUniform2f(location, x, y);
}

GL_METHOD(Uniform3f) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat y = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());
  GLfloat z = static_cast<GLfloat>(Nan::To<double>(info[3]).ToChecked());

  glUniform3f(location, x, y, z);
}

GL_METHOD(Uniform4f) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat y = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());
  GLfloat z = static_cast<GLfloat>(Nan::To<double>(info[3]).ToChecked());
  GLfloat w = static_cast<GLfloat>(Nan::To<double>(info[4]).ToChecked());

  glUniform4f(location, x, y, z, w);
}

GL_METHOD(Uniform1i) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLint x = Nan::To<int32_t>(info[1]).ToChecked();

  glUniform1i(location, x);
}

GL_METHOD(Uniform2i) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLint x = Nan::To<int32_t>(info[1]).ToChecked();
  GLint y = Nan::To<int32_t>(info[2]).ToChecked();

  glUniform2i(location, x, y);
}

GL_METHOD(Uniform3i) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLint x = Nan::To<int32_t>(info[1]).ToChecked();
  GLint y = Nan::To<int32_t>(info[2]).ToChecked();
  GLint z = Nan::To<int32_t>(info[3]).ToChecked();

  glUniform3i(location, x, y, z);
}

GL_METHOD(Uniform4i) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLint x = Nan::To<int32_t>(info[1]).ToChecked();
  GLint y = Nan::To<int32_t>(info[2]).ToChecked();
  GLint z = Nan::To<int32_t>(info[3]).ToChecked();
  GLint w = Nan::To<int32_t>(info[4]).ToChecked();

  glUniform4i(location, x, y, z, w);
}

GL_METHOD(PixelStorei) {
  GL_BOILERPLATE;

  GLenum pname = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum param = Nan::To<int32_t>(info[1]).ToChecked();

  // Handle WebGL specific extensions
  switch (pname) {
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
    glPixelStorei(pname, param);
    break;

  case GL_MAX_DRAW_BUFFERS_EXT:
    glPixelStorei(pname, param);
    break;

  default:
    glPixelStorei(pname, param);
    break;
  }
}

GL_METHOD(BindAttribLocation) {
  GL_BOILERPLATE;

  GLint program = Nan::To<int32_t>(info[0]).ToChecked();
  GLint index = Nan::To<int32_t>(info[1]).ToChecked();
  Nan::Utf8String name(info[2]);

  glBindAttribLocation(program, index, *name);
}

GLenum WebGLRenderingContext::getError() {
  GLenum error = GL_NO_ERROR;
  if (errorSet.empty()) {
    error = glGetError();
  } else {
    error = *errorSet.begin();
    errorSet.erase(errorSet.begin());
  }
  return error;
}

GL_METHOD(GetError) {
  GL_BOILERPLATE;
  info.GetReturnValue().Set(Nan::New<v8::Integer>(inst->getError()));
}

GL_METHOD(VertexAttribDivisorANGLE) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint divisor = Nan::To<uint32_t>(info[1]).ToChecked();

  glVertexAttribDivisorANGLE(index, divisor);
}

GL_METHOD(DrawArraysInstancedANGLE) {
  GL_BOILERPLATE;

  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLint first = Nan::To<int32_t>(info[1]).ToChecked();
  GLuint count = Nan::To<uint32_t>(info[2]).ToChecked();
  GLuint icount = Nan::To<uint32_t>(info[3]).ToChecked();

  glDrawArraysInstancedANGLE(mode, first, count, icount);
  RENDERDOC_COUNTER();
}

GL_METHOD(DrawElementsInstancedANGLE) {
  GL_BOILERPLATE;

  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLint count = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[2]).ToChecked();
  GLint offset = Nan::To<int32_t>(info[3]).ToChecked();
  GLuint icount = Nan::To<uint32_t>(info[4]).ToChecked();

  glDrawElementsInstancedANGLE(mode, count, type,
                               reinterpret_cast<GLvoid *>(static_cast<uintptr_t>(offset)), icount);
  RENDERDOC_COUNTER();
}

GL_METHOD(DrawArrays) {
  GL_BOILERPLATE;

  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLint first = Nan::To<int32_t>(info[1]).ToChecked();
  GLint count = Nan::To<int32_t>(info[2]).ToChecked();

  glDrawArrays(mode, first, count);
  RENDERDOC_COUNTER();
}

GL_METHOD(UniformMatrix2fv) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLboolean transpose = (Nan::To<bool>(info[1]).ToChecked());
  Nan::TypedArrayContents<GLfloat> data(info[2]);

  glUniformMatrix2fv(location, data.length() / 4, transpose, *data);
}

GL_METHOD(UniformMatrix3fv) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLboolean transpose = (Nan::To<bool>(info[1]).ToChecked());
  Nan::TypedArrayContents<GLfloat> data(info[2]);

  glUniformMatrix3fv(location, data.length() / 9, transpose, *data);
}

GL_METHOD(UniformMatrix4fv) {
  GL_BOILERPLATE;

  GLint location = Nan::To<int32_t>(info[0]).ToChecked();
  GLboolean transpose = (Nan::To<bool>(info[1]).ToChecked());
  Nan::TypedArrayContents<GLfloat> data(info[2]);

  glUniformMatrix4fv(location, data.length() / 16, transpose, *data);
}

GL_METHOD(GenerateMipmap) {
  GL_BOILERPLATE;

  GLint target = Nan::To<int32_t>(info[0]).ToChecked();
  glGenerateMipmap(target);
}

GL_METHOD(GetAttribLocation) {
  GL_BOILERPLATE;

  GLint program = Nan::To<int32_t>(info[0]).ToChecked();
  Nan::Utf8String name(info[1]);

  GLint result = glGetAttribLocation(program, *name);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(result));
}

GL_METHOD(DepthFunc) {
  GL_BOILERPLATE;

  glDepthFunc(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(Viewport) {
  GL_BOILERPLATE;

  GLint x = Nan::To<int32_t>(info[0]).ToChecked();
  GLint y = Nan::To<int32_t>(info[1]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[3]).ToChecked();

  glViewport(x, y, width, height);
}

GL_METHOD(CreateShader) {
  GL_BOILERPLATE;

  GLuint shader = glCreateShader(Nan::To<int32_t>(info[0]).ToChecked());
  inst->registerGLObj(GLOBJECT_TYPE_SHADER, shader);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(shader));
}

GL_METHOD(ShaderSource) {
  GL_BOILERPLATE;

  GLint id = Nan::To<int32_t>(info[0]).ToChecked();
  Nan::Utf8String code(info[1]);

  const char *codes[] = {*code};
  GLint length = code.length();

  glShaderSource(id, 1, codes, &length);
}

GL_METHOD(CompileShader) {
  GL_BOILERPLATE;

  glCompileShader(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(FrontFace) {
  GL_BOILERPLATE;

  glFrontFace(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(GetShaderParameter) {
  GL_BOILERPLATE;

  GLint shader = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();

  GLint value;
  glGetShaderiv(shader, pname, &value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
}

GL_METHOD(GetShaderInfoLog) {
  GL_BOILERPLATE;

  GLint id = Nan::To<int32_t>(info[0]).ToChecked();

  GLint infoLogLength;
  glGetShaderiv(id, GL_INFO_LOG_LENGTH, &infoLogLength);

  char *error = new char[infoLogLength + 1];
  glGetShaderInfoLog(id, infoLogLength + 1, &infoLogLength, error);

  info.GetReturnValue().Set(Nan::New<v8::String>(error).ToLocalChecked());

  delete[] error;
}

GL_METHOD(CreateProgram) {
  GL_BOILERPLATE;

  GLuint program = glCreateProgram();
  inst->registerGLObj(GLOBJECT_TYPE_PROGRAM, program);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(program));
}

GL_METHOD(AttachShader) {
  GL_BOILERPLATE;

  GLint program = Nan::To<int32_t>(info[0]).ToChecked();
  GLint shader = Nan::To<int32_t>(info[1]).ToChecked();

  glAttachShader(program, shader);
}

GL_METHOD(ValidateProgram) {
  GL_BOILERPLATE;

  glValidateProgram(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(LinkProgram) {
  GL_BOILERPLATE;

  glLinkProgram(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(GetProgramParameter) {
  GL_BOILERPLATE;

  GLint program = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = (GLenum)(Nan::To<int32_t>(info[1]).ToChecked());
  GLint value = 0;

  glGetProgramiv(program, pname, &value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
}

GL_METHOD(GetUniformLocation) {
  GL_BOILERPLATE;

  GLint program = Nan::To<int32_t>(info[0]).ToChecked();
  Nan::Utf8String name(info[1]);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(glGetUniformLocation(program, *name)));
}

GL_METHOD(ClearColor) {
  GL_BOILERPLATE;

  GLfloat red = static_cast<GLfloat>(Nan::To<double>(info[0]).ToChecked());
  GLfloat green = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat blue = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());
  GLfloat alpha = static_cast<GLfloat>(Nan::To<double>(info[3]).ToChecked());

  glClearColor(red, green, blue, alpha);
}

GL_METHOD(ClearDepth) {
  GL_BOILERPLATE;

  GLfloat depth = static_cast<GLfloat>(Nan::To<double>(info[0]).ToChecked());

  glClearDepthf(depth);
}

// Two specific enums are accepted by ANGLE when they shouldn't be. This shows up
// for headless, but not browsers, because browsers do additional validation.
// The ANGLE fix is to make EXT_multisample_compatibility "enableable".
bool IsBuggedANGLECap(GLenum cap) { return cap == GL_MULTISAMPLE || cap == GL_SAMPLE_ALPHA_TO_ONE; }

GL_METHOD(Disable) {
  GL_BOILERPLATE;

  GLenum cap = Nan::To<int32_t>(info[0]).ToChecked();

  if (IsBuggedANGLECap(cap)) {
    inst->setError(GL_INVALID_ENUM);
  } else {
    glDisable(cap);
  }
}

GL_METHOD(Enable) {
  GL_BOILERPLATE;

  GLenum cap = Nan::To<int32_t>(info[0]).ToChecked();

  if (IsBuggedANGLECap(cap)) {
    inst->setError(GL_INVALID_ENUM);
  } else {
    glEnable(cap);
  }
}

GL_METHOD(CreateTexture) {
  GL_BOILERPLATE;

  GLuint texture = 0;
  glGenTextures(1, &texture);
  inst->registerGLObj(GLOBJECT_TYPE_TEXTURE, texture);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(texture));
}

GL_METHOD(BindTexture) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint texture = Nan::To<int32_t>(info[1]).ToChecked();

  glBindTexture(target, texture);
}

std::vector<uint8_t> WebGLRenderingContext::unpackPixels(GLenum type, GLenum format, GLint width,
                                                         GLint height, unsigned char *pixels) {

  // Compute pixel size
  GLint pixelSize = 1;
  if (type == GL_UNSIGNED_BYTE || type == GL_FLOAT) {
    if (type == GL_FLOAT) {
      pixelSize = 4;
    }
    switch (format) {
    case GL_ALPHA:
    case GL_LUMINANCE:
      break;
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

  // Compute row stride
  GLint rowStride = pixelSize * width;
  if ((rowStride % unpack_alignment) != 0) {
    rowStride += unpack_alignment - (rowStride % unpack_alignment);
  }

  GLint imageSize = rowStride * height;
  std::vector<uint8_t> unpacked(imageSize);

  if (unpack_flip_y) {
    for (int i = 0, j = height - 1; j >= 0; ++i, --j) {
      memcpy(&unpacked[j * rowStride], reinterpret_cast<void *>(pixels + i * rowStride),
             width * pixelSize);
    }
  } else {
    memcpy(unpacked.data(), reinterpret_cast<void *>(pixels), imageSize);
  }

  // Premultiply alpha unpacking
  if (unpack_premultiply_alpha && (format == GL_LUMINANCE_ALPHA || format == GL_RGBA)) {

    for (int row = 0; row < height; ++row) {
      for (int col = 0; col < width; ++col) {
        uint8_t *pixel = &unpacked[(row * rowStride) + (col * pixelSize)];
        if (format == GL_LUMINANCE_ALPHA) {
          pixel[0] *= pixel[1] / 255.0;
        } else if (type == GL_UNSIGNED_BYTE) {
          float scale = pixel[3] / 255.0;
          pixel[0] *= scale;
          pixel[1] *= scale;
          pixel[2] *= scale;
        } else if (type == GL_UNSIGNED_SHORT_4_4_4_4) {
          int r = pixel[0] & 0x0f;
          int g = pixel[0] >> 4;
          int b = pixel[1] & 0x0f;
          int a = pixel[1] >> 4;

          float scale = a / 15.0;
          r *= scale;
          g *= scale;
          b *= scale;

          pixel[0] = r + (g << 4);
          pixel[1] = b + (a << 4);
        } else if (type == GL_UNSIGNED_SHORT_5_5_5_1) {
          if ((pixel[0] & 1) == 0) {
            pixel[0] = 1; // why does this get set to 1?!?!?!
            pixel[1] = 0;
          }
        }
      }
    }
  }

  return unpacked;
}

void CallTexImage2D(GLenum target, GLint level, GLenum internalformat, GLsizei width,
                    GLsizei height, GLint border, GLenum format, GLenum type, GLsizei bufSize,
                    const void *pixels) {
  GLenum sizedInternalFormat = SizeFloatingPointFormat(internalformat);
  if (type == GL_FLOAT && sizedInternalFormat != internalformat) {
    glTexStorage2DEXT(target, 1, sizedInternalFormat, width, height);
    if (pixels) {
      glTexSubImage2DRobustANGLE(target, level, 0, 0, width, height, format, type, bufSize, pixels);
    }
  } else {
    glTexImage2DRobustANGLE(target, level, internalformat, width, height, border, format, type,
                            bufSize, pixels);
  }
}

GL_METHOD(TexImage2D) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[4]).ToChecked();
  GLint border = Nan::To<int32_t>(info[5]).ToChecked();
  GLenum format = Nan::To<int32_t>(info[6]).ToChecked();
  GLint type = Nan::To<int32_t>(info[7]).ToChecked();
  Nan::TypedArrayContents<unsigned char> pixels(info[8]);

  if (*pixels) {
    if (inst->unpack_flip_y || inst->unpack_premultiply_alpha) {
      std::vector<uint8_t> unpacked = inst->unpackPixels(type, format, width, height, *pixels);
      CallTexImage2D(target, level, internalformat, width, height, border, format, type,
                     unpacked.size(), unpacked.data());
    } else {
      CallTexImage2D(target, level, internalformat, width, height, border, format, type,
                     pixels.length(), *pixels);
    }
  } else {
    CallTexImage2D(target, level, internalformat, width, height, border, format, type, 0, nullptr);
  }
}

GL_METHOD(TexSubImage2D) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLint xoffset = Nan::To<int32_t>(info[2]).ToChecked();
  GLint yoffset = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[5]).ToChecked();
  GLenum format = Nan::To<int32_t>(info[6]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[7]).ToChecked();
  Nan::TypedArrayContents<unsigned char> pixels(info[8]);

  if (inst->unpack_flip_y || inst->unpack_premultiply_alpha) {
    if (!*pixels) {
      inst->setError(GL_INVALID_OPERATION);
      return;
    }
    std::vector<uint8_t> unpacked = inst->unpackPixels(type, format, width, height, *pixels);
    glTexSubImage2DRobustANGLE(target, level, xoffset, yoffset, width, height, format, type,
                               unpacked.size(), unpacked.data());
  } else {
    glTexSubImage2DRobustANGLE(target, level, xoffset, yoffset, width, height, format, type,
                               pixels.length(), *pixels);
  }
}

GL_METHOD(TexParameteri) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLint param = Nan::To<int32_t>(info[2]).ToChecked();

  glTexParameteri(target, pname, param);
}

GL_METHOD(TexParameterf) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLfloat param = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());

  glTexParameterf(target, pname, param);
}

GL_METHOD(Clear) {
  GL_BOILERPLATE;

  glClear(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(UseProgram) {
  GL_BOILERPLATE;

  glUseProgram(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(CreateBuffer) {
  GL_BOILERPLATE;

  GLuint buffer;
  glGenBuffers(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_BUFFER, buffer);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(buffer));
}

GL_METHOD(BindBuffer) {
  GL_BOILERPLATE;

  GLenum target = (GLenum)Nan::To<int32_t>(info[0]).ToChecked();
  GLuint buffer = (GLuint)Nan::To<uint32_t>(info[1]).ToChecked();

  glBindBuffer(target, buffer);
}

GL_METHOD(CreateFramebuffer) {
  GL_BOILERPLATE;

  GLuint buffer;
  glGenFramebuffers(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(buffer));
}

GL_METHOD(BindFramebuffer) {
  GL_BOILERPLATE;

  GLint target = (GLint)Nan::To<int32_t>(info[0]).ToChecked();
  GLint buffer = (GLint)(Nan::To<int32_t>(info[1]).ToChecked());

  glBindFramebuffer(target, buffer);
}

GL_METHOD(FramebufferTexture2D) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum attachment = Nan::To<int32_t>(info[1]).ToChecked();
  GLint textarget = Nan::To<int32_t>(info[2]).ToChecked();
  GLint texture = Nan::To<int32_t>(info[3]).ToChecked();
  GLint level = Nan::To<int32_t>(info[4]).ToChecked();

  // Handle depth stencil case separately
  if (attachment == 0x821A) {
    glFramebufferTexture2D(target, GL_DEPTH_ATTACHMENT, textarget, texture, level);
    glFramebufferTexture2D(target, GL_STENCIL_ATTACHMENT, textarget, texture, level);
  } else {
    glFramebufferTexture2D(target, attachment, textarget, texture, level);
  }
}

GL_METHOD(BufferData) {
  GL_BOILERPLATE;

  GLint target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum usage = Nan::To<int32_t>(info[2]).ToChecked();

  if (info[1]->IsObject()) {
    Nan::TypedArrayContents<char> array(info[1]);
    glBufferData(target, array.length(), static_cast<void *>(*array), usage);
  } else if (info[1]->IsNumber()) {
    glBufferData(target, Nan::To<int32_t>(info[1]).ToChecked(), NULL, usage);
  }
}

GL_METHOD(BufferSubData) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint offset = Nan::To<int32_t>(info[1]).ToChecked();
  Nan::TypedArrayContents<char> array(info[2]);

  glBufferSubData(target, offset, array.length(), *array);
}

GL_METHOD(BlendEquation) {
  GL_BOILERPLATE;

  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();

  glBlendEquation(mode);
}

GL_METHOD(BlendFunc) {
  GL_BOILERPLATE;

  GLenum sfactor = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum dfactor = Nan::To<int32_t>(info[1]).ToChecked();

  glBlendFunc(sfactor, dfactor);
}

GL_METHOD(EnableVertexAttribArray) {
  GL_BOILERPLATE;

  glEnableVertexAttribArray(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(VertexAttribPointer) {
  GL_BOILERPLATE;

  GLint index = Nan::To<int32_t>(info[0]).ToChecked();
  GLint size = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[2]).ToChecked();
  GLboolean normalized = Nan::To<bool>(info[3]).ToChecked();
  GLint stride = Nan::To<int32_t>(info[4]).ToChecked();
  size_t offset = Nan::To<uint32_t>(info[5]).ToChecked();

  glVertexAttribPointer(index, size, type, normalized, stride, reinterpret_cast<GLvoid *>(offset));
}

GL_METHOD(ActiveTexture) {
  GL_BOILERPLATE;

  glActiveTexture(Nan::To<int32_t>(info[0]).ToChecked());
}

GL_METHOD(DrawElements) {
  GL_BOILERPLATE;

  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLint count = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[2]).ToChecked();
  size_t offset = Nan::To<uint32_t>(info[3]).ToChecked();

  glDrawElements(mode, count, type, reinterpret_cast<GLvoid *>(offset));
  RENDERDOC_COUNTER();
}

GL_METHOD(Flush) {
  GL_BOILERPLATE;

  glFlush();
}

GL_METHOD(Finish) {
  GL_BOILERPLATE;

  glFinish();
}

GL_METHOD(VertexAttrib1f) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());

  glVertexAttrib1f(index, x);
}

GL_METHOD(VertexAttrib2f) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat y = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());

  glVertexAttrib2f(index, x, y);
}

GL_METHOD(VertexAttrib3f) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat y = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());
  GLfloat z = static_cast<GLfloat>(Nan::To<double>(info[3]).ToChecked());

  glVertexAttrib3f(index, x, y, z);
}

GL_METHOD(VertexAttrib4f) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<int32_t>(info[0]).ToChecked();
  GLfloat x = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());
  GLfloat y = static_cast<GLfloat>(Nan::To<double>(info[2]).ToChecked());
  GLfloat z = static_cast<GLfloat>(Nan::To<double>(info[3]).ToChecked());
  GLfloat w = static_cast<GLfloat>(Nan::To<double>(info[4]).ToChecked());

  glVertexAttrib4f(index, x, y, z, w);
}

GL_METHOD(BlendColor) {
  GL_BOILERPLATE;

  GLclampf r = static_cast<GLclampf>(Nan::To<double>(info[0]).ToChecked());
  GLclampf g = static_cast<GLclampf>(Nan::To<double>(info[1]).ToChecked());
  GLclampf b = static_cast<GLclampf>(Nan::To<double>(info[2]).ToChecked());
  GLclampf a = static_cast<GLclampf>(Nan::To<double>(info[3]).ToChecked());

  glBlendColor(r, g, b, a);
}

GL_METHOD(BlendEquationSeparate) {
  GL_BOILERPLATE;

  GLenum mode_rgb = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum mode_alpha = Nan::To<int32_t>(info[1]).ToChecked();

  glBlendEquationSeparate(mode_rgb, mode_alpha);
}

GL_METHOD(BlendFuncSeparate) {
  GL_BOILERPLATE;

  GLenum src_rgb = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum dst_rgb = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum src_alpha = Nan::To<int32_t>(info[2]).ToChecked();
  GLenum dst_alpha = Nan::To<int32_t>(info[3]).ToChecked();

  glBlendFuncSeparate(src_rgb, dst_rgb, src_alpha, dst_alpha);
}

GL_METHOD(ClearStencil) {
  GL_BOILERPLATE;

  GLint s = Nan::To<int32_t>(info[0]).ToChecked();

  glClearStencil(s);
}

GL_METHOD(ColorMask) {
  GL_BOILERPLATE;

  GLboolean r = (Nan::To<bool>(info[0]).ToChecked());
  GLboolean g = (Nan::To<bool>(info[1]).ToChecked());
  GLboolean b = (Nan::To<bool>(info[2]).ToChecked());
  GLboolean a = (Nan::To<bool>(info[3]).ToChecked());

  glColorMask(r, g, b, a);
}

GL_METHOD(CopyTexImage2D) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLint x = Nan::To<int32_t>(info[3]).ToChecked();
  GLint y = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[5]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[6]).ToChecked();
  GLint border = Nan::To<int32_t>(info[7]).ToChecked();

  glCopyTexImage2D(target, level, internalformat, x, y, width, height, border);
}

GL_METHOD(CopyTexSubImage2D) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLint xoffset = Nan::To<int32_t>(info[2]).ToChecked();
  GLint yoffset = Nan::To<int32_t>(info[3]).ToChecked();
  GLint x = Nan::To<int32_t>(info[4]).ToChecked();
  GLint y = Nan::To<int32_t>(info[5]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[6]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[7]).ToChecked();

  glCopyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height);
}

GL_METHOD(CullFace) {
  GL_BOILERPLATE;

  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();

  glCullFace(mode);
}

GL_METHOD(DepthMask) {
  GL_BOILERPLATE;

  GLboolean flag = (Nan::To<bool>(info[0]).ToChecked());

  glDepthMask(flag);
}

GL_METHOD(DepthRange) {
  GL_BOILERPLATE;

  GLclampf zNear = static_cast<GLclampf>(Nan::To<double>(info[0]).ToChecked());
  GLclampf zFar = static_cast<GLclampf>(Nan::To<double>(info[1]).ToChecked());

  glDepthRangef(zNear, zFar);
}

GL_METHOD(DisableVertexAttribArray) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<int32_t>(info[0]).ToChecked();

  glDisableVertexAttribArray(index);
}

GL_METHOD(Hint) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum mode = Nan::To<int32_t>(info[1]).ToChecked();

  glHint(target, mode);
}

GL_METHOD(IsEnabled) {
  GL_BOILERPLATE;

  GLenum cap = Nan::To<int32_t>(info[0]).ToChecked();
  bool ret = glIsEnabled(cap) != 0;

  info.GetReturnValue().Set(Nan::New<v8::Boolean>(ret));
}

GL_METHOD(LineWidth) {
  GL_BOILERPLATE;

  GLfloat width = (GLfloat)(Nan::To<double>(info[0]).ToChecked());

  glLineWidth(width);
}

GL_METHOD(PolygonOffset) {
  GL_BOILERPLATE;

  GLfloat factor = static_cast<GLfloat>(Nan::To<double>(info[0]).ToChecked());
  GLfloat units = static_cast<GLfloat>(Nan::To<double>(info[1]).ToChecked());

  glPolygonOffset(factor, units);
}

GL_METHOD(SampleCoverage) {
  GL_BOILERPLATE;

  GLclampf value = static_cast<GLclampf>(Nan::To<double>(info[0]).ToChecked());
  GLboolean invert = (Nan::To<bool>(info[1]).ToChecked());

  glSampleCoverage(value, invert);
}

GL_METHOD(Scissor) {
  GL_BOILERPLATE;

  GLint x = Nan::To<int32_t>(info[0]).ToChecked();
  GLint y = Nan::To<int32_t>(info[1]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[3]).ToChecked();

  glScissor(x, y, width, height);
}

GL_METHOD(StencilFunc) {
  GL_BOILERPLATE;

  GLenum func = Nan::To<int32_t>(info[0]).ToChecked();
  GLint ref = Nan::To<int32_t>(info[1]).ToChecked();
  GLuint mask = Nan::To<uint32_t>(info[2]).ToChecked();

  glStencilFunc(func, ref, mask);
}

GL_METHOD(StencilFuncSeparate) {
  GL_BOILERPLATE;

  GLenum face = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum func = Nan::To<int32_t>(info[1]).ToChecked();
  GLint ref = Nan::To<int32_t>(info[2]).ToChecked();
  GLuint mask = Nan::To<uint32_t>(info[3]).ToChecked();

  glStencilFuncSeparate(face, func, ref, mask);
}

GL_METHOD(StencilMask) {
  GL_BOILERPLATE;

  GLuint mask = Nan::To<uint32_t>(info[0]).ToChecked();

  glStencilMask(mask);
}

GL_METHOD(StencilMaskSeparate) {
  GL_BOILERPLATE;

  GLenum face = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint mask = Nan::To<uint32_t>(info[1]).ToChecked();

  glStencilMaskSeparate(face, mask);
}

GL_METHOD(StencilOp) {
  GL_BOILERPLATE;

  GLenum fail = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum zfail = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum zpass = Nan::To<int32_t>(info[2]).ToChecked();

  glStencilOp(fail, zfail, zpass);
}

GL_METHOD(StencilOpSeparate) {
  GL_BOILERPLATE;

  GLenum face = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum fail = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum zfail = Nan::To<int32_t>(info[2]).ToChecked();
  GLenum zpass = Nan::To<int32_t>(info[3]).ToChecked();

  glStencilOpSeparate(face, fail, zfail, zpass);
}

GL_METHOD(BindRenderbuffer) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint buffer = Nan::To<uint32_t>(info[1]).ToChecked();

  glBindRenderbuffer(target, buffer);
}

GL_METHOD(CreateRenderbuffer) {
  GL_BOILERPLATE;

  GLuint renderbuffers;
  glGenRenderbuffers(1, &renderbuffers);

  inst->registerGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffers);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(renderbuffers));
}

GL_METHOD(DeleteBuffer) {
  GL_BOILERPLATE;

  GLuint buffer = (GLuint)Nan::To<uint32_t>(info[0]).ToChecked();

  inst->unregisterGLObj(GLOBJECT_TYPE_BUFFER, buffer);

  glDeleteBuffers(1, &buffer);
}

GL_METHOD(DeleteFramebuffer) {
  GL_BOILERPLATE;

  GLuint buffer = Nan::To<uint32_t>(info[0]).ToChecked();

  inst->unregisterGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);

  glDeleteFramebuffers(1, &buffer);
}

GL_METHOD(DeleteProgram) {
  GL_BOILERPLATE;

  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();

  inst->unregisterGLObj(GLOBJECT_TYPE_PROGRAM, program);

  glDeleteProgram(program);
}

GL_METHOD(DeleteRenderbuffer) {
  GL_BOILERPLATE;

  GLuint renderbuffer = Nan::To<uint32_t>(info[0]).ToChecked();

  inst->unregisterGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffer);

  glDeleteRenderbuffers(1, &renderbuffer);
}

GL_METHOD(DeleteShader) {
  GL_BOILERPLATE;

  GLuint shader = Nan::To<uint32_t>(info[0]).ToChecked();

  inst->unregisterGLObj(GLOBJECT_TYPE_SHADER, shader);

  glDeleteShader(shader);
}

GL_METHOD(DeleteTexture) {
  GL_BOILERPLATE;

  GLuint texture = Nan::To<uint32_t>(info[0]).ToChecked();

  inst->unregisterGLObj(GLOBJECT_TYPE_TEXTURE, texture);

  glDeleteTextures(1, &texture);
}

GL_METHOD(DetachShader) {
  GL_BOILERPLATE;

  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint shader = Nan::To<uint32_t>(info[1]).ToChecked();

  glDetachShader(program, shader);
}

GL_METHOD(FramebufferRenderbuffer) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum attachment = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum renderbuffertarget = Nan::To<int32_t>(info[2]).ToChecked();
  GLuint renderbuffer = Nan::To<uint32_t>(info[3]).ToChecked();

  glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer);
}

GL_METHOD(GetVertexAttribOffset) {
  GL_BOILERPLATE;

  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();

  void *ret = NULL;
  glGetVertexAttribPointerv(index, pname, &ret);

  GLuint offset = static_cast<GLuint>(reinterpret_cast<size_t>(ret));
  info.GetReturnValue().Set(Nan::New<v8::Integer>(offset));
}

GL_METHOD(IsBuffer) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsBuffer(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(IsFramebuffer) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsFramebuffer(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(IsProgram) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsProgram(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(IsRenderbuffer) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsRenderbuffer(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(IsShader) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsShader(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(IsTexture) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsTexture(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(RenderbufferStorage) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[1]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[3]).ToChecked();

  // In WebGL, we map GL_DEPTH_STENCIL to GL_DEPTH24_STENCIL8
  if (internalformat == GL_DEPTH_STENCIL_OES) {
    internalformat = GL_DEPTH24_STENCIL8_OES;
  } else if (internalformat == GL_DEPTH_COMPONENT32_OES) {
    internalformat = inst->preferredDepth;
  }

  glRenderbufferStorage(target, internalformat, width, height);
}

GL_METHOD(GetShaderSource) {
  GL_BOILERPLATE;

  GLint shader = Nan::To<int32_t>(info[0]).ToChecked();

  GLint len;
  glGetShaderiv(shader, GL_SHADER_SOURCE_LENGTH, &len);

  GLchar *source = new GLchar[len];
  glGetShaderSource(shader, len, NULL, source);
  v8::Local<v8::String> str = Nan::New<v8::String>(source).ToLocalChecked();
  delete[] source;

  info.GetReturnValue().Set(str);
}

GL_METHOD(ReadPixels) {
  GL_BOILERPLATE;

  GLint x = Nan::To<int32_t>(info[0]).ToChecked();
  GLint y = Nan::To<int32_t>(info[1]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[3]).ToChecked();
  GLenum format = Nan::To<int32_t>(info[4]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[5]).ToChecked();
  Nan::TypedArrayContents<char> pixels(info[6]);

  glReadPixels(x, y, width, height, format, type, *pixels);
}

GL_METHOD(GetTexParameter) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();

  if (pname == GL_TEXTURE_MAX_ANISOTROPY_EXT) {
    GLfloat param_value = 0;
    glGetTexParameterfv(target, pname, &param_value);
    info.GetReturnValue().Set(Nan::New<v8::Number>(param_value));
  } else {
    GLint param_value = 0;
    glGetTexParameteriv(target, pname, &param_value);
    info.GetReturnValue().Set(Nan::New<v8::Integer>(param_value));
  }
}

GL_METHOD(GetActiveAttrib) {
  GL_BOILERPLATE;

  GLuint program = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint index = Nan::To<int32_t>(info[1]).ToChecked();

  GLint maxLength;
  glGetProgramiv(program, GL_ACTIVE_ATTRIBUTE_MAX_LENGTH, &maxLength);

  char *name = new char[maxLength];
  GLsizei length = 0;
  GLenum type;
  GLsizei size;
  glGetActiveAttrib(program, index, maxLength, &length, &size, &type, name);

  if (length > 0) {
    v8::Local<v8::Object> activeInfo = Nan::New<v8::Object>();
    Nan::Set(activeInfo, Nan::New<v8::String>("size").ToLocalChecked(),
             Nan::New<v8::Integer>(size));
    Nan::Set(activeInfo, Nan::New<v8::String>("type").ToLocalChecked(),
             Nan::New<v8::Integer>(type));
    Nan::Set(activeInfo, Nan::New<v8::String>("name").ToLocalChecked(),
             Nan::New<v8::String>(name).ToLocalChecked());
    info.GetReturnValue().Set(activeInfo);
  } else {
    info.GetReturnValue().SetNull();
  }

  delete[] name;
}

GL_METHOD(GetActiveUniform) {
  GL_BOILERPLATE;

  GLuint program = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint index = Nan::To<int32_t>(info[1]).ToChecked();

  GLint maxLength;
  glGetProgramiv(program, GL_ACTIVE_UNIFORM_MAX_LENGTH, &maxLength);

  char *name = new char[maxLength];
  GLsizei length = 0;
  GLenum type;
  GLsizei size;
  glGetActiveUniform(program, index, maxLength, &length, &size, &type, name);

  if (length > 0) {
    v8::Local<v8::Object> activeInfo = Nan::New<v8::Object>();
    Nan::Set(activeInfo, Nan::New<v8::String>("size").ToLocalChecked(),
             Nan::New<v8::Integer>(size));
    Nan::Set(activeInfo, Nan::New<v8::String>("type").ToLocalChecked(),
             Nan::New<v8::Integer>(type));
    Nan::Set(activeInfo, Nan::New<v8::String>("name").ToLocalChecked(),
             Nan::New<v8::String>(name).ToLocalChecked());
    info.GetReturnValue().Set(activeInfo);
  } else {
    info.GetReturnValue().SetNull();
  }

  delete[] name;
}

GL_METHOD(GetAttachedShaders) {
  GL_BOILERPLATE;

  GLuint program = Nan::To<int32_t>(info[0]).ToChecked();

  GLint numAttachedShaders;
  glGetProgramiv(program, GL_ATTACHED_SHADERS, &numAttachedShaders);

  GLuint *shaders = new GLuint[numAttachedShaders];
  GLsizei count;
  glGetAttachedShaders(program, numAttachedShaders, &count, shaders);

  v8::Local<v8::Array> shadersArr = Nan::New<v8::Array>(count);
  for (int i = 0; i < count; i++) {
    Nan::Set(shadersArr, i, Nan::New<v8::Integer>((int)shaders[i]));
  }

  info.GetReturnValue().Set(shadersArr);

  delete[] shaders;
}

template <typename T>
void ReturnParamValueOrNull(Nan::NAN_METHOD_ARGS_TYPE info, v8::Local<T> value,
                            GLsizei bytesWritten) {
  if (bytesWritten > 0) {
    info.GetReturnValue().Set(value);
  } else {
    info.GetReturnValue().Set(Nan::Null());
  }
}

GL_METHOD(GetParameter) {
  GL_BOILERPLATE;
  GLenum name = Nan::To<int32_t>(info[0]).ToChecked();

  GLsizei bytesWritten = 0;

  switch (name) {
  case 0x9240 /* UNPACK_FLIP_Y_WEBGL */:
    info.GetReturnValue().Set(Nan::New<v8::Boolean>(inst->unpack_flip_y));
    return;

  case 0x9241 /* UNPACK_PREMULTIPLY_ALPHA_WEBGL*/:
    info.GetReturnValue().Set(Nan::New<v8::Boolean>(inst->unpack_premultiply_alpha));
    return;

  case 0x9243 /* UNPACK_COLORSPACE_CONVERSION_WEBGL */:
    info.GetReturnValue().Set(Nan::New<v8::Integer>(inst->unpack_colorspace_conversion));
    return;

  case GL_BLEND:
  case GL_CULL_FACE:
  case GL_DEPTH_TEST:
  case GL_DEPTH_WRITEMASK:
  case GL_DITHER:
  case GL_POLYGON_OFFSET_FILL:
  case GL_SAMPLE_COVERAGE_INVERT:
  case GL_SCISSOR_TEST:
  case GL_STENCIL_TEST: {
    GLboolean params = GL_FALSE;
    glGetBooleanvRobustANGLE(name, sizeof(GLboolean), &bytesWritten, &params);

    ReturnParamValueOrNull(info, Nan::New<v8::Boolean>(params != 0), bytesWritten);

    return;
  }

  case GL_DEPTH_CLEAR_VALUE:
  case GL_LINE_WIDTH:
  case GL_POLYGON_OFFSET_FACTOR:
  case GL_POLYGON_OFFSET_UNITS:
  case GL_SAMPLE_COVERAGE_VALUE:
  case GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT: {
    GLfloat params = 0;
    glGetFloatvRobustANGLE(name, sizeof(GLfloat), &bytesWritten, &params);

    ReturnParamValueOrNull(info, Nan::New<v8::Number>(params), bytesWritten);

    return;
  }

  case GL_RENDERER:
  case GL_SHADING_LANGUAGE_VERSION:
  case GL_VENDOR:
  case GL_VERSION:
  case GL_EXTENSIONS: {
    const char *params = reinterpret_cast<const char *>(glGetString(name));
    if (params) {
      info.GetReturnValue().Set(Nan::New<v8::String>(params).ToLocalChecked());
    }
    return;
  }

  case GL_MAX_VIEWPORT_DIMS: {
    GLint params[2] = {};
    glGetIntegervRobustANGLE(name, sizeof(GLint) * 2, &bytesWritten, params);

    v8::Local<v8::Array> arr = Nan::New<v8::Array>(2);
    Nan::Set(arr, 0, Nan::New<v8::Integer>(params[0]));
    Nan::Set(arr, 1, Nan::New<v8::Integer>(params[1]));
    ReturnParamValueOrNull(info, arr, bytesWritten);

    return;
  }

  case GL_SCISSOR_BOX:
  case GL_VIEWPORT: {
    GLint params[4] = {};
    glGetIntegervRobustANGLE(name, sizeof(GLint) * 4, &bytesWritten, params);

    v8::Local<v8::Array> arr = Nan::New<v8::Array>(4);
    Nan::Set(arr, 0, Nan::New<v8::Integer>(params[0]));
    Nan::Set(arr, 1, Nan::New<v8::Integer>(params[1]));
    Nan::Set(arr, 2, Nan::New<v8::Integer>(params[2]));
    Nan::Set(arr, 3, Nan::New<v8::Integer>(params[3]));
    ReturnParamValueOrNull(info, arr, bytesWritten);

    return;
  }

  case GL_ALIASED_LINE_WIDTH_RANGE:
  case GL_ALIASED_POINT_SIZE_RANGE:
  case GL_DEPTH_RANGE: {
    GLfloat params[2] = {};
    glGetFloatvRobustANGLE(name, sizeof(GLfloat) * 2, &bytesWritten, params);

    v8::Local<v8::Array> arr = Nan::New<v8::Array>(2);
    Nan::Set(arr, 0, Nan::New<v8::Number>(params[0]));
    Nan::Set(arr, 1, Nan::New<v8::Number>(params[1]));
    ReturnParamValueOrNull(info, arr, bytesWritten);

    return;
  }

  case GL_BLEND_COLOR:
  case GL_COLOR_CLEAR_VALUE: {
    GLfloat params[4] = {};
    glGetFloatvRobustANGLE(name, sizeof(GLfloat) * 4, &bytesWritten, params);

    v8::Local<v8::Array> arr = Nan::New<v8::Array>(4);
    Nan::Set(arr, 0, Nan::New<v8::Number>(params[0]));
    Nan::Set(arr, 1, Nan::New<v8::Number>(params[1]));
    Nan::Set(arr, 2, Nan::New<v8::Number>(params[2]));
    Nan::Set(arr, 3, Nan::New<v8::Number>(params[3]));
    ReturnParamValueOrNull(info, arr, bytesWritten);

    return;
  }

  case GL_COLOR_WRITEMASK: {
    GLboolean params[4] = {};
    glGetBooleanvRobustANGLE(name, sizeof(GLboolean) * 4, &bytesWritten, params);

    v8::Local<v8::Array> arr = Nan::New<v8::Array>(4);
    Nan::Set(arr, 0, Nan::New<v8::Boolean>(params[0] == GL_TRUE));
    Nan::Set(arr, 1, Nan::New<v8::Boolean>(params[1] == GL_TRUE));
    Nan::Set(arr, 2, Nan::New<v8::Boolean>(params[2] == GL_TRUE));
    Nan::Set(arr, 3, Nan::New<v8::Boolean>(params[3] == GL_TRUE));
    ReturnParamValueOrNull(info, arr, bytesWritten);

    return;
  }

  default: {
    GLint params = 0;
    glGetIntegervRobustANGLE(name, sizeof(GLint), &bytesWritten, &params);
    ReturnParamValueOrNull(info, Nan::New<v8::Integer>(params), bytesWritten);
    return;
  }
  }
}

GL_METHOD(GetBufferParameter) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();

  GLint params;
  glGetBufferParameteriv(target, pname, &params);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(params));
}

GL_METHOD(GetFramebufferAttachmentParameter) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum attachment = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[2]).ToChecked();

  GLint params = 0;
  glGetFramebufferAttachmentParameteriv(target, attachment, pname, &params);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(params));
}

GL_METHOD(GetProgramInfoLog) {
  GL_BOILERPLATE;

  GLuint program = Nan::To<int32_t>(info[0]).ToChecked();

  GLint infoLogLength;
  glGetProgramiv(program, GL_INFO_LOG_LENGTH, &infoLogLength);

  char *error = new char[infoLogLength + 1];
  glGetProgramInfoLog(program, infoLogLength + 1, &infoLogLength, error);

  info.GetReturnValue().Set(Nan::New<v8::String>(error).ToLocalChecked());

  delete[] error;
}

GL_METHOD(GetShaderPrecisionFormat) {
  GL_BOILERPLATE;

  GLenum shaderType = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum precisionType = Nan::To<int32_t>(info[1]).ToChecked();

  GLint range[2];
  GLint precision;

  glGetShaderPrecisionFormat(shaderType, precisionType, range, &precision);

  v8::Local<v8::Object> result = Nan::New<v8::Object>();
  Nan::Set(result, Nan::New<v8::String>("rangeMin").ToLocalChecked(),
           Nan::New<v8::Integer>(range[0]));
  Nan::Set(result, Nan::New<v8::String>("rangeMax").ToLocalChecked(),
           Nan::New<v8::Integer>(range[1]));
  Nan::Set(result, Nan::New<v8::String>("precision").ToLocalChecked(),
           Nan::New<v8::Integer>(precision));

  info.GetReturnValue().Set(result);
}

GL_METHOD(GetRenderbufferParameter) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();

  int value;
  glGetRenderbufferParameteriv(target, pname, &value);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
}

GL_METHOD(GetUniform) {
  GL_BOILERPLATE;

  GLint program = Nan::To<int32_t>(info[0]).ToChecked();
  GLint location = Nan::To<int32_t>(info[1]).ToChecked();

  float data[16];
  glGetUniformfv(program, location, data);

  v8::Local<v8::Array> arr = Nan::New<v8::Array>(16);
  for (int i = 0; i < 16; i++) {
    Nan::Set(arr, i, Nan::New<v8::Number>(data[i]));
  }

  info.GetReturnValue().Set(arr);
}

GL_METHOD(GetVertexAttrib) {
  GL_BOILERPLATE;

  GLint index = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();

  GLint value;

  switch (pname) {
  case GL_VERTEX_ATTRIB_ARRAY_ENABLED:
  case GL_VERTEX_ATTRIB_ARRAY_NORMALIZED: {
    glGetVertexAttribiv(index, pname, &value);
    info.GetReturnValue().Set(Nan::New<v8::Boolean>(value != 0));
    return;
  }

  case GL_VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE:
    if (inst->enabledExtensions.count("GL_ANGLE_instanced_arrays") == 0) {
      break;
    }

  case GL_VERTEX_ATTRIB_ARRAY_SIZE:
  case GL_VERTEX_ATTRIB_ARRAY_STRIDE:
  case GL_VERTEX_ATTRIB_ARRAY_TYPE:
  case GL_VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: {
    glGetVertexAttribiv(index, pname, &value);
    info.GetReturnValue().Set(Nan::New<v8::Integer>(value));
    return;
  }

  case GL_CURRENT_VERTEX_ATTRIB: {
    float vextex_attribs[4];

    glGetVertexAttribfv(index, pname, vextex_attribs);

    v8::Local<v8::Array> arr = Nan::New<v8::Array>(4);
    Nan::Set(arr, 0, Nan::New<v8::Number>(vextex_attribs[0]));
    Nan::Set(arr, 1, Nan::New<v8::Number>(vextex_attribs[1]));
    Nan::Set(arr, 2, Nan::New<v8::Number>(vextex_attribs[2]));
    Nan::Set(arr, 3, Nan::New<v8::Number>(vextex_attribs[3]));
    info.GetReturnValue().Set(arr);
    return;
  }

  default:
    break;
  }

  inst->setError(GL_INVALID_ENUM);
  info.GetReturnValue().SetNull();
}

GL_METHOD(GetSupportedExtensions) {
  GL_BOILERPLATE;

  std::string extensions = JoinStringSet(inst->supportedWebGLExtensions);

  v8::Local<v8::String> exts = Nan::New<v8::String>(extensions).ToLocalChecked();

  info.GetReturnValue().Set(exts);
}

GL_METHOD(GetExtension) {
  GL_BOILERPLATE;

  Nan::Utf8String name(info[0]);

  auto extsIter = inst->webGLToANGLEExtensions.find(*name);
  if (extsIter == inst->webGLToANGLEExtensions.end()) {
    printf("Warning: no record of ANGLE exts for WebGL extension: %s\n", *name);
  } else {
    for (const std::string &ext : extsIter->second) {
      if (inst->requestableExtensions.count(ext.c_str()) == 0) {
        printf("Warning: could not enable ANGLE extension: %s\n", ext.c_str());
      } else if (inst->enabledExtensions.count(ext.c_str()) == 0) {
        glRequestExtensionANGLE(ext.c_str());
        const char *extensionsString = (const char *)glGetString(GL_EXTENSIONS);
        inst->enabledExtensions = GetStringSetFromCString(extensionsString);
      }
    }
  }
}

GL_METHOD(CheckFramebufferStatus) {
  GL_BOILERPLATE;

  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();

  info.GetReturnValue().Set(
      Nan::New<v8::Integer>(static_cast<int>(glCheckFramebufferStatus(target))));
}

GL_METHOD(DrawBuffersWEBGL) {
  GL_BOILERPLATE;

  v8::Local<v8::Array> buffersArray = v8::Local<v8::Array>::Cast(info[0]);
  GLuint numBuffers = buffersArray->Length();
  GLenum *buffers = new GLenum[numBuffers];

  for (GLuint i = 0; i < numBuffers; i++) {
    buffers[i] = Nan::Get(buffersArray, i)
                     .ToLocalChecked()
                     ->Uint32Value(Nan::GetCurrentContext())
                     .ToChecked();
  }

  glDrawBuffersEXT(numBuffers, buffers);

  delete[] buffers;
}

GL_METHOD(EXTWEBGL_draw_buffers) {
  v8::Local<v8::Object> result = Nan::New<v8::Object>();
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT0_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT0_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT1_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT1_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT2_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT2_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT3_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT3_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT4_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT4_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT5_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT5_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT6_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT6_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT7_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT7_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT8_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT8_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT9_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT9_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT10_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT10_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT11_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT11_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT12_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT12_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT13_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT13_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT14_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT14_EXT));
  Nan::Set(result, Nan::New("COLOR_ATTACHMENT15_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_COLOR_ATTACHMENT15_EXT));

  Nan::Set(result, Nan::New("DRAW_BUFFER0_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER0_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER1_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER1_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER2_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER2_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER3_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER3_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER4_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER4_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER5_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER5_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER6_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER6_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER7_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER7_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER8_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER8_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER9_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER9_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER10_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER10_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER11_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER11_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER12_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER12_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER13_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER13_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER14_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER14_EXT));
  Nan::Set(result, Nan::New("DRAW_BUFFER15_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_DRAW_BUFFER15_EXT));

  Nan::Set(result, Nan::New("MAX_COLOR_ATTACHMENTS_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_MAX_COLOR_ATTACHMENTS_EXT));
  Nan::Set(result, Nan::New("MAX_DRAW_BUFFERS_WEBGL").ToLocalChecked(),
           Nan::New<v8::Number>(GL_MAX_DRAW_BUFFERS_EXT));

  info.GetReturnValue().Set(result);
}

GL_METHOD(BindVertexArrayOES) {
  GL_BOILERPLATE;

  GLuint array = Nan::To<uint32_t>(info[0]).ToChecked();

  glBindVertexArrayOES(array);
}

GL_METHOD(CreateVertexArrayOES) {
  GL_BOILERPLATE;

  GLuint array = 0;
  glGenVertexArraysOES(1, &array);
  inst->registerGLObj(GLOBJECT_TYPE_VERTEX_ARRAY, array);

  info.GetReturnValue().Set(Nan::New<v8::Integer>(array));
}

GL_METHOD(DeleteVertexArrayOES) {
  GL_BOILERPLATE;

  GLuint array = Nan::To<uint32_t>(info[0]).ToChecked();
  inst->unregisterGLObj(GLOBJECT_TYPE_VERTEX_ARRAY, array);

  glDeleteVertexArraysOES(1, &array);
}

GL_METHOD(IsVertexArrayOES) {
  GL_BOILERPLATE;

  info.GetReturnValue().Set(
      Nan::New<v8::Boolean>(glIsVertexArrayOES(Nan::To<uint32_t>(info[0]).ToChecked()) != 0));
}

GL_METHOD(CopyBufferSubData) {
  GL_BOILERPLATE;
  GLenum readTarget = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum writeTarget = Nan::To<int32_t>(info[1]).ToChecked();
  GLintptr readOffset = Nan::To<int64_t>(info[2]).ToChecked();
  GLintptr writeOffset = Nan::To<int64_t>(info[3]).ToChecked();
  GLsizeiptr size = Nan::To<int64_t>(info[4]).ToChecked();
  glCopyBufferSubData(readTarget, writeTarget, readOffset, writeOffset, size);
}

GL_METHOD(GetBufferSubData) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLintptr srcByteOffset = Nan::To<int64_t>(info[1]).ToChecked();
  auto buffer = info[2].As<v8::ArrayBufferView>();
  void *bufferPtr = buffer->Buffer()->GetBackingStore()->Data();
  GLsizeiptr bufferSize = buffer->ByteLength();
  // TODO:  glGetBufferSubData(target, srcByteOffset, bufferSize, bufferPtr);
}

GL_METHOD(BlitFramebuffer) {
  GL_BOILERPLATE;
  GLint srcX0 = Nan::To<int32_t>(info[0]).ToChecked();
  GLint srcY0 = Nan::To<int32_t>(info[1]).ToChecked();
  GLint srcX1 = Nan::To<int32_t>(info[2]).ToChecked();
  GLint srcY1 = Nan::To<int32_t>(info[3]).ToChecked();
  GLint dstX0 = Nan::To<int32_t>(info[4]).ToChecked();
  GLint dstY0 = Nan::To<int32_t>(info[5]).ToChecked();
  GLint dstX1 = Nan::To<int32_t>(info[6]).ToChecked();
  GLint dstY1 = Nan::To<int32_t>(info[7]).ToChecked();
  GLbitfield mask = Nan::To<uint32_t>(info[8]).ToChecked();
  GLenum filter = Nan::To<int32_t>(info[9]).ToChecked();
  glBlitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
}

GL_METHOD(FramebufferTextureLayer) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum attachment = Nan::To<int32_t>(info[1]).ToChecked();
  GLuint texture = Nan::To<uint32_t>(info[2]).ToChecked();
  GLint level = Nan::To<int32_t>(info[3]).ToChecked();
  GLint layer = Nan::To<int32_t>(info[4]).ToChecked();
  glFramebufferTextureLayer(target, attachment, texture, level, layer);
}

GL_METHOD(InvalidateFramebuffer) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  auto attachments = info[1].As<v8::Array>();
  GLsizei count = attachments->Length();
  GLenum *attachmentList = new GLenum[count];
  for (GLsizei i = 0; i < count; i++)
    attachmentList[i] = Nan::To<int32_t>(Nan::Get(attachments, i).ToLocalChecked()).ToChecked();
  glInvalidateFramebuffer(target, count, attachmentList);
  delete[] attachmentList;
}

GL_METHOD(InvalidateSubFramebuffer) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  auto attachments = info[1].As<v8::Array>();
  GLsizei count = attachments->Length();
  GLenum *attachmentList = new GLenum[count];
  for (GLsizei i = 0; i < count; i++)
    attachmentList[i] = Nan::To<int32_t>(Nan::Get(attachments, i).ToLocalChecked()).ToChecked();
  GLint x = Nan::To<int32_t>(info[2]).ToChecked();
  GLint y = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[5]).ToChecked();
  glInvalidateSubFramebuffer(target, count, attachmentList, x, y, width, height);
  delete[] attachmentList;
}

GL_METHOD(ReadBuffer) {
  GL_BOILERPLATE;
  GLenum src = OverrideDrawBufferEnum(Nan::To<int32_t>(info[0]).ToChecked());
  glReadBuffer(src);
}

GL_METHOD(GetInternalformatParameter) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[2]).ToChecked();
  GLint result;
  glGetInternalformativ(target, internalformat, pname, 1, &result);
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(RenderbufferStorageMultisample) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLsizei samples = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[4]).ToChecked();
  glRenderbufferStorageMultisample(target, samples, internalformat, width, height);
}

GL_METHOD(TexStorage2D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLsizei levels = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[4]).ToChecked();
  glTexStorage2D(target, levels, internalformat, width, height);
}

GL_METHOD(TexStorage3D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLsizei levels = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei depth = Nan::To<int32_t>(info[5]).ToChecked();
  glTexStorage3D(target, levels, internalformat, width, height, depth);
}

GL_METHOD(TexImage3D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLint internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei depth = Nan::To<int32_t>(info[5]).ToChecked();
  GLint border = Nan::To<int32_t>(info[6]).ToChecked();
  GLenum format = Nan::To<int32_t>(info[7]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[8]).ToChecked();

  if (info[9]->IsUndefined()) {
    glTexImage3D(target, level, internalformat, width, height, depth, border, format, type,
                 nullptr);
  } else if (info[9]->IsArrayBufferView()) {
    auto buffer = info[9].As<v8::ArrayBufferView>();
    void *bufferPtr = buffer->Buffer()->GetBackingStore()->Data();
    glTexImage3D(target, level, internalformat, width, height, depth, border, format, type,
                 bufferPtr);
  } else {
    Nan::ThrowTypeError("Invalid data type for TexImage3D");
  }
}

GL_METHOD(TexSubImage3D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLint xoffset = Nan::To<int32_t>(info[2]).ToChecked();
  GLint yoffset = Nan::To<int32_t>(info[3]).ToChecked();
  GLint zoffset = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[5]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[6]).ToChecked();
  GLsizei depth = Nan::To<int32_t>(info[7]).ToChecked();
  GLenum format = Nan::To<int32_t>(info[8]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[9]).ToChecked();
  Nan::TypedArrayContents<unsigned char> pixels(info[10]);

  glTexSubImage3DRobustANGLE(target, level, xoffset, yoffset, zoffset, width, height, depth, format,
                             type, pixels.length(), *pixels);
}

GL_METHOD(CopyTexSubImage3D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLint xoffset = Nan::To<int32_t>(info[2]).ToChecked();
  GLint yoffset = Nan::To<int32_t>(info[3]).ToChecked();
  GLint zoffset = Nan::To<int32_t>(info[4]).ToChecked();
  GLint x = Nan::To<int32_t>(info[5]).ToChecked();
  GLint y = Nan::To<int32_t>(info[6]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[7]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[8]).ToChecked();
  glCopyTexSubImage3D(target, level, xoffset, yoffset, zoffset, x, y, width, height);
}

GL_METHOD(CompressedTexImage3D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum internalformat = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[3]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei depth = Nan::To<int32_t>(info[5]).ToChecked();
  GLint border = Nan::To<int32_t>(info[6]).ToChecked();
  GLsizei imageSize = Nan::To<int32_t>(info[7]).ToChecked();
  if (info[8]->IsUndefined()) {
    glCompressedTexImage3D(target, level, internalformat, width, height, depth, border, imageSize,
                           nullptr);
  } else if (info[8]->IsArrayBufferView()) {
    auto buffer = info[8].As<v8::ArrayBufferView>();
    void *bufferPtr = buffer->Buffer()->GetBackingStore()->Data();
    glCompressedTexImage3D(target, level, internalformat, width, height, depth, border, imageSize,
                           bufferPtr);
  } else {
    Nan::ThrowTypeError("Invalid data type for CompressedTexImage3D");
  }
}

GL_METHOD(CompressedTexSubImage3D) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLint level = Nan::To<int32_t>(info[1]).ToChecked();
  GLint xoffset = Nan::To<int32_t>(info[2]).ToChecked();
  GLint yoffset = Nan::To<int32_t>(info[3]).ToChecked();
  GLint zoffset = Nan::To<int32_t>(info[4]).ToChecked();
  GLsizei width = Nan::To<int32_t>(info[5]).ToChecked();
  GLsizei height = Nan::To<int32_t>(info[6]).ToChecked();
  GLsizei depth = Nan::To<int32_t>(info[7]).ToChecked();
  GLenum format = Nan::To<int32_t>(info[8]).ToChecked();
  GLsizei imageSize = Nan::To<int32_t>(info[9]).ToChecked();
  if (info[10]->IsUndefined()) {
    glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth,
                              format, imageSize, nullptr);
  } else if (info[10]->IsArrayBufferView()) {
    auto buffer = info[10].As<v8::ArrayBufferView>();
    void *bufferPtr = buffer->Buffer()->GetBackingStore()->Data();
    glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth,
                              format, imageSize, bufferPtr);
  } else {
    Nan::ThrowTypeError("Invalid data type for CompressedTexSubImage3D");
  }
}

GL_METHOD(GetFragDataLocation) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  Nan::Utf8String name(info[1]);
  GLint location = glGetFragDataLocation(program, *name);
  info.GetReturnValue().Set(Nan::New(location));
}

GL_METHOD(Uniform1ui) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint v0 = Nan::To<uint32_t>(info[1]).ToChecked();
  glUniform1ui(location, v0);
}

GL_METHOD(Uniform2ui) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint v0 = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint v1 = Nan::To<uint32_t>(info[2]).ToChecked();
  glUniform2ui(location, v0, v1);
}

GL_METHOD(Uniform3ui) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint v0 = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint v1 = Nan::To<uint32_t>(info[2]).ToChecked();
  GLuint v2 = Nan::To<uint32_t>(info[3]).ToChecked();
  glUniform3ui(location, v0, v1, v2);
}

GL_METHOD(Uniform4ui) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint v0 = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint v1 = Nan::To<uint32_t>(info[2]).ToChecked();
  GLuint v2 = Nan::To<uint32_t>(info[3]).ToChecked();
  GLuint v3 = Nan::To<uint32_t>(info[4]).ToChecked();
  glUniform4ui(location, v0, v1, v2, v3);
}

GL_METHOD(Uniform1uiv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  auto data = info[1].As<v8::ArrayBufferView>();
  GLuint *bufferPtr = static_cast<GLuint *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / sizeof(GLuint);
  glUniform1uiv(location, count, bufferPtr);
}

GL_METHOD(Uniform2uiv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  auto data = info[1].As<v8::ArrayBufferView>();
  GLuint *bufferPtr = static_cast<GLuint *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (2 * sizeof(GLuint));
  glUniform2uiv(location, count, bufferPtr);
}

GL_METHOD(Uniform3uiv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  auto data = info[1].As<v8::ArrayBufferView>();
  GLuint *bufferPtr = static_cast<GLuint *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (3 * sizeof(GLuint));
  glUniform3uiv(location, count, bufferPtr);
}

GL_METHOD(Uniform4uiv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  auto data = info[1].As<v8::ArrayBufferView>();
  GLuint *bufferPtr = static_cast<GLuint *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (4 * sizeof(GLuint));
  glUniform4uiv(location, count, bufferPtr);
}

GL_METHOD(UniformMatrix3x2fv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean transpose = Nan::To<bool>(info[1]).ToChecked();
  auto data = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (6 * sizeof(GLfloat));
  glUniformMatrix3x2fv(location, count, transpose, bufferPtr);
}

GL_METHOD(UniformMatrix4x2fv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean transpose = Nan::To<bool>(info[1]).ToChecked();
  auto data = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (8 * sizeof(GLfloat));
  glUniformMatrix4x2fv(location, count, transpose, bufferPtr);
}

GL_METHOD(UniformMatrix2x3fv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean transpose = Nan::To<bool>(info[1]).ToChecked();
  auto data = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (6 * sizeof(GLfloat));
  glUniformMatrix2x3fv(location, count, transpose, bufferPtr);
}

GL_METHOD(UniformMatrix4x3fv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean transpose = Nan::To<bool>(info[1]).ToChecked();
  auto data = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (12 * sizeof(GLfloat));
  glUniformMatrix4x3fv(location, count, transpose, bufferPtr);
}

GL_METHOD(UniformMatrix2x4fv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean transpose = Nan::To<bool>(info[1]).ToChecked();
  auto data = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (8 * sizeof(GLfloat));
  glUniformMatrix2x4fv(location, count, transpose, bufferPtr);
}

GL_METHOD(UniformMatrix3x4fv) {
  GL_BOILERPLATE;
  GLuint location = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean transpose = Nan::To<bool>(info[1]).ToChecked();
  auto data = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(data->Buffer()->GetBackingStore()->Data());
  GLsizei count = data->ByteLength() / (12 * sizeof(GLfloat));
  glUniformMatrix3x4fv(location, count, transpose, bufferPtr);
}

GL_METHOD(VertexAttribI4i) {
  GL_BOILERPLATE;
  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  GLint x = Nan::To<int32_t>(info[1]).ToChecked();
  GLint y = Nan::To<int32_t>(info[2]).ToChecked();
  GLint z = Nan::To<int32_t>(info[3]).ToChecked();
  GLint w = Nan::To<int32_t>(info[4]).ToChecked();
  glVertexAttribI4i(index, x, y, z, w);
}

GL_METHOD(VertexAttribI4iv) {
  GL_BOILERPLATE;
  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  auto values = info[1].As<v8::ArrayBufferView>();
  GLint *bufferPtr = static_cast<GLint *>(values->Buffer()->GetBackingStore()->Data());
  glVertexAttribI4iv(index, bufferPtr);
}

GL_METHOD(VertexAttribI4ui) {
  GL_BOILERPLATE;
  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint x = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint y = Nan::To<uint32_t>(info[2]).ToChecked();
  GLuint z = Nan::To<uint32_t>(info[3]).ToChecked();
  GLuint w = Nan::To<uint32_t>(info[4]).ToChecked();
  glVertexAttribI4ui(index, x, y, z, w);
}

GL_METHOD(VertexAttribI4uiv) {
  GL_BOILERPLATE;
  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  auto values = info[1].As<v8::ArrayBufferView>();
  GLuint *bufferPtr = static_cast<GLuint *>(values->Buffer()->GetBackingStore()->Data());
  glVertexAttribI4uiv(index, bufferPtr);
}

GL_METHOD(VertexAttribIPointer) {
  GL_BOILERPLATE;
  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  GLint size = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei stride = Nan::To<int32_t>(info[3]).ToChecked();
  GLintptr offset = Nan::To<int64_t>(info[4]).ToChecked();
  glVertexAttribIPointer(index, size, type, stride, reinterpret_cast<const void *>(offset));
}

GL_METHOD(VertexAttribDivisor) {
  GL_BOILERPLATE;
  GLuint index = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint divisor = Nan::To<uint32_t>(info[1]).ToChecked();
  glVertexAttribDivisor(index, divisor);
}

GL_METHOD(DrawArraysInstanced) {
  GL_BOILERPLATE;
  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLint first = Nan::To<int32_t>(info[1]).ToChecked();
  GLsizei count = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei instanceCount = Nan::To<int32_t>(info[3]).ToChecked();
  glDrawArraysInstanced(mode, first, count, instanceCount);
  RENDERDOC_COUNTER();
}

GL_METHOD(DrawElementsInstanced) {
  GL_BOILERPLATE;
  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLsizei count = Nan::To<int32_t>(info[1]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[2]).ToChecked();
  GLintptr offset = Nan::To<int64_t>(info[3]).ToChecked();
  GLsizei instanceCount = Nan::To<int32_t>(info[4]).ToChecked();
  glDrawElementsInstanced(mode, count, type, reinterpret_cast<const void *>(offset), instanceCount);
  RENDERDOC_COUNTER();
}

GL_METHOD(DrawRangeElements) {
  GL_BOILERPLATE;
  GLenum mode = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint start = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint end = Nan::To<uint32_t>(info[2]).ToChecked();
  GLsizei count = Nan::To<int32_t>(info[3]).ToChecked();
  GLenum type = Nan::To<int32_t>(info[4]).ToChecked();
  GLintptr offset = Nan::To<int64_t>(info[5]).ToChecked();
  glDrawRangeElements(mode, start, end, count, type, reinterpret_cast<const void *>(offset));
  RENDERDOC_COUNTER();
}

GL_METHOD(DrawBuffers) {
  GL_BOILERPLATE;
  auto buffers = info[0].As<v8::Array>();
  GLsizei count = buffers->Length();
  GLenum *bufferList = new GLenum[count];
  for (GLsizei i = 0; i < count; i++) {
    GLenum buffer = Nan::To<int32_t>(Nan::Get(buffers, i).ToLocalChecked()).ToChecked();
    bufferList[i] = OverrideDrawBufferEnum(buffer);
  }
  glDrawBuffers(count, bufferList);
  delete[] bufferList;
}

GL_METHOD(ClearBufferfv) {
  GL_BOILERPLATE;
  GLenum buffer = Nan::To<int32_t>(info[0]).ToChecked();
  GLint drawbuffer = Nan::To<int32_t>(info[1]).ToChecked();
  auto values = info[2].As<v8::ArrayBufferView>();
  GLfloat *bufferPtr = static_cast<GLfloat *>(values->Buffer()->GetBackingStore()->Data());
  glClearBufferfv(buffer, drawbuffer, bufferPtr);
}

GL_METHOD(ClearBufferiv) {
  GL_BOILERPLATE;
  GLenum buffer = Nan::To<int32_t>(info[0]).ToChecked();
  GLint drawbuffer = Nan::To<int32_t>(info[1]).ToChecked();
  auto values = info[2].As<v8::ArrayBufferView>();
  GLint *bufferPtr = static_cast<GLint *>(values->Buffer()->GetBackingStore()->Data());
  glClearBufferiv(buffer, drawbuffer, bufferPtr);
}

GL_METHOD(ClearBufferuiv) {
  GL_BOILERPLATE;
  GLenum buffer = Nan::To<int32_t>(info[0]).ToChecked();
  GLint drawbuffer = Nan::To<int32_t>(info[1]).ToChecked();
  auto values = info[2].As<v8::ArrayBufferView>();
  GLuint *bufferPtr = static_cast<GLuint *>(values->Buffer()->GetBackingStore()->Data());
  glClearBufferuiv(buffer, drawbuffer, bufferPtr);
}

GL_METHOD(ClearBufferfi) {
  GL_BOILERPLATE;
  GLenum buffer = Nan::To<int32_t>(info[0]).ToChecked();
  GLint drawbuffer = Nan::To<int32_t>(info[1]).ToChecked();
  GLfloat depth = Nan::To<double>(info[2]).ToChecked();
  GLint stencil = Nan::To<int32_t>(info[3]).ToChecked();
  glClearBufferfi(buffer, drawbuffer, depth, stencil);
}

GL_METHOD(CreateQuery) {
  GL_BOILERPLATE;
  GLuint query;
  glGenQueries(1, &query);
  info.GetReturnValue().Set(Nan::New(query));
}

GL_METHOD(DeleteQuery) {
  GL_BOILERPLATE;
  GLuint query = Nan::To<uint32_t>(info[0]).ToChecked();
  glDeleteQueries(1, &query);
}

GL_METHOD(IsQuery) {
  GL_BOILERPLATE;
  GLuint query = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean result = glIsQuery(query);
  info.GetReturnValue().Set(Nan::New(result != GL_FALSE));
}

GL_METHOD(BeginQuery) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint query = Nan::To<uint32_t>(info[1]).ToChecked();
  glBeginQuery(target, query);
}

GL_METHOD(EndQuery) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  glEndQuery(target);
}

GL_METHOD(GetQuery) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLuint result;
  glGetQueryiv(target, pname, reinterpret_cast<GLint *>(&result));
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(GetQueryParameter) {
  GL_BOILERPLATE;
  GLuint query = Nan::To<uint32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLuint result;
  glGetQueryObjectuiv(query, pname, &result);
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(CreateSampler) {
  GL_BOILERPLATE;
  GLuint sampler;
  glGenSamplers(1, &sampler);
  info.GetReturnValue().Set(Nan::New(sampler));
}

GL_METHOD(DeleteSampler) {
  GL_BOILERPLATE;
  GLuint sampler = Nan::To<uint32_t>(info[0]).ToChecked();
  glDeleteSamplers(1, &sampler);
}

GL_METHOD(IsSampler) {
  GL_BOILERPLATE;
  GLuint sampler = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean result = glIsSampler(sampler);
  info.GetReturnValue().Set(Nan::New(result != GL_FALSE));
}

GL_METHOD(BindSampler) {
  GL_BOILERPLATE;
  GLuint unit = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint sampler = Nan::To<uint32_t>(info[1]).ToChecked();
  glBindSampler(unit, sampler);
}

GL_METHOD(SamplerParameteri) {
  GL_BOILERPLATE;
  GLuint sampler = Nan::To<uint32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLint param = Nan::To<int32_t>(info[2]).ToChecked();
  glSamplerParameteri(sampler, pname, param);
}

GL_METHOD(SamplerParameterf) {
  GL_BOILERPLATE;
  GLuint sampler = Nan::To<uint32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLfloat param = Nan::To<double>(info[2]).ToChecked();
  glSamplerParameterf(sampler, pname, param);
}

GL_METHOD(GetSamplerParameter) {
  GL_BOILERPLATE;
  GLuint sampler = Nan::To<uint32_t>(info[0]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLint result;
  glGetSamplerParameteriv(sampler, pname, &result);
  info.GetReturnValue().Set(Nan::New(result));
}

// ANGLE internally stores GLsync values as integer handles, so this is safe on ANGLE.
GLsync IntToSync(uint32_t intValue) {
  return reinterpret_cast<GLsync>(static_cast<uintptr_t>(intValue));
}

uint32_t SyncToInt(GLsync sync) { return static_cast<uint32_t>(reinterpret_cast<uintptr_t>(sync)); }

GL_METHOD(FenceSync) {
  GL_BOILERPLATE;
  GLenum condition = Nan::To<int32_t>(info[0]).ToChecked();
  GLbitfield flags = Nan::To<uint32_t>(info[1]).ToChecked();
  GLsync sync = glFenceSync(condition, flags);
  info.GetReturnValue().Set(Nan::New(SyncToInt(sync)));
}

GL_METHOD(IsSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(Nan::To<uint32_t>(info[0]).ToChecked());
  GLboolean result = glIsSync(sync);
  info.GetReturnValue().Set(Nan::New(result != GL_FALSE));
}

GL_METHOD(DeleteSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(Nan::To<uint32_t>(info[0]).ToChecked());
  glDeleteSync(sync);
}

GL_METHOD(ClientWaitSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(Nan::To<uint32_t>(info[0]).ToChecked());
  GLbitfield flags = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint64 timeout = Nan::To<int64_t>(info[2]).ToChecked();
  GLenum result = glClientWaitSync(sync, flags, timeout);
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(WaitSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(Nan::To<uint32_t>(info[0]).ToChecked());
  GLbitfield flags = Nan::To<uint32_t>(info[1]).ToChecked();
  GLint64 timeout = Nan::To<int64_t>(info[2]).ToChecked();
  glWaitSync(sync, flags, timeout);
}

GL_METHOD(GetSyncParameter) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(Nan::To<uint32_t>(info[0]).ToChecked());
  GLenum pname = Nan::To<int32_t>(info[1]).ToChecked();
  GLint result;
  glGetSynciv(sync, pname, 1, nullptr, &result);
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(CreateTransformFeedback) {
  GL_BOILERPLATE;
  GLuint tf;
  glGenTransformFeedbacks(1, &tf);
  info.GetReturnValue().Set(Nan::New(tf));
}

GL_METHOD(DeleteTransformFeedback) {
  GL_BOILERPLATE;
  GLuint tf = Nan::To<uint32_t>(info[0]).ToChecked();
  glDeleteTransformFeedbacks(1, &tf);
}

GL_METHOD(IsTransformFeedback) {
  GL_BOILERPLATE;
  GLuint tf = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean result = glIsTransformFeedback(tf);
  info.GetReturnValue().Set(Nan::New(result != GL_FALSE));
}

GL_METHOD(BindTransformFeedback) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint tf = Nan::To<uint32_t>(info[1]).ToChecked();
  glBindTransformFeedback(target, tf);
}

GL_METHOD(BeginTransformFeedback) {
  GL_BOILERPLATE;
  GLenum primitiveMode = Nan::To<int32_t>(info[0]).ToChecked();
  glBeginTransformFeedback(primitiveMode);
}

GL_METHOD(EndTransformFeedback) {
  GL_BOILERPLATE;
  glEndTransformFeedback();
}

GL_METHOD(TransformFeedbackVaryings) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  auto varyings = info[1].As<v8::Array>();
  GLenum bufferMode = Nan::To<int32_t>(info[2]).ToChecked();
  GLsizei count = varyings->Length();
  const char **varyingStrings = new const char *[count];
  for (GLsizei i = 0; i < count; i++) {
    Nan::Utf8String str(Nan::Get(varyings, i).ToLocalChecked());
    varyingStrings[i] = *str;
  }
  glTransformFeedbackVaryings(program, count, varyingStrings, bufferMode);
  delete[] varyingStrings;
}

GL_METHOD(GetTransformFeedbackVarying) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint index = Nan::To<uint32_t>(info[1]).ToChecked();
  char name[256];
  GLsizei length;
  GLsizei size;
  GLenum type;
  glGetTransformFeedbackVarying(program, index, 256, &length, &size, &type, name);
  v8::Local<v8::Object> result = Nan::New<v8::Object>();
  Nan::Set(result, Nan::New("name").ToLocalChecked(), Nan::New(name).ToLocalChecked());
  Nan::Set(result, Nan::New("size").ToLocalChecked(), Nan::New(size));
  Nan::Set(result, Nan::New("type").ToLocalChecked(), Nan::New(type));
  info.GetReturnValue().Set(result);
}

GL_METHOD(PauseTransformFeedback) {
  GL_BOILERPLATE;
  glPauseTransformFeedback();
}

GL_METHOD(ResumeTransformFeedback) {
  GL_BOILERPLATE;
  glResumeTransformFeedback();
}

GL_METHOD(BindBufferBase) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint index = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint buffer = Nan::To<uint32_t>(info[2]).ToChecked();
  glBindBufferBase(target, index, buffer);
}

GL_METHOD(BindBufferRange) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint index = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint buffer = Nan::To<uint32_t>(info[2]).ToChecked();
  GLintptr offset = Nan::To<int64_t>(info[3]).ToChecked();
  GLsizeiptr size = Nan::To<int64_t>(info[4]).ToChecked();
  glBindBufferRange(target, index, buffer, offset, size);
}

GL_METHOD(GetIndexedParameter) {
  GL_BOILERPLATE;
  GLenum target = Nan::To<int32_t>(info[0]).ToChecked();
  GLuint index = Nan::To<uint32_t>(info[1]).ToChecked();
  GLint result;
  glGetIntegeri_v(target, index, &result);
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(GetUniformIndices) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  auto uniformNames = info[1].As<v8::Array>();
  GLsizei count = uniformNames->Length();
  const char **names = new const char *[count];
  for (GLsizei i = 0; i < count; i++) {
    Nan::Utf8String name(Nan::Get(uniformNames, i).ToLocalChecked());
    names[i] = *name;
  }
  GLuint *indices = new GLuint[count];
  glGetUniformIndices(program, count, names, indices);
  v8::Local<v8::Array> result = Nan::New<v8::Array>(count);
  for (GLsizei i = 0; i < count; i++) {
    Nan::Set(result, i, Nan::New(indices[i]));
  }
  info.GetReturnValue().Set(result);
  delete[] names;
  delete[] indices;
}

GL_METHOD(GetActiveUniforms) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  auto uniformIndices = info[1].As<v8::Array>();
  GLsizei count = uniformIndices->Length();
  GLuint *indices = new GLuint[count];
  for (GLsizei i = 0; i < count; i++) {
    indices[i] = Nan::To<uint32_t>(Nan::Get(uniformIndices, i).ToLocalChecked()).ToChecked();
  }
  GLenum pname = Nan::To<int32_t>(info[2]).ToChecked();
  GLint *params = new GLint[count];
  glGetActiveUniformsiv(program, count, indices, pname, params);
  v8::Local<v8::Array> result = Nan::New<v8::Array>(count);
  for (GLsizei i = 0; i < count; i++) {
    Nan::Set(result, i, Nan::New(params[i]));
  }
  info.GetReturnValue().Set(result);
  delete[] indices;
  delete[] params;
}

GL_METHOD(GetUniformBlockIndex) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  Nan::Utf8String blockName(info[1]);
  GLuint index = glGetUniformBlockIndex(program, *blockName);
  info.GetReturnValue().Set(Nan::New(index));
}

GL_METHOD(GetActiveUniformBlockParameter) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint uniformBlockIndex = Nan::To<uint32_t>(info[1]).ToChecked();
  GLenum pname = Nan::To<int32_t>(info[2]).ToChecked();
  GLint result;
  glGetActiveUniformBlockiv(program, uniformBlockIndex, pname, &result);
  info.GetReturnValue().Set(Nan::New(result));
}

GL_METHOD(GetActiveUniformBlockName) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint uniformBlockIndex = Nan::To<uint32_t>(info[1]).ToChecked();
  char name[256];
  GLsizei length;
  glGetActiveUniformBlockName(program, uniformBlockIndex, 256, &length, name);
  info.GetReturnValue().Set(Nan::New(name).ToLocalChecked());
}

GL_METHOD(UniformBlockBinding) {
  GL_BOILERPLATE;
  GLuint program = Nan::To<uint32_t>(info[0]).ToChecked();
  GLuint uniformBlockIndex = Nan::To<uint32_t>(info[1]).ToChecked();
  GLuint uniformBlockBinding = Nan::To<uint32_t>(info[2]).ToChecked();
  glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding);
}

GL_METHOD(CreateVertexArray) {
  GL_BOILERPLATE;
  GLuint vao;
  glGenVertexArrays(1, &vao);
  info.GetReturnValue().Set(Nan::New(vao));
}

GL_METHOD(DeleteVertexArray) {
  GL_BOILERPLATE;
  GLuint vao = Nan::To<uint32_t>(info[0]).ToChecked();
  glDeleteVertexArrays(1, &vao);
}

GL_METHOD(IsVertexArray) {
  GL_BOILERPLATE;
  GLuint vao = Nan::To<uint32_t>(info[0]).ToChecked();
  GLboolean result = glIsVertexArray(vao);
  info.GetReturnValue().Set(Nan::New(result != GL_FALSE));
}

GL_METHOD(BindVertexArray) {
  GL_BOILERPLATE;
  GLuint vao = Nan::To<uint32_t>(info[0]).ToChecked();
  glBindVertexArray(vao);
}
