#include <array>
#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>

#include "webgl.h"

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

bool WebGLRenderingContext::HAS_DISPLAY = false;
EGLDisplay WebGLRenderingContext::DISPLAY;
WebGLRenderingContext *WebGLRenderingContext::ACTIVE = NULL;
WebGLRenderingContext *WebGLRenderingContext::CONTEXT_LIST_HEAD = NULL;

#define GL_METHOD(method_name) \
  Napi::Value WebGLRenderingContext::method_name(const Napi::CallbackInfo& info)

#define GL_BOILERPLATE                                                                             \
  Napi::Env env = info.Env();                                                                      \
  WebGLRenderingContext *inst = this;                                                              \
  if (!(inst && inst->setActive())) {                                                              \
    Napi::Error::New(env, "Invalid GL context").ThrowAsJavaScriptException();                      \
    return env.Undefined();                                                                        \
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

WebGLRenderingContext::WebGLRenderingContext(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<WebGLRenderingContext>(info),
      state(GLCONTEXT_STATE_INIT), unpack_flip_y(false), unpack_premultiply_alpha(false),
      unpack_colorspace_conversion(0x9244), unpack_alignment(4),
      webGLToANGLEExtensions(&CaseInsensitiveCompare), next(NULL), prev(NULL) {
  Napi::Env env = info.Env();
  if (info.Length() < 11) {
    // Called with no args (e.g. from wrapContext) — create an empty shell, no GL context.
    return;
  }
  bool createWebGL2Context = info[10].As<Napi::Boolean>().Value();
  _initContext(
      info[0].As<Napi::Number>().Int32Value(),
      info[1].As<Napi::Number>().Int32Value(),
      info[2].As<Napi::Boolean>().Value(),
      info[3].As<Napi::Boolean>().Value(),
      info[4].As<Napi::Boolean>().Value(),
      info[5].As<Napi::Boolean>().Value(),
      info[6].As<Napi::Boolean>().Value(),
      info[7].As<Napi::Boolean>().Value(),
      info[8].As<Napi::Boolean>().Value(),
      info[9].As<Napi::Boolean>().Value(),
      createWebGL2Context
  );
  if (state != GLCONTEXT_STATE_OK) {
    std::string err = "Error creating WebGLContext";
    if (!errorMessage.empty()) err += ": " + errorMessage;
    Napi::Error::New(env, err).ThrowAsJavaScriptException();
    return;
  }
  if (createWebGL2Context) {
    BindWebGL2(this->Value(), env);
  }
}

void WebGLRenderingContext::_initContext(int width, int height, bool alpha, bool depth,
                                         bool stencil, bool antialias, bool premultipliedAlpha,
                                         bool preserveDrawingBuffer,
                                         bool preferLowPowerToHighPerformance,
                                         bool failIfMajorPerformanceCaveat,
                                         bool createWebGL2Context) {
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
} // end _initContext

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
  eglDestroySurface(DISPLAY, surface);
  eglDestroyContext(DISPLAY, context);
}

WebGLRenderingContext::~WebGLRenderingContext() { dispose(); }

GL_METHOD(SetError) {
  GL_BOILERPLATE;
  inst->setError((GLenum)(info[0].As<Napi::Number>().Int32Value()));
  return env.Undefined();
}

Napi::Value WebGLRenderingContext::DisposeAll(const Napi::CallbackInfo& info) {
  while (CONTEXT_LIST_HEAD) {
    CONTEXT_LIST_HEAD->dispose();
  }
  if (WebGLRenderingContext::HAS_DISPLAY) {
    eglTerminate(WebGLRenderingContext::DISPLAY);
    WebGLRenderingContext::HAS_DISPLAY = false;
  }
  return info.Env().Undefined();
}

Napi::Function WebGLRenderingContext::GetClass(Napi::Env env) {
  return DefineClass(env, "WebGLRenderingContext", {
    InstanceMethod("_drawArraysInstancedANGLE", &WebGLRenderingContext::DrawArraysInstancedANGLE),
    InstanceMethod("_drawElementsInstancedANGLE", &WebGLRenderingContext::DrawElementsInstancedANGLE),
    InstanceMethod("_vertexAttribDivisorANGLE", &WebGLRenderingContext::VertexAttribDivisorANGLE),
    InstanceMethod("getUniform", &WebGLRenderingContext::GetUniform),
    InstanceMethod("uniform1f", &WebGLRenderingContext::Uniform1f),
    InstanceMethod("uniform2f", &WebGLRenderingContext::Uniform2f),
    InstanceMethod("uniform3f", &WebGLRenderingContext::Uniform3f),
    InstanceMethod("uniform4f", &WebGLRenderingContext::Uniform4f),
    InstanceMethod("uniform1i", &WebGLRenderingContext::Uniform1i),
    InstanceMethod("uniform2i", &WebGLRenderingContext::Uniform2i),
    InstanceMethod("uniform3i", &WebGLRenderingContext::Uniform3i),
    InstanceMethod("uniform4i", &WebGLRenderingContext::Uniform4i),
    InstanceMethod("pixelStorei", &WebGLRenderingContext::PixelStorei),
    InstanceMethod("bindAttribLocation", &WebGLRenderingContext::BindAttribLocation),
    InstanceMethod("getError", &WebGLRenderingContext::GetError),
    InstanceMethod("drawArrays", &WebGLRenderingContext::DrawArrays),
    InstanceMethod("uniformMatrix2fv", &WebGLRenderingContext::UniformMatrix2fv),
    InstanceMethod("uniformMatrix3fv", &WebGLRenderingContext::UniformMatrix3fv),
    InstanceMethod("uniformMatrix4fv", &WebGLRenderingContext::UniformMatrix4fv),
    InstanceMethod("generateMipmap", &WebGLRenderingContext::GenerateMipmap),
    InstanceMethod("getAttribLocation", &WebGLRenderingContext::GetAttribLocation),
    InstanceMethod("depthFunc", &WebGLRenderingContext::DepthFunc),
    InstanceMethod("viewport", &WebGLRenderingContext::Viewport),
    InstanceMethod("createShader", &WebGLRenderingContext::CreateShader),
    InstanceMethod("shaderSource", &WebGLRenderingContext::ShaderSource),
    InstanceMethod("compileShader", &WebGLRenderingContext::CompileShader),
    InstanceMethod("getShaderParameter", &WebGLRenderingContext::GetShaderParameter),
    InstanceMethod("getShaderInfoLog", &WebGLRenderingContext::GetShaderInfoLog),
    InstanceMethod("createProgram", &WebGLRenderingContext::CreateProgram),
    InstanceMethod("attachShader", &WebGLRenderingContext::AttachShader),
    InstanceMethod("linkProgram", &WebGLRenderingContext::LinkProgram),
    InstanceMethod("getProgramParameter", &WebGLRenderingContext::GetProgramParameter),
    InstanceMethod("getUniformLocation", &WebGLRenderingContext::GetUniformLocation),
    InstanceMethod("clearColor", &WebGLRenderingContext::ClearColor),
    InstanceMethod("clearDepth", &WebGLRenderingContext::ClearDepth),
    InstanceMethod("disable", &WebGLRenderingContext::Disable),
    InstanceMethod("enable", &WebGLRenderingContext::Enable),
    InstanceMethod("createTexture", &WebGLRenderingContext::CreateTexture),
    InstanceMethod("bindTexture", &WebGLRenderingContext::BindTexture),
    InstanceMethod("texImage2D", &WebGLRenderingContext::TexImage2D),
    InstanceMethod("texParameteri", &WebGLRenderingContext::TexParameteri),
    InstanceMethod("texParameterf", &WebGLRenderingContext::TexParameterf),
    InstanceMethod("clear", &WebGLRenderingContext::Clear),
    InstanceMethod("useProgram", &WebGLRenderingContext::UseProgram),
    InstanceMethod("createBuffer", &WebGLRenderingContext::CreateBuffer),
    InstanceMethod("bindBuffer", &WebGLRenderingContext::BindBuffer),
    InstanceMethod("createFramebuffer", &WebGLRenderingContext::CreateFramebuffer),
    InstanceMethod("bindFramebuffer", &WebGLRenderingContext::BindFramebuffer),
    InstanceMethod("framebufferTexture2D", &WebGLRenderingContext::FramebufferTexture2D),
    InstanceMethod("bufferData", &WebGLRenderingContext::BufferData),
    InstanceMethod("bufferSubData", &WebGLRenderingContext::BufferSubData),
    InstanceMethod("blendEquation", &WebGLRenderingContext::BlendEquation),
    InstanceMethod("blendFunc", &WebGLRenderingContext::BlendFunc),
    InstanceMethod("enableVertexAttribArray", &WebGLRenderingContext::EnableVertexAttribArray),
    InstanceMethod("vertexAttribPointer", &WebGLRenderingContext::VertexAttribPointer),
    InstanceMethod("activeTexture", &WebGLRenderingContext::ActiveTexture),
    InstanceMethod("drawElements", &WebGLRenderingContext::DrawElements),
    InstanceMethod("flush", &WebGLRenderingContext::Flush),
    InstanceMethod("finish", &WebGLRenderingContext::Finish),
    InstanceMethod("vertexAttrib1f", &WebGLRenderingContext::VertexAttrib1f),
    InstanceMethod("vertexAttrib2f", &WebGLRenderingContext::VertexAttrib2f),
    InstanceMethod("vertexAttrib3f", &WebGLRenderingContext::VertexAttrib3f),
    InstanceMethod("vertexAttrib4f", &WebGLRenderingContext::VertexAttrib4f),
    InstanceMethod("blendColor", &WebGLRenderingContext::BlendColor),
    InstanceMethod("blendEquationSeparate", &WebGLRenderingContext::BlendEquationSeparate),
    InstanceMethod("blendFuncSeparate", &WebGLRenderingContext::BlendFuncSeparate),
    InstanceMethod("clearStencil", &WebGLRenderingContext::ClearStencil),
    InstanceMethod("colorMask", &WebGLRenderingContext::ColorMask),
    InstanceMethod("copyTexImage2D", &WebGLRenderingContext::CopyTexImage2D),
    InstanceMethod("copyTexSubImage2D", &WebGLRenderingContext::CopyTexSubImage2D),
    InstanceMethod("cullFace", &WebGLRenderingContext::CullFace),
    InstanceMethod("depthMask", &WebGLRenderingContext::DepthMask),
    InstanceMethod("depthRange", &WebGLRenderingContext::DepthRange),
    InstanceMethod("hint", &WebGLRenderingContext::Hint),
    InstanceMethod("isEnabled", &WebGLRenderingContext::IsEnabled),
    InstanceMethod("lineWidth", &WebGLRenderingContext::LineWidth),
    InstanceMethod("polygonOffset", &WebGLRenderingContext::PolygonOffset),
    InstanceMethod("getShaderPrecisionFormat", &WebGLRenderingContext::GetShaderPrecisionFormat),
    InstanceMethod("stencilFunc", &WebGLRenderingContext::StencilFunc),
    InstanceMethod("stencilFuncSeparate", &WebGLRenderingContext::StencilFuncSeparate),
    InstanceMethod("stencilMask", &WebGLRenderingContext::StencilMask),
    InstanceMethod("stencilMaskSeparate", &WebGLRenderingContext::StencilMaskSeparate),
    InstanceMethod("stencilOp", &WebGLRenderingContext::StencilOp),
    InstanceMethod("stencilOpSeparate", &WebGLRenderingContext::StencilOpSeparate),
    InstanceMethod("scissor", &WebGLRenderingContext::Scissor),
    InstanceMethod("bindRenderbuffer", &WebGLRenderingContext::BindRenderbuffer),
    InstanceMethod("createRenderbuffer", &WebGLRenderingContext::CreateRenderbuffer),
    InstanceMethod("framebufferRenderbuffer", &WebGLRenderingContext::FramebufferRenderbuffer),
    InstanceMethod("deleteBuffer", &WebGLRenderingContext::DeleteBuffer),
    InstanceMethod("deleteFramebuffer", &WebGLRenderingContext::DeleteFramebuffer),
    InstanceMethod("deleteProgram", &WebGLRenderingContext::DeleteProgram),
    InstanceMethod("deleteRenderbuffer", &WebGLRenderingContext::DeleteRenderbuffer),
    InstanceMethod("deleteShader", &WebGLRenderingContext::DeleteShader),
    InstanceMethod("deleteTexture", &WebGLRenderingContext::DeleteTexture),
    InstanceMethod("detachShader", &WebGLRenderingContext::DetachShader),
    InstanceMethod("getVertexAttribOffset", &WebGLRenderingContext::GetVertexAttribOffset),
    InstanceMethod("disableVertexAttribArray", &WebGLRenderingContext::DisableVertexAttribArray),
    InstanceMethod("isBuffer", &WebGLRenderingContext::IsBuffer),
    InstanceMethod("isFramebuffer", &WebGLRenderingContext::IsFramebuffer),
    InstanceMethod("isProgram", &WebGLRenderingContext::IsProgram),
    InstanceMethod("isRenderbuffer", &WebGLRenderingContext::IsRenderbuffer),
    InstanceMethod("isShader", &WebGLRenderingContext::IsShader),
    InstanceMethod("isTexture", &WebGLRenderingContext::IsTexture),
    InstanceMethod("renderbufferStorage", &WebGLRenderingContext::RenderbufferStorage),
    InstanceMethod("getShaderSource", &WebGLRenderingContext::GetShaderSource),
    InstanceMethod("validateProgram", &WebGLRenderingContext::ValidateProgram),
    InstanceMethod("texSubImage2D", &WebGLRenderingContext::TexSubImage2D),
    InstanceMethod("readPixels", &WebGLRenderingContext::ReadPixels),
    InstanceMethod("getTexParameter", &WebGLRenderingContext::GetTexParameter),
    InstanceMethod("getActiveAttrib", &WebGLRenderingContext::GetActiveAttrib),
    InstanceMethod("getActiveUniform", &WebGLRenderingContext::GetActiveUniform),
    InstanceMethod("getAttachedShaders", &WebGLRenderingContext::GetAttachedShaders),
    InstanceMethod("getParameter", &WebGLRenderingContext::GetParameter),
    InstanceMethod("getBufferParameter", &WebGLRenderingContext::GetBufferParameter),
    InstanceMethod("getFramebufferAttachmentParameter", &WebGLRenderingContext::GetFramebufferAttachmentParameter),
    InstanceMethod("getProgramInfoLog", &WebGLRenderingContext::GetProgramInfoLog),
    InstanceMethod("getRenderbufferParameter", &WebGLRenderingContext::GetRenderbufferParameter),
    InstanceMethod("getVertexAttrib", &WebGLRenderingContext::GetVertexAttrib),
    InstanceMethod("getSupportedExtensions", &WebGLRenderingContext::GetSupportedExtensions),
    InstanceMethod("getExtension", &WebGLRenderingContext::GetExtension),
    InstanceMethod("checkFramebufferStatus", &WebGLRenderingContext::CheckFramebufferStatus),
    InstanceMethod("frontFace", &WebGLRenderingContext::FrontFace),
    InstanceMethod("sampleCoverage", &WebGLRenderingContext::SampleCoverage),
    InstanceMethod("drawBuffersWEBGL", &WebGLRenderingContext::DrawBuffersWEBGL),
    InstanceMethod("extWEBGL_draw_buffers", &WebGLRenderingContext::EXTWEBGL_draw_buffers),
    InstanceMethod("createVertexArrayOES", &WebGLRenderingContext::CreateVertexArrayOES),
    InstanceMethod("deleteVertexArrayOES", &WebGLRenderingContext::DeleteVertexArrayOES),
    InstanceMethod("isVertexArrayOES", &WebGLRenderingContext::IsVertexArrayOES),
    InstanceMethod("bindVertexArrayOES", &WebGLRenderingContext::BindVertexArrayOES),
    InstanceMethod("vertexAttribDivisor", &WebGLRenderingContext::VertexAttribDivisor),
    InstanceMethod("getFragDataLocation", &WebGLRenderingContext::GetFragDataLocation),
    InstanceMethod("destroy", &WebGLRenderingContext::Destroy),
    InstanceMethod("setError", &WebGLRenderingContext::SetError),
    // WebGL 2 methods
    InstanceMethod("uniform1ui", &WebGLRenderingContext::Uniform1ui),
    InstanceMethod("uniform2ui", &WebGLRenderingContext::Uniform2ui),
    InstanceMethod("uniform3ui", &WebGLRenderingContext::Uniform3ui),
    InstanceMethod("uniform4ui", &WebGLRenderingContext::Uniform4ui),
    InstanceMethod("uniform1uiv", &WebGLRenderingContext::Uniform1uiv),
    InstanceMethod("uniform2uiv", &WebGLRenderingContext::Uniform2uiv),
    InstanceMethod("uniform3uiv", &WebGLRenderingContext::Uniform3uiv),
    InstanceMethod("uniform4uiv", &WebGLRenderingContext::Uniform4uiv),
    InstanceMethod("uniformMatrix2x3fv", &WebGLRenderingContext::UniformMatrix2x3fv),
    InstanceMethod("uniformMatrix3x2fv", &WebGLRenderingContext::UniformMatrix3x2fv),
    InstanceMethod("uniformMatrix2x4fv", &WebGLRenderingContext::UniformMatrix2x4fv),
    InstanceMethod("uniformMatrix4x2fv", &WebGLRenderingContext::UniformMatrix4x2fv),
    InstanceMethod("uniformMatrix3x4fv", &WebGLRenderingContext::UniformMatrix3x4fv),
    InstanceMethod("uniformMatrix4x3fv", &WebGLRenderingContext::UniformMatrix4x3fv),
    InstanceMethod("vertexAttribI4i", &WebGLRenderingContext::VertexAttribI4i),
    InstanceMethod("vertexAttribI4ui", &WebGLRenderingContext::VertexAttribI4ui),
    InstanceMethod("vertexAttribI4iv", &WebGLRenderingContext::VertexAttribI4iv),
    InstanceMethod("vertexAttribI4uiv", &WebGLRenderingContext::VertexAttribI4uiv),
    InstanceMethod("vertexAttribIPointer", &WebGLRenderingContext::VertexAttribIPointer),
    InstanceMethod("drawArraysInstanced", &WebGLRenderingContext::DrawArraysInstanced),
    InstanceMethod("drawElementsInstanced", &WebGLRenderingContext::DrawElementsInstanced),
    InstanceMethod("drawRangeElements", &WebGLRenderingContext::DrawRangeElements),
    InstanceMethod("drawBuffers", &WebGLRenderingContext::DrawBuffers),
    InstanceMethod("clearBufferiv", &WebGLRenderingContext::ClearBufferiv),
    InstanceMethod("clearBufferuiv", &WebGLRenderingContext::ClearBufferuiv),
    InstanceMethod("clearBufferfv", &WebGLRenderingContext::ClearBufferfv),
    InstanceMethod("clearBufferfi", &WebGLRenderingContext::ClearBufferfi),
    InstanceMethod("createQuery", &WebGLRenderingContext::CreateQuery),
    InstanceMethod("deleteQuery", &WebGLRenderingContext::DeleteQuery),
    InstanceMethod("isQuery", &WebGLRenderingContext::IsQuery),
    InstanceMethod("beginQuery", &WebGLRenderingContext::BeginQuery),
    InstanceMethod("endQuery", &WebGLRenderingContext::EndQuery),
    InstanceMethod("getQuery", &WebGLRenderingContext::GetQuery),
    InstanceMethod("getQueryParameter", &WebGLRenderingContext::GetQueryParameter),
    InstanceMethod("createSampler", &WebGLRenderingContext::CreateSampler),
    InstanceMethod("deleteSampler", &WebGLRenderingContext::DeleteSampler),
    InstanceMethod("isSampler", &WebGLRenderingContext::IsSampler),
    InstanceMethod("bindSampler", &WebGLRenderingContext::BindSampler),
    InstanceMethod("samplerParameteri", &WebGLRenderingContext::SamplerParameteri),
    InstanceMethod("samplerParameterf", &WebGLRenderingContext::SamplerParameterf),
    InstanceMethod("getSamplerParameter", &WebGLRenderingContext::GetSamplerParameter),
    InstanceMethod("fenceSync", &WebGLRenderingContext::FenceSync),
    InstanceMethod("isSync", &WebGLRenderingContext::IsSync),
    InstanceMethod("deleteSync", &WebGLRenderingContext::DeleteSync),
    InstanceMethod("clientWaitSync", &WebGLRenderingContext::ClientWaitSync),
    InstanceMethod("waitSync", &WebGLRenderingContext::WaitSync),
    InstanceMethod("getSyncParameter", &WebGLRenderingContext::GetSyncParameter),
    InstanceMethod("createTransformFeedback", &WebGLRenderingContext::CreateTransformFeedback),
    InstanceMethod("deleteTransformFeedback", &WebGLRenderingContext::DeleteTransformFeedback),
    InstanceMethod("isTransformFeedback", &WebGLRenderingContext::IsTransformFeedback),
    InstanceMethod("bindTransformFeedback", &WebGLRenderingContext::BindTransformFeedback),
    InstanceMethod("beginTransformFeedback", &WebGLRenderingContext::BeginTransformFeedback),
    InstanceMethod("endTransformFeedback", &WebGLRenderingContext::EndTransformFeedback),
    InstanceMethod("transformFeedbackVaryings", &WebGLRenderingContext::TransformFeedbackVaryings),
    InstanceMethod("getTransformFeedbackVarying", &WebGLRenderingContext::GetTransformFeedbackVarying),
    InstanceMethod("pauseTransformFeedback", &WebGLRenderingContext::PauseTransformFeedback),
    InstanceMethod("resumeTransformFeedback", &WebGLRenderingContext::ResumeTransformFeedback),
    InstanceMethod("bindBufferBase", &WebGLRenderingContext::BindBufferBase),
    InstanceMethod("bindBufferRange", &WebGLRenderingContext::BindBufferRange),
    InstanceMethod("getIndexedParameter", &WebGLRenderingContext::GetIndexedParameter),
    InstanceMethod("getUniformIndices", &WebGLRenderingContext::GetUniformIndices),
    InstanceMethod("getActiveUniforms", &WebGLRenderingContext::GetActiveUniforms),
    InstanceMethod("getUniformBlockIndex", &WebGLRenderingContext::GetUniformBlockIndex),
    InstanceMethod("getActiveUniformBlockParameter", &WebGLRenderingContext::GetActiveUniformBlockParameter),
    InstanceMethod("getActiveUniformBlockName", &WebGLRenderingContext::GetActiveUniformBlockName),
    InstanceMethod("uniformBlockBinding", &WebGLRenderingContext::UniformBlockBinding),
    InstanceMethod("createVertexArray", &WebGLRenderingContext::CreateVertexArray),
    InstanceMethod("deleteVertexArray", &WebGLRenderingContext::DeleteVertexArray),
    InstanceMethod("isVertexArray", &WebGLRenderingContext::IsVertexArray),
    InstanceMethod("bindVertexArray", &WebGLRenderingContext::BindVertexArray),
    InstanceMethod("copyBufferSubData", &WebGLRenderingContext::CopyBufferSubData),
    InstanceMethod("getBufferSubData", &WebGLRenderingContext::GetBufferSubData),
    InstanceMethod("blitFramebuffer", &WebGLRenderingContext::BlitFramebuffer),
    InstanceMethod("framebufferTextureLayer", &WebGLRenderingContext::FramebufferTextureLayer),
    InstanceMethod("invalidateFramebuffer", &WebGLRenderingContext::InvalidateFramebuffer),
    InstanceMethod("invalidateSubFramebuffer", &WebGLRenderingContext::InvalidateSubFramebuffer),
    InstanceMethod("readBuffer", &WebGLRenderingContext::ReadBuffer),
    InstanceMethod("getInternalformatParameter", &WebGLRenderingContext::GetInternalformatParameter),
    InstanceMethod("renderbufferStorageMultisample", &WebGLRenderingContext::RenderbufferStorageMultisample),
    InstanceMethod("texStorage2D", &WebGLRenderingContext::TexStorage2D),
    InstanceMethod("texStorage3D", &WebGLRenderingContext::TexStorage3D),
    InstanceMethod("texImage3D", &WebGLRenderingContext::TexImage3D),
    InstanceMethod("texSubImage3D", &WebGLRenderingContext::TexSubImage3D),
    InstanceMethod("copyTexSubImage3D", &WebGLRenderingContext::CopyTexSubImage3D),
    InstanceMethod("compressedTexImage3D", &WebGLRenderingContext::CompressedTexImage3D),
    InstanceMethod("compressedTexSubImage3D", &WebGLRenderingContext::CompressedTexSubImage3D),
  });
}

GL_METHOD(Destroy) {
  GL_BOILERPLATE

  inst->dispose();
  return env.Undefined();
}

GL_METHOD(Uniform1f) {
  GL_BOILERPLATE;

  int location = info[0].As<Napi::Number>().Int32Value();
  float x = (float)info[1].As<Napi::Number>().DoubleValue();

  glUniform1f(location, x);
  return env.Undefined();
}

GL_METHOD(Uniform2f) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat y = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());

  glUniform2f(location, x, y);
  return env.Undefined();
}

GL_METHOD(Uniform3f) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat y = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());
  GLfloat z = static_cast<GLfloat>(info[3].As<Napi::Number>().DoubleValue());

  glUniform3f(location, x, y, z);
  return env.Undefined();
}

GL_METHOD(Uniform4f) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat y = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());
  GLfloat z = static_cast<GLfloat>(info[3].As<Napi::Number>().DoubleValue());
  GLfloat w = static_cast<GLfloat>(info[4].As<Napi::Number>().DoubleValue());

  glUniform4f(location, x, y, z, w);
  return env.Undefined();
}

GL_METHOD(Uniform1i) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLint x = info[1].As<Napi::Number>().Int32Value();

  glUniform1i(location, x);
  return env.Undefined();
}

GL_METHOD(Uniform2i) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLint x = info[1].As<Napi::Number>().Int32Value();
  GLint y = info[2].As<Napi::Number>().Int32Value();

  glUniform2i(location, x, y);
  return env.Undefined();
}

GL_METHOD(Uniform3i) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLint x = info[1].As<Napi::Number>().Int32Value();
  GLint y = info[2].As<Napi::Number>().Int32Value();
  GLint z = info[3].As<Napi::Number>().Int32Value();

  glUniform3i(location, x, y, z);
  return env.Undefined();
}

GL_METHOD(Uniform4i) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLint x = info[1].As<Napi::Number>().Int32Value();
  GLint y = info[2].As<Napi::Number>().Int32Value();
  GLint z = info[3].As<Napi::Number>().Int32Value();
  GLint w = info[4].As<Napi::Number>().Int32Value();

  glUniform4i(location, x, y, z, w);
  return env.Undefined();
}

GL_METHOD(PixelStorei) {
  GL_BOILERPLATE;

  GLenum pname = info[0].As<Napi::Number>().Int32Value();
  GLenum param = info[1].As<Napi::Number>().Int32Value();

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
  return env.Undefined();
}

GL_METHOD(BindAttribLocation) {
  GL_BOILERPLATE;

  GLint program = info[0].As<Napi::Number>().Int32Value();
  GLint index = info[1].As<Napi::Number>().Int32Value();
  std::string name = info[2].As<Napi::String>().Utf8Value();

  glBindAttribLocation(program, index, name.c_str());
  return env.Undefined();
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
  return Napi::Number::New(env, inst->getError());
}

GL_METHOD(VertexAttribDivisorANGLE) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  GLuint divisor = info[1].As<Napi::Number>().Uint32Value();

  glVertexAttribDivisorANGLE(index, divisor);
  return env.Undefined();
}

GL_METHOD(DrawArraysInstancedANGLE) {
  GL_BOILERPLATE;

  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLint first = info[1].As<Napi::Number>().Int32Value();
  GLuint count = info[2].As<Napi::Number>().Uint32Value();
  GLuint icount = info[3].As<Napi::Number>().Uint32Value();

  glDrawArraysInstancedANGLE(mode, first, count, icount);
  return env.Undefined();
}

GL_METHOD(DrawElementsInstancedANGLE) {
  GL_BOILERPLATE;

  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLint count = info[1].As<Napi::Number>().Int32Value();
  GLenum type = info[2].As<Napi::Number>().Int32Value();
  GLint offset = info[3].As<Napi::Number>().Int32Value();
  GLuint icount = info[4].As<Napi::Number>().Uint32Value();

  glDrawElementsInstancedANGLE(mode, count, type,
                               reinterpret_cast<GLvoid *>(static_cast<uintptr_t>(offset)), icount);
  return env.Undefined();
}

GL_METHOD(DrawArrays) {
  GL_BOILERPLATE;

  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLint first = info[1].As<Napi::Number>().Int32Value();
  GLint count = info[2].As<Napi::Number>().Int32Value();

  glDrawArrays(mode, first, count);
  return env.Undefined();
}

GL_METHOD(UniformMatrix2fv) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLboolean transpose = (info[1].As<Napi::Boolean>().Value());
  auto _arr_data = info[2].As<Napi::TypedArray>();
  GLfloat* data = reinterpret_cast<GLfloat*>(
      static_cast<uint8_t*>(_arr_data.ArrayBuffer().Data()) + _arr_data.ByteOffset());
  size_t data_len = _arr_data.ElementLength();

  glUniformMatrix2fv(location, data_len / 4, transpose, data);
  return env.Undefined();
}

GL_METHOD(UniformMatrix3fv) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLboolean transpose = (info[1].As<Napi::Boolean>().Value());
  auto _arr_data = info[2].As<Napi::TypedArray>();
  GLfloat* data = reinterpret_cast<GLfloat*>(
      static_cast<uint8_t*>(_arr_data.ArrayBuffer().Data()) + _arr_data.ByteOffset());
  size_t data_len = _arr_data.ElementLength();

  glUniformMatrix3fv(location, data_len / 9, transpose, data);
  return env.Undefined();
}

GL_METHOD(UniformMatrix4fv) {
  GL_BOILERPLATE;

  GLint location = info[0].As<Napi::Number>().Int32Value();
  GLboolean transpose = (info[1].As<Napi::Boolean>().Value());
  auto _arr_data = info[2].As<Napi::TypedArray>();
  GLfloat* data = reinterpret_cast<GLfloat*>(
      static_cast<uint8_t*>(_arr_data.ArrayBuffer().Data()) + _arr_data.ByteOffset());
  size_t data_len = _arr_data.ElementLength();

  glUniformMatrix4fv(location, data_len / 16, transpose, data);
  return env.Undefined();
}

GL_METHOD(GenerateMipmap) {
  GL_BOILERPLATE;

  GLint target = info[0].As<Napi::Number>().Int32Value();
  glGenerateMipmap(target);
  return env.Undefined();
}

GL_METHOD(GetAttribLocation) {
  GL_BOILERPLATE;

  GLint program = info[0].As<Napi::Number>().Int32Value();
  std::string name = info[1].As<Napi::String>().Utf8Value();

  GLint result = glGetAttribLocation(program, name.c_str());

  return Napi::Number::New(env, result);
}

GL_METHOD(DepthFunc) {
  GL_BOILERPLATE;

  glDepthFunc(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(Viewport) {
  GL_BOILERPLATE;

  GLint x = info[0].As<Napi::Number>().Int32Value();
  GLint y = info[1].As<Napi::Number>().Int32Value();
  GLsizei width = info[2].As<Napi::Number>().Int32Value();
  GLsizei height = info[3].As<Napi::Number>().Int32Value();

  glViewport(x, y, width, height);
  return env.Undefined();
}

GL_METHOD(CreateShader) {
  GL_BOILERPLATE;

  GLuint shader = glCreateShader(info[0].As<Napi::Number>().Int32Value());
  inst->registerGLObj(GLOBJECT_TYPE_SHADER, shader);

  return Napi::Number::New(env, shader);
}

GL_METHOD(ShaderSource) {
  GL_BOILERPLATE;

  GLint id = info[0].As<Napi::Number>().Int32Value();
  std::string code = info[1].As<Napi::String>().Utf8Value();

  const char *codes[] = {code.c_str()};
  GLint length = code.length();

  glShaderSource(id, 1, codes, &length);
  return env.Undefined();
}

GL_METHOD(CompileShader) {
  GL_BOILERPLATE;

  glCompileShader(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(FrontFace) {
  GL_BOILERPLATE;

  glFrontFace(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(GetShaderParameter) {
  GL_BOILERPLATE;

  GLint shader = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();

  GLint value;
  glGetShaderiv(shader, pname, &value);

  return Napi::Number::New(env, value);
}

GL_METHOD(GetShaderInfoLog) {
  GL_BOILERPLATE;

  GLint id = info[0].As<Napi::Number>().Int32Value();

  GLint infoLogLength;
  glGetShaderiv(id, GL_INFO_LOG_LENGTH, &infoLogLength);

  char *error = new char[infoLogLength + 1];
  glGetShaderInfoLog(id, infoLogLength + 1, &infoLogLength, error);

  return Napi::String::New(env, error);

  delete[] error;
  return env.Undefined();
}

GL_METHOD(CreateProgram) {
  GL_BOILERPLATE;

  GLuint program = glCreateProgram();
  inst->registerGLObj(GLOBJECT_TYPE_PROGRAM, program);

  return Napi::Number::New(env, program);
}

GL_METHOD(AttachShader) {
  GL_BOILERPLATE;

  GLint program = info[0].As<Napi::Number>().Int32Value();
  GLint shader = info[1].As<Napi::Number>().Int32Value();

  glAttachShader(program, shader);
  return env.Undefined();
}

GL_METHOD(ValidateProgram) {
  GL_BOILERPLATE;

  glValidateProgram(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(LinkProgram) {
  GL_BOILERPLATE;

  glLinkProgram(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(GetProgramParameter) {
  GL_BOILERPLATE;

  GLint program = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = (GLenum)(info[1].As<Napi::Number>().Int32Value());
  GLint value = 0;

  glGetProgramiv(program, pname, &value);

  return Napi::Number::New(env, value);
}

GL_METHOD(GetUniformLocation) {
  GL_BOILERPLATE;

  GLint program = info[0].As<Napi::Number>().Int32Value();
  std::string name = info[1].As<Napi::String>().Utf8Value();

  return Napi::Number::New(env, glGetUniformLocation(program, name.c_str()));
}

GL_METHOD(ClearColor) {
  GL_BOILERPLATE;

  GLfloat red = static_cast<GLfloat>(info[0].As<Napi::Number>().DoubleValue());
  GLfloat green = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat blue = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());
  GLfloat alpha = static_cast<GLfloat>(info[3].As<Napi::Number>().DoubleValue());

  glClearColor(red, green, blue, alpha);
  return env.Undefined();
}

GL_METHOD(ClearDepth) {
  GL_BOILERPLATE;

  GLfloat depth = static_cast<GLfloat>(info[0].As<Napi::Number>().DoubleValue());

  glClearDepthf(depth);
  return env.Undefined();
}

// Two specific enums are accepted by ANGLE when they shouldn't be. This shows up
// for headless, but not browsers, because browsers do additional validation.
// The ANGLE fix is to make EXT_multisample_compatibility "enableable".
bool IsBuggedANGLECap(GLenum cap) { return cap == GL_MULTISAMPLE || cap == GL_SAMPLE_ALPHA_TO_ONE; }

GL_METHOD(Disable) {
  GL_BOILERPLATE;

  GLenum cap = info[0].As<Napi::Number>().Int32Value();

  if (IsBuggedANGLECap(cap)) {
    inst->setError(GL_INVALID_ENUM);
  } else {
    glDisable(cap);
  }
  return env.Undefined();
}

GL_METHOD(Enable) {
  GL_BOILERPLATE;

  GLenum cap = info[0].As<Napi::Number>().Int32Value();

  if (IsBuggedANGLECap(cap)) {
    inst->setError(GL_INVALID_ENUM);
  } else {
    glEnable(cap);
  }
  return env.Undefined();
}

GL_METHOD(CreateTexture) {
  GL_BOILERPLATE;

  GLuint texture = 0;
  glGenTextures(1, &texture);
  inst->registerGLObj(GLOBJECT_TYPE_TEXTURE, texture);

  return Napi::Number::New(env, texture);
}

GL_METHOD(BindTexture) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint texture = info[1].As<Napi::Number>().Int32Value();

  glBindTexture(target, texture);
  return env.Undefined();
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

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[2].As<Napi::Number>().Int32Value();
  GLsizei width = info[3].As<Napi::Number>().Int32Value();
  GLsizei height = info[4].As<Napi::Number>().Int32Value();
  GLint border = info[5].As<Napi::Number>().Int32Value();
  GLenum format = info[6].As<Napi::Number>().Int32Value();
  GLint type = info[7].As<Napi::Number>().Int32Value();
  unsigned char* pixels = nullptr;
  size_t pixels_len = 0;
  if (!info[8].IsNull() && !info[8].IsUndefined()) {
    auto _arr_pixels = info[8].As<Napi::TypedArray>();
    pixels = reinterpret_cast<unsigned char*>(
        static_cast<uint8_t*>(_arr_pixels.ArrayBuffer().Data()) + _arr_pixels.ByteOffset());
    pixels_len = _arr_pixels.ByteLength();
  }

  if (pixels) {
    if (inst->unpack_flip_y || inst->unpack_premultiply_alpha) {
      std::vector<uint8_t> unpacked = inst->unpackPixels(type, format, width, height, pixels);
      CallTexImage2D(target, level, internalformat, width, height, border, format, type,
                     unpacked.size(), unpacked.data());
    } else {
      CallTexImage2D(target, level, internalformat, width, height, border, format, type,
                     pixels_len, pixels);
    }
  } else {
    CallTexImage2D(target, level, internalformat, width, height, border, format, type, 0, nullptr);
  }
  return env.Undefined();
}

GL_METHOD(TexSubImage2D) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLint xoffset = info[2].As<Napi::Number>().Int32Value();
  GLint yoffset = info[3].As<Napi::Number>().Int32Value();
  GLsizei width = info[4].As<Napi::Number>().Int32Value();
  GLsizei height = info[5].As<Napi::Number>().Int32Value();
  GLenum format = info[6].As<Napi::Number>().Int32Value();
  GLenum type = info[7].As<Napi::Number>().Int32Value();
  auto _arr_pixels2 = info[8].As<Napi::TypedArray>();
  unsigned char* pixels = reinterpret_cast<unsigned char*>(
      static_cast<uint8_t*>(_arr_pixels2.ArrayBuffer().Data()) + _arr_pixels2.ByteOffset());
  size_t pixels_len = _arr_pixels2.ByteLength();

  if (inst->unpack_flip_y || inst->unpack_premultiply_alpha) {
    std::vector<uint8_t> unpacked = inst->unpackPixels(type, format, width, height, pixels);
    glTexSubImage2DRobustANGLE(target, level, xoffset, yoffset, width, height, format, type,
                               unpacked.size(), unpacked.data());
  } else {
    glTexSubImage2DRobustANGLE(target, level, xoffset, yoffset, width, height, format, type,
                               pixels_len, pixels);
  }
  return env.Undefined();
}

GL_METHOD(TexParameteri) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLint param = info[2].As<Napi::Number>().Int32Value();

  glTexParameteri(target, pname, param);
  return env.Undefined();
}

GL_METHOD(TexParameterf) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLfloat param = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());

  glTexParameterf(target, pname, param);
  return env.Undefined();
}

GL_METHOD(Clear) {
  GL_BOILERPLATE;

  glClear(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(UseProgram) {
  GL_BOILERPLATE;

  glUseProgram(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(CreateBuffer) {
  GL_BOILERPLATE;

  GLuint buffer;
  glGenBuffers(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_BUFFER, buffer);

  return Napi::Number::New(env, buffer);
}

GL_METHOD(BindBuffer) {
  GL_BOILERPLATE;

  GLenum target = (GLenum)info[0].As<Napi::Number>().Int32Value();
  GLuint buffer = (GLuint)info[1].As<Napi::Number>().Uint32Value();

  glBindBuffer(target, buffer);
  return env.Undefined();
}

GL_METHOD(CreateFramebuffer) {
  GL_BOILERPLATE;

  GLuint buffer;
  glGenFramebuffers(1, &buffer);
  inst->registerGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);

  return Napi::Number::New(env, buffer);
}

GL_METHOD(BindFramebuffer) {
  GL_BOILERPLATE;

  GLint target = (GLint)info[0].As<Napi::Number>().Int32Value();
  GLint buffer = (GLint)(info[1].As<Napi::Number>().Int32Value());

  glBindFramebuffer(target, buffer);
  return env.Undefined();
}

GL_METHOD(FramebufferTexture2D) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum attachment = info[1].As<Napi::Number>().Int32Value();
  GLint textarget = info[2].As<Napi::Number>().Int32Value();
  GLint texture = info[3].As<Napi::Number>().Int32Value();
  GLint level = info[4].As<Napi::Number>().Int32Value();

  // Handle depth stencil case separately
  if (attachment == 0x821A) {
    glFramebufferTexture2D(target, GL_DEPTH_ATTACHMENT, textarget, texture, level);
    glFramebufferTexture2D(target, GL_STENCIL_ATTACHMENT, textarget, texture, level);
  } else {
    glFramebufferTexture2D(target, attachment, textarget, texture, level);
  }
  return env.Undefined();
}

GL_METHOD(BufferData) {
  GL_BOILERPLATE;

  GLint target = info[0].As<Napi::Number>().Int32Value();
  GLenum usage = info[2].As<Napi::Number>().Int32Value();

  if (info[1].IsObject()) {
    auto _arr_array = info[1].As<Napi::TypedArray>();
    char* array = reinterpret_cast<char*>(
        static_cast<uint8_t*>(_arr_array.ArrayBuffer().Data()) + _arr_array.ByteOffset());
    size_t array_len = _arr_array.ElementLength();
    glBufferData(target, array_len, static_cast<void *>(array), usage);
  } else if (info[1].IsNumber()) {
    glBufferData(target, info[1].As<Napi::Number>().Int32Value(), NULL, usage);
  }
  return env.Undefined();
}

GL_METHOD(BufferSubData) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint offset = info[1].As<Napi::Number>().Int32Value();
  auto _arr_array = info[2].As<Napi::TypedArray>();
  char* array = reinterpret_cast<char*>(
      static_cast<uint8_t*>(_arr_array.ArrayBuffer().Data()) + _arr_array.ByteOffset());
  size_t array_len = _arr_array.ElementLength();

  glBufferSubData(target, offset, array_len, array);
  return env.Undefined();
}

GL_METHOD(BlendEquation) {
  GL_BOILERPLATE;

  GLenum mode = info[0].As<Napi::Number>().Int32Value();

  glBlendEquation(mode);
  return env.Undefined();
}

GL_METHOD(BlendFunc) {
  GL_BOILERPLATE;

  GLenum sfactor = info[0].As<Napi::Number>().Int32Value();
  GLenum dfactor = info[1].As<Napi::Number>().Int32Value();

  glBlendFunc(sfactor, dfactor);
  return env.Undefined();
}

GL_METHOD(EnableVertexAttribArray) {
  GL_BOILERPLATE;

  glEnableVertexAttribArray(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(VertexAttribPointer) {
  GL_BOILERPLATE;

  GLint index = info[0].As<Napi::Number>().Int32Value();
  GLint size = info[1].As<Napi::Number>().Int32Value();
  GLenum type = info[2].As<Napi::Number>().Int32Value();
  GLboolean normalized = info[3].As<Napi::Boolean>().Value();
  GLint stride = info[4].As<Napi::Number>().Int32Value();
  size_t offset = info[5].As<Napi::Number>().Uint32Value();

  glVertexAttribPointer(index, size, type, normalized, stride, reinterpret_cast<GLvoid *>(offset));
  return env.Undefined();
}

GL_METHOD(ActiveTexture) {
  GL_BOILERPLATE;

  glActiveTexture(info[0].As<Napi::Number>().Int32Value());
  return env.Undefined();
}

GL_METHOD(DrawElements) {
  GL_BOILERPLATE;

  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLint count = info[1].As<Napi::Number>().Int32Value();
  GLenum type = info[2].As<Napi::Number>().Int32Value();
  size_t offset = info[3].As<Napi::Number>().Uint32Value();

  glDrawElements(mode, count, type, reinterpret_cast<GLvoid *>(offset));
  return env.Undefined();
}

GL_METHOD(Flush) {
  GL_BOILERPLATE;

  glFlush();
  return env.Undefined();
}

GL_METHOD(Finish) {
  GL_BOILERPLATE;

  glFinish();
  return env.Undefined();
}

GL_METHOD(VertexAttrib1f) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());

  glVertexAttrib1f(index, x);
  return env.Undefined();
}

GL_METHOD(VertexAttrib2f) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat y = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());

  glVertexAttrib2f(index, x, y);
  return env.Undefined();
}

GL_METHOD(VertexAttrib3f) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat y = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());
  GLfloat z = static_cast<GLfloat>(info[3].As<Napi::Number>().DoubleValue());

  glVertexAttrib3f(index, x, y, z);
  return env.Undefined();
}

GL_METHOD(VertexAttrib4f) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Int32Value();
  GLfloat x = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());
  GLfloat y = static_cast<GLfloat>(info[2].As<Napi::Number>().DoubleValue());
  GLfloat z = static_cast<GLfloat>(info[3].As<Napi::Number>().DoubleValue());
  GLfloat w = static_cast<GLfloat>(info[4].As<Napi::Number>().DoubleValue());

  glVertexAttrib4f(index, x, y, z, w);
  return env.Undefined();
}

GL_METHOD(BlendColor) {
  GL_BOILERPLATE;

  GLclampf r = static_cast<GLclampf>(info[0].As<Napi::Number>().DoubleValue());
  GLclampf g = static_cast<GLclampf>(info[1].As<Napi::Number>().DoubleValue());
  GLclampf b = static_cast<GLclampf>(info[2].As<Napi::Number>().DoubleValue());
  GLclampf a = static_cast<GLclampf>(info[3].As<Napi::Number>().DoubleValue());

  glBlendColor(r, g, b, a);
  return env.Undefined();
}

GL_METHOD(BlendEquationSeparate) {
  GL_BOILERPLATE;

  GLenum mode_rgb = info[0].As<Napi::Number>().Int32Value();
  GLenum mode_alpha = info[1].As<Napi::Number>().Int32Value();

  glBlendEquationSeparate(mode_rgb, mode_alpha);
  return env.Undefined();
}

GL_METHOD(BlendFuncSeparate) {
  GL_BOILERPLATE;

  GLenum src_rgb = info[0].As<Napi::Number>().Int32Value();
  GLenum dst_rgb = info[1].As<Napi::Number>().Int32Value();
  GLenum src_alpha = info[2].As<Napi::Number>().Int32Value();
  GLenum dst_alpha = info[3].As<Napi::Number>().Int32Value();

  glBlendFuncSeparate(src_rgb, dst_rgb, src_alpha, dst_alpha);
  return env.Undefined();
}

GL_METHOD(ClearStencil) {
  GL_BOILERPLATE;

  GLint s = info[0].As<Napi::Number>().Int32Value();

  glClearStencil(s);
  return env.Undefined();
}

GL_METHOD(ColorMask) {
  GL_BOILERPLATE;

  GLboolean r = (info[0].As<Napi::Boolean>().Value());
  GLboolean g = (info[1].As<Napi::Boolean>().Value());
  GLboolean b = (info[2].As<Napi::Boolean>().Value());
  GLboolean a = (info[3].As<Napi::Boolean>().Value());

  glColorMask(r, g, b, a);
  return env.Undefined();
}

GL_METHOD(CopyTexImage2D) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[2].As<Napi::Number>().Int32Value();
  GLint x = info[3].As<Napi::Number>().Int32Value();
  GLint y = info[4].As<Napi::Number>().Int32Value();
  GLsizei width = info[5].As<Napi::Number>().Int32Value();
  GLsizei height = info[6].As<Napi::Number>().Int32Value();
  GLint border = info[7].As<Napi::Number>().Int32Value();

  glCopyTexImage2D(target, level, internalformat, x, y, width, height, border);
  return env.Undefined();
}

GL_METHOD(CopyTexSubImage2D) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLint xoffset = info[2].As<Napi::Number>().Int32Value();
  GLint yoffset = info[3].As<Napi::Number>().Int32Value();
  GLint x = info[4].As<Napi::Number>().Int32Value();
  GLint y = info[5].As<Napi::Number>().Int32Value();
  GLsizei width = info[6].As<Napi::Number>().Int32Value();
  GLsizei height = info[7].As<Napi::Number>().Int32Value();

  glCopyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height);
  return env.Undefined();
}

GL_METHOD(CullFace) {
  GL_BOILERPLATE;

  GLenum mode = info[0].As<Napi::Number>().Int32Value();

  glCullFace(mode);
  return env.Undefined();
}

GL_METHOD(DepthMask) {
  GL_BOILERPLATE;

  GLboolean flag = (info[0].As<Napi::Boolean>().Value());

  glDepthMask(flag);
  return env.Undefined();
}

GL_METHOD(DepthRange) {
  GL_BOILERPLATE;

  GLclampf zNear = static_cast<GLclampf>(info[0].As<Napi::Number>().DoubleValue());
  GLclampf zFar = static_cast<GLclampf>(info[1].As<Napi::Number>().DoubleValue());

  glDepthRangef(zNear, zFar);
  return env.Undefined();
}

GL_METHOD(DisableVertexAttribArray) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Int32Value();

  glDisableVertexAttribArray(index);
  return env.Undefined();
}

GL_METHOD(Hint) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum mode = info[1].As<Napi::Number>().Int32Value();

  glHint(target, mode);
  return env.Undefined();
}

GL_METHOD(IsEnabled) {
  GL_BOILERPLATE;

  GLenum cap = info[0].As<Napi::Number>().Int32Value();
  bool ret = glIsEnabled(cap) != 0;

  return Napi::Boolean::New(env, ret);
}

GL_METHOD(LineWidth) {
  GL_BOILERPLATE;

  GLfloat width = (GLfloat)(info[0].As<Napi::Number>().DoubleValue());

  glLineWidth(width);
  return env.Undefined();
}

GL_METHOD(PolygonOffset) {
  GL_BOILERPLATE;

  GLfloat factor = static_cast<GLfloat>(info[0].As<Napi::Number>().DoubleValue());
  GLfloat units = static_cast<GLfloat>(info[1].As<Napi::Number>().DoubleValue());

  glPolygonOffset(factor, units);
  return env.Undefined();
}

GL_METHOD(SampleCoverage) {
  GL_BOILERPLATE;

  GLclampf value = static_cast<GLclampf>(info[0].As<Napi::Number>().DoubleValue());
  GLboolean invert = (info[1].As<Napi::Boolean>().Value());

  glSampleCoverage(value, invert);
  return env.Undefined();
}

GL_METHOD(Scissor) {
  GL_BOILERPLATE;

  GLint x = info[0].As<Napi::Number>().Int32Value();
  GLint y = info[1].As<Napi::Number>().Int32Value();
  GLsizei width = info[2].As<Napi::Number>().Int32Value();
  GLsizei height = info[3].As<Napi::Number>().Int32Value();

  glScissor(x, y, width, height);
  return env.Undefined();
}

GL_METHOD(StencilFunc) {
  GL_BOILERPLATE;

  GLenum func = info[0].As<Napi::Number>().Int32Value();
  GLint ref = info[1].As<Napi::Number>().Int32Value();
  GLuint mask = info[2].As<Napi::Number>().Uint32Value();

  glStencilFunc(func, ref, mask);
  return env.Undefined();
}

GL_METHOD(StencilFuncSeparate) {
  GL_BOILERPLATE;

  GLenum face = info[0].As<Napi::Number>().Int32Value();
  GLenum func = info[1].As<Napi::Number>().Int32Value();
  GLint ref = info[2].As<Napi::Number>().Int32Value();
  GLuint mask = info[3].As<Napi::Number>().Uint32Value();

  glStencilFuncSeparate(face, func, ref, mask);
  return env.Undefined();
}

GL_METHOD(StencilMask) {
  GL_BOILERPLATE;

  GLuint mask = info[0].As<Napi::Number>().Uint32Value();

  glStencilMask(mask);
  return env.Undefined();
}

GL_METHOD(StencilMaskSeparate) {
  GL_BOILERPLATE;

  GLenum face = info[0].As<Napi::Number>().Int32Value();
  GLuint mask = info[1].As<Napi::Number>().Uint32Value();

  glStencilMaskSeparate(face, mask);
  return env.Undefined();
}

GL_METHOD(StencilOp) {
  GL_BOILERPLATE;

  GLenum fail = info[0].As<Napi::Number>().Int32Value();
  GLenum zfail = info[1].As<Napi::Number>().Int32Value();
  GLenum zpass = info[2].As<Napi::Number>().Int32Value();

  glStencilOp(fail, zfail, zpass);
  return env.Undefined();
}

GL_METHOD(StencilOpSeparate) {
  GL_BOILERPLATE;

  GLenum face = info[0].As<Napi::Number>().Int32Value();
  GLenum fail = info[1].As<Napi::Number>().Int32Value();
  GLenum zfail = info[2].As<Napi::Number>().Int32Value();
  GLenum zpass = info[3].As<Napi::Number>().Int32Value();

  glStencilOpSeparate(face, fail, zfail, zpass);
  return env.Undefined();
}

GL_METHOD(BindRenderbuffer) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLuint buffer = info[1].As<Napi::Number>().Uint32Value();

  glBindRenderbuffer(target, buffer);
  return env.Undefined();
}

GL_METHOD(CreateRenderbuffer) {
  GL_BOILERPLATE;

  GLuint renderbuffers;
  glGenRenderbuffers(1, &renderbuffers);

  inst->registerGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffers);

  return Napi::Number::New(env, renderbuffers);
}

GL_METHOD(DeleteBuffer) {
  GL_BOILERPLATE;

  GLuint buffer = (GLuint)info[0].As<Napi::Number>().Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_BUFFER, buffer);

  glDeleteBuffers(1, &buffer);
  return env.Undefined();
}

GL_METHOD(DeleteFramebuffer) {
  GL_BOILERPLATE;

  GLuint buffer = info[0].As<Napi::Number>().Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_FRAMEBUFFER, buffer);

  glDeleteFramebuffers(1, &buffer);
  return env.Undefined();
}

GL_METHOD(DeleteProgram) {
  GL_BOILERPLATE;

  GLuint program = info[0].As<Napi::Number>().Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_PROGRAM, program);

  glDeleteProgram(program);
  return env.Undefined();
}

GL_METHOD(DeleteRenderbuffer) {
  GL_BOILERPLATE;

  GLuint renderbuffer = info[0].As<Napi::Number>().Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_RENDERBUFFER, renderbuffer);

  glDeleteRenderbuffers(1, &renderbuffer);
  return env.Undefined();
}

GL_METHOD(DeleteShader) {
  GL_BOILERPLATE;

  GLuint shader = info[0].As<Napi::Number>().Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_SHADER, shader);

  glDeleteShader(shader);
  return env.Undefined();
}

GL_METHOD(DeleteTexture) {
  GL_BOILERPLATE;

  GLuint texture = info[0].As<Napi::Number>().Uint32Value();

  inst->unregisterGLObj(GLOBJECT_TYPE_TEXTURE, texture);

  glDeleteTextures(1, &texture);
  return env.Undefined();
}

GL_METHOD(DetachShader) {
  GL_BOILERPLATE;

  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  GLuint shader = info[1].As<Napi::Number>().Uint32Value();

  glDetachShader(program, shader);
  return env.Undefined();
}

GL_METHOD(FramebufferRenderbuffer) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum attachment = info[1].As<Napi::Number>().Int32Value();
  GLenum renderbuffertarget = info[2].As<Napi::Number>().Int32Value();
  GLuint renderbuffer = info[3].As<Napi::Number>().Uint32Value();

  glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer);
  return env.Undefined();
}

GL_METHOD(GetVertexAttribOffset) {
  GL_BOILERPLATE;

  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();

  void *ret = NULL;
  glGetVertexAttribPointerv(index, pname, &ret);

  GLuint offset = static_cast<GLuint>(reinterpret_cast<size_t>(ret));
  return Napi::Number::New(env, offset);
}

GL_METHOD(IsBuffer) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsBuffer(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(IsFramebuffer) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsFramebuffer(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(IsProgram) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsProgram(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(IsRenderbuffer) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsRenderbuffer(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(IsShader) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsShader(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(IsTexture) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsTexture(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(RenderbufferStorage) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[1].As<Napi::Number>().Int32Value();
  GLsizei width = info[2].As<Napi::Number>().Int32Value();
  GLsizei height = info[3].As<Napi::Number>().Int32Value();

  // In WebGL, we map GL_DEPTH_STENCIL to GL_DEPTH24_STENCIL8
  if (internalformat == GL_DEPTH_STENCIL_OES) {
    internalformat = GL_DEPTH24_STENCIL8_OES;
  } else if (internalformat == GL_DEPTH_COMPONENT32_OES) {
    internalformat = inst->preferredDepth;
  }

  glRenderbufferStorage(target, internalformat, width, height);
  return env.Undefined();
}

GL_METHOD(GetShaderSource) {
  GL_BOILERPLATE;

  GLint shader = info[0].As<Napi::Number>().Int32Value();

  GLint len;
  glGetShaderiv(shader, GL_SHADER_SOURCE_LENGTH, &len);

  GLchar *source = new GLchar[len];
  glGetShaderSource(shader, len, NULL, source);
  Napi::String str = Napi::String::New(env, source);
  delete[] source;

  return str;
}

GL_METHOD(ReadPixels) {
  GL_BOILERPLATE;

  GLint x = info[0].As<Napi::Number>().Int32Value();
  GLint y = info[1].As<Napi::Number>().Int32Value();
  GLsizei width = info[2].As<Napi::Number>().Int32Value();
  GLsizei height = info[3].As<Napi::Number>().Int32Value();
  GLenum format = info[4].As<Napi::Number>().Int32Value();
  GLenum type = info[5].As<Napi::Number>().Int32Value();
  auto _arr_pixels = info[6].As<Napi::TypedArray>();
  char* pixels = reinterpret_cast<char*>(
      static_cast<uint8_t*>(_arr_pixels.ArrayBuffer().Data()) + _arr_pixels.ByteOffset());
  size_t pixels_len = _arr_pixels.ElementLength();

  glReadPixels(x, y, width, height, format, type, pixels);
  return env.Undefined();
}

GL_METHOD(GetTexParameter) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();

  if (pname == GL_TEXTURE_MAX_ANISOTROPY_EXT) {
    GLfloat param_value = 0;
    glGetTexParameterfv(target, pname, &param_value);
    return Napi::Number::New(env, param_value);
  } else {
    GLint param_value = 0;
    glGetTexParameteriv(target, pname, &param_value);
    return Napi::Number::New(env, param_value);
  }
  return env.Undefined();
}

GL_METHOD(GetActiveAttrib) {
  GL_BOILERPLATE;

  GLuint program = info[0].As<Napi::Number>().Int32Value();
  GLuint index = info[1].As<Napi::Number>().Int32Value();

  GLint maxLength;
  glGetProgramiv(program, GL_ACTIVE_ATTRIBUTE_MAX_LENGTH, &maxLength);

  char *name = new char[maxLength];
  GLsizei length = 0;
  GLenum type;
  GLsizei size;
  glGetActiveAttrib(program, index, maxLength, &length, &size, &type, name);

  if (length > 0) {
    Napi::Object activeInfo = Napi::Object::New(env);
    activeInfo.Set(Napi::String::New(env, "size"), Napi::Number::New(env, size));
    activeInfo.Set(Napi::String::New(env, "type"), Napi::Number::New(env, type));
    activeInfo.Set(Napi::String::New(env, "name"), Napi::String::New(env, name));
    return activeInfo;
  } else {
    return env.Null();
  }

  delete[] name;
  return env.Undefined();
}

GL_METHOD(GetActiveUniform) {
  GL_BOILERPLATE;

  GLuint program = info[0].As<Napi::Number>().Int32Value();
  GLuint index = info[1].As<Napi::Number>().Int32Value();

  GLint maxLength;
  glGetProgramiv(program, GL_ACTIVE_UNIFORM_MAX_LENGTH, &maxLength);

  char *name = new char[maxLength];
  GLsizei length = 0;
  GLenum type;
  GLsizei size;
  glGetActiveUniform(program, index, maxLength, &length, &size, &type, name);

  if (length > 0) {
    Napi::Object activeInfo = Napi::Object::New(env);
    activeInfo.Set(Napi::String::New(env, "size"), Napi::Number::New(env, size));
    activeInfo.Set(Napi::String::New(env, "type"), Napi::Number::New(env, type));
    activeInfo.Set(Napi::String::New(env, "name"), Napi::String::New(env, name));
    return activeInfo;
  } else {
    return env.Null();
  }

  delete[] name;
  return env.Undefined();
}

GL_METHOD(GetAttachedShaders) {
  GL_BOILERPLATE;

  GLuint program = info[0].As<Napi::Number>().Int32Value();

  GLint numAttachedShaders;
  glGetProgramiv(program, GL_ATTACHED_SHADERS, &numAttachedShaders);

  GLuint *shaders = new GLuint[numAttachedShaders];
  GLsizei count;
  glGetAttachedShaders(program, numAttachedShaders, &count, shaders);

  Napi::Array shadersArr = Napi::Array::New(env, count);
  for (int i = 0; i < count; i++) {
    shadersArr.Set(i, Napi::Number::New(env, (int)shaders[i]));
  }

  return shadersArr;

  delete[] shaders;
  return env.Undefined();
}

static Napi::Value ReturnParamValueOrNull(Napi::Value value, GLsizei bytesWritten,
                                              Napi::Env env) {
  if (bytesWritten > 0) {
    return value;
  } else {
    return env.Null();
  }
}

GL_METHOD(GetParameter) {
  GL_BOILERPLATE;
  GLenum name = info[0].As<Napi::Number>().Int32Value();

  GLsizei bytesWritten = 0;

  switch (name) {
  case 0x9240 /* UNPACK_FLIP_Y_WEBGL */:
    return Napi::Boolean::New(env, inst->unpack_flip_y);

  case 0x9241 /* UNPACK_PREMULTIPLY_ALPHA_WEBGL*/:
    return Napi::Boolean::New(env, inst->unpack_premultiply_alpha);

  case 0x9243 /* UNPACK_COLORSPACE_CONVERSION_WEBGL */:
    return Napi::Number::New(env, inst->unpack_colorspace_conversion);

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

    return ReturnParamValueOrNull(Napi::Boolean::New(env, params != 0), bytesWritten, env);
  }

  case GL_DEPTH_CLEAR_VALUE:
  case GL_LINE_WIDTH:
  case GL_POLYGON_OFFSET_FACTOR:
  case GL_POLYGON_OFFSET_UNITS:
  case GL_SAMPLE_COVERAGE_VALUE:
  case GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT: {
    GLfloat params = 0;
    glGetFloatvRobustANGLE(name, sizeof(GLfloat), &bytesWritten, &params);

    return ReturnParamValueOrNull(Napi::Number::New(env, params), bytesWritten, env);
  }

  case GL_RENDERER:
  case GL_SHADING_LANGUAGE_VERSION:
  case GL_VENDOR:
  case GL_VERSION:
  case GL_EXTENSIONS: {
    const char *params = reinterpret_cast<const char *>(glGetString(name));
    if (params) {
      return Napi::String::New(env, params);
    }
    return env.Null();
  }

  case GL_MAX_VIEWPORT_DIMS: {
    GLint params[2] = {};
    glGetIntegervRobustANGLE(name, sizeof(GLint) * 2, &bytesWritten, params);

    Napi::Array arr = Napi::Array::New(env, 2);
    arr.Set((uint32_t)0, Napi::Number::New(env, params[0]));
    arr.Set((uint32_t)1, Napi::Number::New(env, params[1]));
    return ReturnParamValueOrNull(arr, bytesWritten, env);
  }

  case GL_SCISSOR_BOX:
  case GL_VIEWPORT: {
    GLint params[4] = {};
    glGetIntegervRobustANGLE(name, sizeof(GLint) * 4, &bytesWritten, params);

    Napi::Array arr = Napi::Array::New(env, 4);
    arr.Set((uint32_t)0, Napi::Number::New(env, params[0]));
    arr.Set((uint32_t)1, Napi::Number::New(env, params[1]));
    arr.Set((uint32_t)2, Napi::Number::New(env, params[2]));
    arr.Set((uint32_t)3, Napi::Number::New(env, params[3]));
    return ReturnParamValueOrNull(arr, bytesWritten, env);
  }

  case GL_ALIASED_LINE_WIDTH_RANGE:
  case GL_ALIASED_POINT_SIZE_RANGE:
  case GL_DEPTH_RANGE: {
    GLfloat params[2] = {};
    glGetFloatvRobustANGLE(name, sizeof(GLfloat) * 2, &bytesWritten, params);

    Napi::Array arr = Napi::Array::New(env, 2);
    arr.Set((uint32_t)0, Napi::Number::New(env, params[0]));
    arr.Set((uint32_t)1, Napi::Number::New(env, params[1]));
    return ReturnParamValueOrNull(arr, bytesWritten, env);
  }

  case GL_BLEND_COLOR:
  case GL_COLOR_CLEAR_VALUE: {
    GLfloat params[4] = {};
    glGetFloatvRobustANGLE(name, sizeof(GLfloat) * 4, &bytesWritten, params);

    Napi::Array arr = Napi::Array::New(env, 4);
    arr.Set((uint32_t)0, Napi::Number::New(env, params[0]));
    arr.Set((uint32_t)1, Napi::Number::New(env, params[1]));
    arr.Set((uint32_t)2, Napi::Number::New(env, params[2]));
    arr.Set((uint32_t)3, Napi::Number::New(env, params[3]));
    return ReturnParamValueOrNull(arr, bytesWritten, env);
  }

  case GL_COLOR_WRITEMASK: {
    GLboolean params[4] = {};
    glGetBooleanvRobustANGLE(name, sizeof(GLboolean) * 4, &bytesWritten, params);

    Napi::Array arr = Napi::Array::New(env, 4);
    arr.Set((uint32_t)0, Napi::Boolean::New(env, params[0] == GL_TRUE));
    arr.Set((uint32_t)1, Napi::Boolean::New(env, params[1] == GL_TRUE));
    arr.Set((uint32_t)2, Napi::Boolean::New(env, params[2] == GL_TRUE));
    arr.Set((uint32_t)3, Napi::Boolean::New(env, params[3] == GL_TRUE));
    return ReturnParamValueOrNull(arr, bytesWritten, env);
  }

  default: {
    GLint params = 0;
    glGetIntegervRobustANGLE(name, sizeof(GLint), &bytesWritten, &params);
    return ReturnParamValueOrNull(Napi::Number::New(env, params), bytesWritten, env);
  }
  }
  return env.Undefined();
}

GL_METHOD(GetBufferParameter) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();

  GLint params;
  glGetBufferParameteriv(target, pname, &params);

  return Napi::Number::New(env, params);
}

GL_METHOD(GetFramebufferAttachmentParameter) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum attachment = info[1].As<Napi::Number>().Int32Value();
  GLenum pname = info[2].As<Napi::Number>().Int32Value();

  GLint params = 0;
  glGetFramebufferAttachmentParameteriv(target, attachment, pname, &params);

  return Napi::Number::New(env, params);
}

GL_METHOD(GetProgramInfoLog) {
  GL_BOILERPLATE;

  GLuint program = info[0].As<Napi::Number>().Int32Value();

  GLint infoLogLength;
  glGetProgramiv(program, GL_INFO_LOG_LENGTH, &infoLogLength);

  char *error = new char[infoLogLength + 1];
  glGetProgramInfoLog(program, infoLogLength + 1, &infoLogLength, error);

  return Napi::String::New(env, error);

  delete[] error;
  return env.Undefined();
}

GL_METHOD(GetShaderPrecisionFormat) {
  GL_BOILERPLATE;

  GLenum shaderType = info[0].As<Napi::Number>().Int32Value();
  GLenum precisionType = info[1].As<Napi::Number>().Int32Value();

  GLint range[2];
  GLint precision;

  glGetShaderPrecisionFormat(shaderType, precisionType, range, &precision);

  Napi::Object result = Napi::Object::New(env);
  result.Set(Napi::String::New(env, "rangeMin"), Napi::Number::New(env, range[0]));
  result.Set(Napi::String::New(env, "rangeMax"), Napi::Number::New(env, range[1]));
  result.Set(Napi::String::New(env, "precision"), Napi::Number::New(env, precision));

  return result;
}

GL_METHOD(GetRenderbufferParameter) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();

  int value;
  glGetRenderbufferParameteriv(target, pname, &value);

  return Napi::Number::New(env, value);
}

GL_METHOD(GetUniform) {
  GL_BOILERPLATE;

  GLint program = info[0].As<Napi::Number>().Int32Value();
  GLint location = info[1].As<Napi::Number>().Int32Value();

  float data[16];
  glGetUniformfv(program, location, data);

  Napi::Array arr = Napi::Array::New(env, 16);
  for (int i = 0; i < 16; i++) {
    arr.Set(i, Napi::Number::New(env, data[i]));
  }

  return arr;
}

GL_METHOD(GetVertexAttrib) {
  GL_BOILERPLATE;

  GLint index = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();

  GLint value;

  switch (pname) {
  case GL_VERTEX_ATTRIB_ARRAY_ENABLED:
  case GL_VERTEX_ATTRIB_ARRAY_NORMALIZED: {
    glGetVertexAttribiv(index, pname, &value);
    return Napi::Boolean::New(env, value != 0);
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
    return Napi::Number::New(env, value);
  }

  case GL_CURRENT_VERTEX_ATTRIB: {
    float vextex_attribs[4];

    glGetVertexAttribfv(index, pname, vextex_attribs);

    Napi::Array arr = Napi::Array::New(env, 4);
    arr.Set((uint32_t)0, Napi::Number::New(env, vextex_attribs[0]));
    arr.Set((uint32_t)1, Napi::Number::New(env, vextex_attribs[1]));
    arr.Set((uint32_t)2, Napi::Number::New(env, vextex_attribs[2]));
    arr.Set((uint32_t)3, Napi::Number::New(env, vextex_attribs[3]));
    return arr;
  }

  default:
    break;
  }

  inst->setError(GL_INVALID_ENUM);
  return env.Null();
}

GL_METHOD(GetSupportedExtensions) {
  GL_BOILERPLATE;

  std::string extensions = JoinStringSet(inst->supportedWebGLExtensions);

  Napi::String exts = Napi::String::New(env, extensions);

  return exts;
}

GL_METHOD(GetExtension) {
  GL_BOILERPLATE;

  std::string name = info[0].As<Napi::String>().Utf8Value();

  auto extsIter = inst->webGLToANGLEExtensions.find(name.c_str());
  if (extsIter == inst->webGLToANGLEExtensions.end()) {
    printf("Warning: no record of ANGLE exts for WebGL extension: %s\n", name.c_str());
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
  return env.Undefined();
}

GL_METHOD(CheckFramebufferStatus) {
  GL_BOILERPLATE;

  GLenum target = info[0].As<Napi::Number>().Int32Value();

  return Napi::Number::New(env, static_cast<int>(glCheckFramebufferStatus(target)));
}

GL_METHOD(DrawBuffersWEBGL) {
  GL_BOILERPLATE;

  Napi::Array buffersArray = info[0].As<Napi::Array>();
  GLuint numBuffers = buffersArray.Length();
  GLenum *buffers = new GLenum[numBuffers];

  for (GLuint i = 0; i < numBuffers; i++) {
    buffers[i] = buffersArray.Get(i).As<Napi::Number>().Uint32Value();
  }

  glDrawBuffersEXT(numBuffers, buffers);

  delete[] buffers;
  return env.Undefined();
}

GL_METHOD(EXTWEBGL_draw_buffers) {
  Napi::Env env = info.Env();
  Napi::Object result = Napi::Object::New(env);
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT0_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT0_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT1_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT1_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT2_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT2_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT3_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT3_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT4_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT4_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT5_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT5_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT6_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT6_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT7_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT7_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT8_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT8_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT9_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT9_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT10_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT10_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT11_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT11_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT12_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT12_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT13_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT13_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT14_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT14_EXT));
  result.Set(Napi::String::New(env, "COLOR_ATTACHMENT15_WEBGL"), Napi::Number::New(env, GL_COLOR_ATTACHMENT15_EXT));

  result.Set(Napi::String::New(env, "DRAW_BUFFER0_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER0_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER1_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER1_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER2_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER2_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER3_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER3_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER4_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER4_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER5_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER5_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER6_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER6_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER7_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER7_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER8_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER8_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER9_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER9_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER10_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER10_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER11_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER11_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER12_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER12_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER13_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER13_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER14_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER14_EXT));
  result.Set(Napi::String::New(env, "DRAW_BUFFER15_WEBGL"), Napi::Number::New(env, GL_DRAW_BUFFER15_EXT));

  result.Set(Napi::String::New(env, "MAX_COLOR_ATTACHMENTS_WEBGL"), Napi::Number::New(env, GL_MAX_COLOR_ATTACHMENTS_EXT));
  result.Set(Napi::String::New(env, "MAX_DRAW_BUFFERS_WEBGL"), Napi::Number::New(env, GL_MAX_DRAW_BUFFERS_EXT));

  return result;
}

GL_METHOD(BindVertexArrayOES) {
  GL_BOILERPLATE;

  GLuint array = info[0].As<Napi::Number>().Uint32Value();

  glBindVertexArrayOES(array);
  return env.Undefined();
}

GL_METHOD(CreateVertexArrayOES) {
  GL_BOILERPLATE;

  GLuint array = 0;
  glGenVertexArraysOES(1, &array);
  inst->registerGLObj(GLOBJECT_TYPE_VERTEX_ARRAY, array);

  return Napi::Number::New(env, array);
}

GL_METHOD(DeleteVertexArrayOES) {
  GL_BOILERPLATE;

  GLuint array = info[0].As<Napi::Number>().Uint32Value();
  inst->unregisterGLObj(GLOBJECT_TYPE_VERTEX_ARRAY, array);

  glDeleteVertexArraysOES(1, &array);
  return env.Undefined();
}

GL_METHOD(IsVertexArrayOES) {
  GL_BOILERPLATE;

  return Napi::Boolean::New(env, glIsVertexArrayOES(info[0].As<Napi::Number>().Uint32Value()) != 0);
}

GL_METHOD(CopyBufferSubData) {
  GL_BOILERPLATE;
  GLenum readTarget = info[0].As<Napi::Number>().Int32Value();
  GLenum writeTarget = info[1].As<Napi::Number>().Int32Value();
  GLintptr readOffset = info[2].As<Napi::Number>().Int64Value();
  GLintptr writeOffset = info[3].As<Napi::Number>().Int64Value();
  GLsizeiptr size = info[4].As<Napi::Number>().Int64Value();
  glCopyBufferSubData(readTarget, writeTarget, readOffset, writeOffset, size);
  return env.Undefined();
}

GL_METHOD(GetBufferSubData) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLintptr srcByteOffset = info[1].As<Napi::Number>().Int64Value();
  auto buffer = info[2].As<Napi::TypedArray>();
  void *bufferPtr = (static_cast<uint8_t*>(buffer.ArrayBuffer().Data()) + buffer.ByteOffset());
  GLsizeiptr bufferSize = buffer.ByteLength();
  // TODO:  glGetBufferSubData(target, srcByteOffset, bufferSize, bufferPtr);
  return env.Undefined();
}

GL_METHOD(BlitFramebuffer) {
  GL_BOILERPLATE;
  GLint srcX0 = info[0].As<Napi::Number>().Int32Value();
  GLint srcY0 = info[1].As<Napi::Number>().Int32Value();
  GLint srcX1 = info[2].As<Napi::Number>().Int32Value();
  GLint srcY1 = info[3].As<Napi::Number>().Int32Value();
  GLint dstX0 = info[4].As<Napi::Number>().Int32Value();
  GLint dstY0 = info[5].As<Napi::Number>().Int32Value();
  GLint dstX1 = info[6].As<Napi::Number>().Int32Value();
  GLint dstY1 = info[7].As<Napi::Number>().Int32Value();
  GLbitfield mask = info[8].As<Napi::Number>().Uint32Value();
  GLenum filter = info[9].As<Napi::Number>().Int32Value();
  glBlitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
  return env.Undefined();
}

GL_METHOD(FramebufferTextureLayer) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum attachment = info[1].As<Napi::Number>().Int32Value();
  GLuint texture = info[2].As<Napi::Number>().Uint32Value();
  GLint level = info[3].As<Napi::Number>().Int32Value();
  GLint layer = info[4].As<Napi::Number>().Int32Value();
  glFramebufferTextureLayer(target, attachment, texture, level, layer);
  return env.Undefined();
}

GL_METHOD(InvalidateFramebuffer) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  auto attachments = info[1].As<Napi::Array>();
  GLsizei count = attachments.Length();
  GLenum *attachmentList = new GLenum[count];
  for (GLsizei i = 0; i < count; i++)
    attachmentList[i] = attachments.Get(i).As<Napi::Number>().Int32Value();
  glInvalidateFramebuffer(target, count, attachmentList);
  delete[] attachmentList;
  return env.Undefined();
}

GL_METHOD(InvalidateSubFramebuffer) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  auto attachments = info[1].As<Napi::Array>();
  GLsizei count = attachments.Length();
  GLenum *attachmentList = new GLenum[count];
  for (GLsizei i = 0; i < count; i++)
    attachmentList[i] = attachments.Get(i).As<Napi::Number>().Int32Value();
  GLint x = info[2].As<Napi::Number>().Int32Value();
  GLint y = info[3].As<Napi::Number>().Int32Value();
  GLsizei width = info[4].As<Napi::Number>().Int32Value();
  GLsizei height = info[5].As<Napi::Number>().Int32Value();
  glInvalidateSubFramebuffer(target, count, attachmentList, x, y, width, height);
  delete[] attachmentList;
  return env.Undefined();
}

GL_METHOD(ReadBuffer) {
  GL_BOILERPLATE;
  GLenum src = OverrideDrawBufferEnum(info[0].As<Napi::Number>().Int32Value());
  glReadBuffer(src);
  return env.Undefined();
}

GL_METHOD(GetInternalformatParameter) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[1].As<Napi::Number>().Int32Value();
  GLenum pname = info[2].As<Napi::Number>().Int32Value();
  GLint result;
  glGetInternalformativ(target, internalformat, pname, 1, &result);
  return Napi::Number::New(env, result);
}

GL_METHOD(RenderbufferStorageMultisample) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLsizei samples = info[1].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[2].As<Napi::Number>().Int32Value();
  GLsizei width = info[3].As<Napi::Number>().Int32Value();
  GLsizei height = info[4].As<Napi::Number>().Int32Value();
  glRenderbufferStorageMultisample(target, samples, internalformat, width, height);
  return env.Undefined();
}

GL_METHOD(TexStorage2D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLsizei levels = info[1].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[2].As<Napi::Number>().Int32Value();
  GLsizei width = info[3].As<Napi::Number>().Int32Value();
  GLsizei height = info[4].As<Napi::Number>().Int32Value();
  glTexStorage2D(target, levels, internalformat, width, height);
  return env.Undefined();
}

GL_METHOD(TexStorage3D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLsizei levels = info[1].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[2].As<Napi::Number>().Int32Value();
  GLsizei width = info[3].As<Napi::Number>().Int32Value();
  GLsizei height = info[4].As<Napi::Number>().Int32Value();
  GLsizei depth = info[5].As<Napi::Number>().Int32Value();
  glTexStorage3D(target, levels, internalformat, width, height, depth);
  return env.Undefined();
}

GL_METHOD(TexImage3D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLint internalformat = info[2].As<Napi::Number>().Int32Value();
  GLsizei width = info[3].As<Napi::Number>().Int32Value();
  GLsizei height = info[4].As<Napi::Number>().Int32Value();
  GLsizei depth = info[5].As<Napi::Number>().Int32Value();
  GLint border = info[6].As<Napi::Number>().Int32Value();
  GLenum format = info[7].As<Napi::Number>().Int32Value();
  GLenum type = info[8].As<Napi::Number>().Int32Value();
  if (info[9].IsUndefined()) {
    glTexImage3D(target, level, internalformat, width, height, depth, border, format, type,
                 nullptr);
  } else if (info[9].IsTypedArray()) {
    auto buffer = info[9].As<Napi::TypedArray>();
    void *bufferPtr = (static_cast<uint8_t*>(buffer.ArrayBuffer().Data()) + buffer.ByteOffset());
    glTexImage3D(target, level, internalformat, width, height, depth, border, format, type,
                 bufferPtr);
  } else {
    Napi::TypeError::New(env, "Invalid data type for TexImage3D").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return env.Undefined();
}

GL_METHOD(TexSubImage3D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLint xoffset = info[2].As<Napi::Number>().Int32Value();
  GLint yoffset = info[3].As<Napi::Number>().Int32Value();
  GLint zoffset = info[4].As<Napi::Number>().Int32Value();
  GLsizei width = info[5].As<Napi::Number>().Int32Value();
  GLsizei height = info[6].As<Napi::Number>().Int32Value();
  GLsizei depth = info[7].As<Napi::Number>().Int32Value();
  GLenum format = info[8].As<Napi::Number>().Int32Value();
  GLenum type = info[9].As<Napi::Number>().Int32Value();
  if (info[10].IsUndefined()) {
    glTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type,
                    nullptr);
  } else if (info[10].IsTypedArray()) {
    auto buffer = info[10].As<Napi::TypedArray>();
    void *bufferPtr = (static_cast<uint8_t*>(buffer.ArrayBuffer().Data()) + buffer.ByteOffset());
    glTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth, format, type,
                    bufferPtr);
  } else {
    Napi::TypeError::New(env, "Invalid data type for TexSubImage3D").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return env.Undefined();
}

GL_METHOD(CopyTexSubImage3D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLint xoffset = info[2].As<Napi::Number>().Int32Value();
  GLint yoffset = info[3].As<Napi::Number>().Int32Value();
  GLint zoffset = info[4].As<Napi::Number>().Int32Value();
  GLint x = info[5].As<Napi::Number>().Int32Value();
  GLint y = info[6].As<Napi::Number>().Int32Value();
  GLsizei width = info[7].As<Napi::Number>().Int32Value();
  GLsizei height = info[8].As<Napi::Number>().Int32Value();
  glCopyTexSubImage3D(target, level, xoffset, yoffset, zoffset, x, y, width, height);
  return env.Undefined();
}

GL_METHOD(CompressedTexImage3D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLenum internalformat = info[2].As<Napi::Number>().Int32Value();
  GLsizei width = info[3].As<Napi::Number>().Int32Value();
  GLsizei height = info[4].As<Napi::Number>().Int32Value();
  GLsizei depth = info[5].As<Napi::Number>().Int32Value();
  GLint border = info[6].As<Napi::Number>().Int32Value();
  GLsizei imageSize = info[7].As<Napi::Number>().Int32Value();
  if (info[8].IsUndefined()) {
    glCompressedTexImage3D(target, level, internalformat, width, height, depth, border, imageSize,
                           nullptr);
  } else if (info[8].IsTypedArray()) {
    auto buffer = info[8].As<Napi::TypedArray>();
    void *bufferPtr = (static_cast<uint8_t*>(buffer.ArrayBuffer().Data()) + buffer.ByteOffset());
    glCompressedTexImage3D(target, level, internalformat, width, height, depth, border, imageSize,
                           bufferPtr);
  } else {
    Napi::TypeError::New(env, "Invalid data type for CompressedTexImage3D").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return env.Undefined();
}

GL_METHOD(CompressedTexSubImage3D) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLint level = info[1].As<Napi::Number>().Int32Value();
  GLint xoffset = info[2].As<Napi::Number>().Int32Value();
  GLint yoffset = info[3].As<Napi::Number>().Int32Value();
  GLint zoffset = info[4].As<Napi::Number>().Int32Value();
  GLsizei width = info[5].As<Napi::Number>().Int32Value();
  GLsizei height = info[6].As<Napi::Number>().Int32Value();
  GLsizei depth = info[7].As<Napi::Number>().Int32Value();
  GLenum format = info[8].As<Napi::Number>().Int32Value();
  GLsizei imageSize = info[9].As<Napi::Number>().Int32Value();
  if (info[10].IsUndefined()) {
    glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth,
                              format, imageSize, nullptr);
  } else if (info[10].IsTypedArray()) {
    auto buffer = info[10].As<Napi::TypedArray>();
    void *bufferPtr = (static_cast<uint8_t*>(buffer.ArrayBuffer().Data()) + buffer.ByteOffset());
    glCompressedTexSubImage3D(target, level, xoffset, yoffset, zoffset, width, height, depth,
                              format, imageSize, bufferPtr);
  } else {
    Napi::TypeError::New(env, "Invalid data type for CompressedTexSubImage3D").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return env.Undefined();
}

GL_METHOD(GetFragDataLocation) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  std::string name = info[1].As<Napi::String>().Utf8Value();
  GLint location = glGetFragDataLocation(program, name.c_str());
  return Napi::Number::New(env, location);
}

GL_METHOD(Uniform1ui) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLuint v0 = info[1].As<Napi::Number>().Uint32Value();
  glUniform1ui(location, v0);
  return env.Undefined();
}

GL_METHOD(Uniform2ui) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLuint v0 = info[1].As<Napi::Number>().Uint32Value();
  GLuint v1 = info[2].As<Napi::Number>().Uint32Value();
  glUniform2ui(location, v0, v1);
  return env.Undefined();
}

GL_METHOD(Uniform3ui) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLuint v0 = info[1].As<Napi::Number>().Uint32Value();
  GLuint v1 = info[2].As<Napi::Number>().Uint32Value();
  GLuint v2 = info[3].As<Napi::Number>().Uint32Value();
  glUniform3ui(location, v0, v1, v2);
  return env.Undefined();
}

GL_METHOD(Uniform4ui) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLuint v0 = info[1].As<Napi::Number>().Uint32Value();
  GLuint v1 = info[2].As<Napi::Number>().Uint32Value();
  GLuint v2 = info[3].As<Napi::Number>().Uint32Value();
  GLuint v3 = info[4].As<Napi::Number>().Uint32Value();
  glUniform4ui(location, v0, v1, v2, v3);
  return env.Undefined();
}

GL_METHOD(Uniform1uiv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  auto data = info[1].As<Napi::TypedArray>();
  GLuint *bufferPtr = reinterpret_cast<GLuint *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / sizeof(GLuint);
  glUniform1uiv(location, count, bufferPtr);
  return env.Undefined();
}

GL_METHOD(Uniform2uiv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  auto data = info[1].As<Napi::TypedArray>();
  GLuint *bufferPtr = reinterpret_cast<GLuint *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (2 * sizeof(GLuint));
  glUniform2uiv(location, count, bufferPtr);
  return env.Undefined();
}

GL_METHOD(Uniform3uiv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  auto data = info[1].As<Napi::TypedArray>();
  GLuint *bufferPtr = reinterpret_cast<GLuint *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (3 * sizeof(GLuint));
  glUniform3uiv(location, count, bufferPtr);
  return env.Undefined();
}

GL_METHOD(Uniform4uiv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  auto data = info[1].As<Napi::TypedArray>();
  GLuint *bufferPtr = reinterpret_cast<GLuint *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (4 * sizeof(GLuint));
  glUniform4uiv(location, count, bufferPtr);
  return env.Undefined();
}

GL_METHOD(UniformMatrix3x2fv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLboolean transpose = info[1].As<Napi::Boolean>().Value();
  auto data = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (6 * sizeof(GLfloat));
  glUniformMatrix3x2fv(location, count, transpose, bufferPtr);
  return env.Undefined();
}

GL_METHOD(UniformMatrix4x2fv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLboolean transpose = info[1].As<Napi::Boolean>().Value();
  auto data = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (8 * sizeof(GLfloat));
  glUniformMatrix4x2fv(location, count, transpose, bufferPtr);
  return env.Undefined();
}

GL_METHOD(UniformMatrix2x3fv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLboolean transpose = info[1].As<Napi::Boolean>().Value();
  auto data = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (6 * sizeof(GLfloat));
  glUniformMatrix2x3fv(location, count, transpose, bufferPtr);
  return env.Undefined();
}

GL_METHOD(UniformMatrix4x3fv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLboolean transpose = info[1].As<Napi::Boolean>().Value();
  auto data = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (12 * sizeof(GLfloat));
  glUniformMatrix4x3fv(location, count, transpose, bufferPtr);
  return env.Undefined();
}

GL_METHOD(UniformMatrix2x4fv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLboolean transpose = info[1].As<Napi::Boolean>().Value();
  auto data = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (8 * sizeof(GLfloat));
  glUniformMatrix2x4fv(location, count, transpose, bufferPtr);
  return env.Undefined();
}

GL_METHOD(UniformMatrix3x4fv) {
  GL_BOILERPLATE;
  GLuint location = info[0].As<Napi::Number>().Uint32Value();
  GLboolean transpose = info[1].As<Napi::Boolean>().Value();
  auto data = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(data.ArrayBuffer().Data()) + data.ByteOffset()));
  GLsizei count = data.ByteLength() / (12 * sizeof(GLfloat));
  glUniformMatrix3x4fv(location, count, transpose, bufferPtr);
  return env.Undefined();
}

GL_METHOD(VertexAttribI4i) {
  GL_BOILERPLATE;
  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  GLint x = info[1].As<Napi::Number>().Int32Value();
  GLint y = info[2].As<Napi::Number>().Int32Value();
  GLint z = info[3].As<Napi::Number>().Int32Value();
  GLint w = info[4].As<Napi::Number>().Int32Value();
  glVertexAttribI4i(index, x, y, z, w);
  return env.Undefined();
}

GL_METHOD(VertexAttribI4iv) {
  GL_BOILERPLATE;
  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  auto values = info[1].As<Napi::TypedArray>();
  GLint *bufferPtr = reinterpret_cast<GLint *>((static_cast<uint8_t*>(values.ArrayBuffer().Data()) + values.ByteOffset()));
  glVertexAttribI4iv(index, bufferPtr);
  return env.Undefined();
}

GL_METHOD(VertexAttribI4ui) {
  GL_BOILERPLATE;
  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  GLuint x = info[1].As<Napi::Number>().Uint32Value();
  GLuint y = info[2].As<Napi::Number>().Uint32Value();
  GLuint z = info[3].As<Napi::Number>().Uint32Value();
  GLuint w = info[4].As<Napi::Number>().Uint32Value();
  glVertexAttribI4ui(index, x, y, z, w);
  return env.Undefined();
}

GL_METHOD(VertexAttribI4uiv) {
  GL_BOILERPLATE;
  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  auto values = info[1].As<Napi::TypedArray>();
  GLuint *bufferPtr = reinterpret_cast<GLuint *>((static_cast<uint8_t*>(values.ArrayBuffer().Data()) + values.ByteOffset()));
  glVertexAttribI4uiv(index, bufferPtr);
  return env.Undefined();
}

GL_METHOD(VertexAttribIPointer) {
  GL_BOILERPLATE;
  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  GLint size = info[1].As<Napi::Number>().Int32Value();
  GLenum type = info[2].As<Napi::Number>().Int32Value();
  GLsizei stride = info[3].As<Napi::Number>().Int32Value();
  GLintptr offset = info[4].As<Napi::Number>().Int64Value();
  glVertexAttribIPointer(index, size, type, stride, reinterpret_cast<const void *>(offset));
  return env.Undefined();
}

GL_METHOD(VertexAttribDivisor) {
  GL_BOILERPLATE;
  GLuint index = info[0].As<Napi::Number>().Uint32Value();
  GLuint divisor = info[1].As<Napi::Number>().Uint32Value();
  glVertexAttribDivisor(index, divisor);
  return env.Undefined();
}

GL_METHOD(DrawArraysInstanced) {
  GL_BOILERPLATE;
  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLint first = info[1].As<Napi::Number>().Int32Value();
  GLsizei count = info[2].As<Napi::Number>().Int32Value();
  GLsizei instanceCount = info[3].As<Napi::Number>().Int32Value();
  glDrawArraysInstanced(mode, first, count, instanceCount);
  return env.Undefined();
}

GL_METHOD(DrawElementsInstanced) {
  GL_BOILERPLATE;
  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLsizei count = info[1].As<Napi::Number>().Int32Value();
  GLenum type = info[2].As<Napi::Number>().Int32Value();
  GLintptr offset = info[3].As<Napi::Number>().Int64Value();
  GLsizei instanceCount = info[4].As<Napi::Number>().Int32Value();
  glDrawElementsInstanced(mode, count, type, reinterpret_cast<const void *>(offset), instanceCount);
  return env.Undefined();
}

GL_METHOD(DrawRangeElements) {
  GL_BOILERPLATE;
  GLenum mode = info[0].As<Napi::Number>().Int32Value();
  GLuint start = info[1].As<Napi::Number>().Uint32Value();
  GLuint end = info[2].As<Napi::Number>().Uint32Value();
  GLsizei count = info[3].As<Napi::Number>().Int32Value();
  GLenum type = info[4].As<Napi::Number>().Int32Value();
  GLintptr offset = info[5].As<Napi::Number>().Int64Value();
  glDrawRangeElements(mode, start, end, count, type, reinterpret_cast<const void *>(offset));
  return env.Undefined();
}

GL_METHOD(DrawBuffers) {
  GL_BOILERPLATE;
  auto buffers = info[0].As<Napi::Array>();
  GLsizei count = buffers.Length();
  GLenum *bufferList = new GLenum[count];
  for (GLsizei i = 0; i < count; i++) {
    GLenum buffer = buffers.Get(i).As<Napi::Number>().Int32Value();
    bufferList[i] = OverrideDrawBufferEnum(buffer);
  }
  glDrawBuffers(count, bufferList);
  delete[] bufferList;
  return env.Undefined();
}

GL_METHOD(ClearBufferfv) {
  GL_BOILERPLATE;
  GLenum buffer = info[0].As<Napi::Number>().Int32Value();
  GLint drawbuffer = info[1].As<Napi::Number>().Int32Value();
  auto values = info[2].As<Napi::TypedArray>();
  GLfloat *bufferPtr = reinterpret_cast<GLfloat *>((static_cast<uint8_t*>(values.ArrayBuffer().Data()) + values.ByteOffset()));
  glClearBufferfv(buffer, drawbuffer, bufferPtr);
  return env.Undefined();
}

GL_METHOD(ClearBufferiv) {
  GL_BOILERPLATE;
  GLenum buffer = info[0].As<Napi::Number>().Int32Value();
  GLint drawbuffer = info[1].As<Napi::Number>().Int32Value();
  auto values = info[2].As<Napi::TypedArray>();
  GLint *bufferPtr = reinterpret_cast<GLint *>((static_cast<uint8_t*>(values.ArrayBuffer().Data()) + values.ByteOffset()));
  glClearBufferiv(buffer, drawbuffer, bufferPtr);
  return env.Undefined();
}

GL_METHOD(ClearBufferuiv) {
  GL_BOILERPLATE;
  GLenum buffer = info[0].As<Napi::Number>().Int32Value();
  GLint drawbuffer = info[1].As<Napi::Number>().Int32Value();
  auto values = info[2].As<Napi::TypedArray>();
  GLuint *bufferPtr = reinterpret_cast<GLuint *>((static_cast<uint8_t*>(values.ArrayBuffer().Data()) + values.ByteOffset()));
  glClearBufferuiv(buffer, drawbuffer, bufferPtr);
  return env.Undefined();
}

GL_METHOD(ClearBufferfi) {
  GL_BOILERPLATE;
  GLenum buffer = info[0].As<Napi::Number>().Int32Value();
  GLint drawbuffer = info[1].As<Napi::Number>().Int32Value();
  GLfloat depth = info[2].As<Napi::Number>().DoubleValue();
  GLint stencil = info[3].As<Napi::Number>().Int32Value();
  glClearBufferfi(buffer, drawbuffer, depth, stencil);
  return env.Undefined();
}

GL_METHOD(CreateQuery) {
  GL_BOILERPLATE;
  GLuint query;
  glGenQueries(1, &query);
  return Napi::Number::New(env, query);
}

GL_METHOD(DeleteQuery) {
  GL_BOILERPLATE;
  GLuint query = info[0].As<Napi::Number>().Uint32Value();
  glDeleteQueries(1, &query);
  return env.Undefined();
}

GL_METHOD(IsQuery) {
  GL_BOILERPLATE;
  GLuint query = info[0].As<Napi::Number>().Uint32Value();
  GLboolean result = glIsQuery(query);
  return Napi::Boolean::New(env, result != GL_FALSE);
}

GL_METHOD(BeginQuery) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLuint query = info[1].As<Napi::Number>().Uint32Value();
  glBeginQuery(target, query);
  return env.Undefined();
}

GL_METHOD(EndQuery) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  glEndQuery(target);
  return env.Undefined();
}

GL_METHOD(GetQuery) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLuint result;
  glGetQueryiv(target, pname, reinterpret_cast<GLint *>(&result));
  return Napi::Number::New(env, result);
}

GL_METHOD(GetQueryParameter) {
  GL_BOILERPLATE;
  GLuint query = info[0].As<Napi::Number>().Uint32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLuint result;
  glGetQueryObjectuiv(query, pname, &result);
  return Napi::Number::New(env, result);
}

GL_METHOD(CreateSampler) {
  GL_BOILERPLATE;
  GLuint sampler;
  glGenSamplers(1, &sampler);
  return Napi::Number::New(env, sampler);
}

GL_METHOD(DeleteSampler) {
  GL_BOILERPLATE;
  GLuint sampler = info[0].As<Napi::Number>().Uint32Value();
  glDeleteSamplers(1, &sampler);
  return env.Undefined();
}

GL_METHOD(IsSampler) {
  GL_BOILERPLATE;
  GLuint sampler = info[0].As<Napi::Number>().Uint32Value();
  GLboolean result = glIsSampler(sampler);
  return Napi::Boolean::New(env, result != GL_FALSE);
}

GL_METHOD(BindSampler) {
  GL_BOILERPLATE;
  GLuint unit = info[0].As<Napi::Number>().Uint32Value();
  GLuint sampler = info[1].As<Napi::Number>().Uint32Value();
  glBindSampler(unit, sampler);
  return env.Undefined();
}

GL_METHOD(SamplerParameteri) {
  GL_BOILERPLATE;
  GLuint sampler = info[0].As<Napi::Number>().Uint32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLint param = info[2].As<Napi::Number>().Int32Value();
  glSamplerParameteri(sampler, pname, param);
  return env.Undefined();
}

GL_METHOD(SamplerParameterf) {
  GL_BOILERPLATE;
  GLuint sampler = info[0].As<Napi::Number>().Uint32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLfloat param = info[2].As<Napi::Number>().DoubleValue();
  glSamplerParameterf(sampler, pname, param);
  return env.Undefined();
}

GL_METHOD(GetSamplerParameter) {
  GL_BOILERPLATE;
  GLuint sampler = info[0].As<Napi::Number>().Uint32Value();
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLint result;
  glGetSamplerParameteriv(sampler, pname, &result);
  return Napi::Number::New(env, result);
}

// ANGLE internally stores GLsync values as integer handles, so this is safe on ANGLE.
GLsync IntToSync(uint32_t intValue) {
  return reinterpret_cast<GLsync>(static_cast<uintptr_t>(intValue));
}

uint32_t SyncToInt(GLsync sync) { return static_cast<uint32_t>(reinterpret_cast<uintptr_t>(sync)); }

GL_METHOD(FenceSync) {
  GL_BOILERPLATE;
  GLenum condition = info[0].As<Napi::Number>().Int32Value();
  GLbitfield flags = info[1].As<Napi::Number>().Uint32Value();
  GLsync sync = glFenceSync(condition, flags);
  return Napi::Number::New(env, SyncToInt(sync));
}

GL_METHOD(IsSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(info[0].As<Napi::Number>().Uint32Value());
  GLboolean result = glIsSync(sync);
  return Napi::Boolean::New(env, result != GL_FALSE);
}

GL_METHOD(DeleteSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(info[0].As<Napi::Number>().Uint32Value());
  glDeleteSync(sync);
  return env.Undefined();
}

GL_METHOD(ClientWaitSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(info[0].As<Napi::Number>().Uint32Value());
  GLbitfield flags = info[1].As<Napi::Number>().Uint32Value();
  GLuint64 timeout = info[2].As<Napi::Number>().Int64Value();
  GLenum result = glClientWaitSync(sync, flags, timeout);
  return Napi::Number::New(env, result);
}

GL_METHOD(WaitSync) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(info[0].As<Napi::Number>().Uint32Value());
  GLbitfield flags = info[1].As<Napi::Number>().Uint32Value();
  GLint64 timeout = info[2].As<Napi::Number>().Int64Value();
  glWaitSync(sync, flags, timeout);
  return env.Undefined();
}

GL_METHOD(GetSyncParameter) {
  GL_BOILERPLATE;
  GLsync sync = IntToSync(info[0].As<Napi::Number>().Uint32Value());
  GLenum pname = info[1].As<Napi::Number>().Int32Value();
  GLint result;
  glGetSynciv(sync, pname, 1, nullptr, &result);
  return Napi::Number::New(env, result);
}

GL_METHOD(CreateTransformFeedback) {
  GL_BOILERPLATE;
  GLuint tf;
  glGenTransformFeedbacks(1, &tf);
  return Napi::Number::New(env, tf);
}

GL_METHOD(DeleteTransformFeedback) {
  GL_BOILERPLATE;
  GLuint tf = info[0].As<Napi::Number>().Uint32Value();
  glDeleteTransformFeedbacks(1, &tf);
  return env.Undefined();
}

GL_METHOD(IsTransformFeedback) {
  GL_BOILERPLATE;
  GLuint tf = info[0].As<Napi::Number>().Uint32Value();
  GLboolean result = glIsTransformFeedback(tf);
  return Napi::Boolean::New(env, result != GL_FALSE);
}

GL_METHOD(BindTransformFeedback) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLuint tf = info[1].As<Napi::Number>().Uint32Value();
  glBindTransformFeedback(target, tf);
  return env.Undefined();
}

GL_METHOD(BeginTransformFeedback) {
  GL_BOILERPLATE;
  GLenum primitiveMode = info[0].As<Napi::Number>().Int32Value();
  glBeginTransformFeedback(primitiveMode);
  return env.Undefined();
}

GL_METHOD(EndTransformFeedback) {
  GL_BOILERPLATE;
  glEndTransformFeedback();
  return env.Undefined();
}

GL_METHOD(TransformFeedbackVaryings) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  Napi::Array varyings = info[1].As<Napi::Array>();
  GLenum bufferMode = info[2].As<Napi::Number>().Int32Value();
  GLsizei count = (GLsizei)varyings.Length();
  std::vector<std::string> varyingStrs(count);
  const char **varyingStrings = new const char *[count];
  for (GLsizei i = 0; i < count; i++) {
    varyingStrs[i] = varyings.Get(i).As<Napi::String>().Utf8Value();
    varyingStrings[i] = varyingStrs[i].c_str();
  }
  glTransformFeedbackVaryings(program, count, varyingStrings, bufferMode);
  delete[] varyingStrings;
  return env.Undefined();
}

GL_METHOD(GetTransformFeedbackVarying) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  GLuint index = info[1].As<Napi::Number>().Uint32Value();
  char name[256];
  GLsizei length;
  GLsizei size;
  GLenum type;
  glGetTransformFeedbackVarying(program, index, 256, &length, &size, &type, name);
  Napi::Object result = Napi::Object::New(env);
  result.Set(Napi::String::New(env, "name"), Napi::String::New(env, name));
  result.Set(Napi::String::New(env, "size"), Napi::Number::New(env, size));
  result.Set(Napi::String::New(env, "type"), Napi::Number::New(env, type));
  return result;
}

GL_METHOD(PauseTransformFeedback) {
  GL_BOILERPLATE;
  glPauseTransformFeedback();
  return env.Undefined();
}

GL_METHOD(ResumeTransformFeedback) {
  GL_BOILERPLATE;
  glResumeTransformFeedback();
  return env.Undefined();
}

GL_METHOD(BindBufferBase) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLuint index = info[1].As<Napi::Number>().Uint32Value();
  GLuint buffer = info[2].As<Napi::Number>().Uint32Value();
  glBindBufferBase(target, index, buffer);
  return env.Undefined();
}

GL_METHOD(BindBufferRange) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLuint index = info[1].As<Napi::Number>().Uint32Value();
  GLuint buffer = info[2].As<Napi::Number>().Uint32Value();
  GLintptr offset = info[3].As<Napi::Number>().Int64Value();
  GLsizeiptr size = info[4].As<Napi::Number>().Int64Value();
  glBindBufferRange(target, index, buffer, offset, size);
  return env.Undefined();
}

GL_METHOD(GetIndexedParameter) {
  GL_BOILERPLATE;
  GLenum target = info[0].As<Napi::Number>().Int32Value();
  GLuint index = info[1].As<Napi::Number>().Uint32Value();
  GLint result;
  glGetIntegeri_v(target, index, &result);
  return Napi::Number::New(env, result);
}

GL_METHOD(GetUniformIndices) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  Napi::Array uniformNames = info[1].As<Napi::Array>();
  GLsizei count = (GLsizei)uniformNames.Length();
  std::vector<std::string> nameStrs(count);
  const char **names = new const char *[count];
  for (GLsizei i = 0; i < count; i++) {
    nameStrs[i] = uniformNames.Get(i).As<Napi::String>().Utf8Value();
    names[i] = nameStrs[i].c_str();
  }
  GLuint *indices = new GLuint[count];
  glGetUniformIndices(program, count, names, indices);
  Napi::Array result = Napi::Array::New(env, count);
  for (GLsizei i = 0; i < count; i++) {
    result.Set(i, Napi::Number::New(env, indices[i]));
  }
  return result;
  delete[] names;
  delete[] indices;
  return env.Undefined();
}

GL_METHOD(GetActiveUniforms) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  auto uniformIndices = info[1].As<Napi::Array>();
  GLsizei count = uniformIndices.Length();
  GLuint *indices = new GLuint[count];
  for (GLsizei i = 0; i < count; i++) {
    indices[i] = uniformIndices.Get(i).As<Napi::Number>().Uint32Value();
  }
  GLenum pname = info[2].As<Napi::Number>().Int32Value();
  GLint *params = new GLint[count];
  glGetActiveUniformsiv(program, count, indices, pname, params);
  Napi::Array result = Napi::Array::New(env, count);
  for (GLsizei i = 0; i < count; i++) {
    result.Set(i, Napi::Number::New(env, params[i]));
  }
  return result;
  delete[] indices;
  delete[] params;
  return env.Undefined();
}

GL_METHOD(GetUniformBlockIndex) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  std::string blockName = info[1].As<Napi::String>().Utf8Value();
  GLuint index = glGetUniformBlockIndex(program, blockName.c_str());
  return Napi::Number::New(env, index);
}

GL_METHOD(GetActiveUniformBlockParameter) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  GLuint uniformBlockIndex = info[1].As<Napi::Number>().Uint32Value();
  GLenum pname = info[2].As<Napi::Number>().Int32Value();
  GLint result;
  glGetActiveUniformBlockiv(program, uniformBlockIndex, pname, &result);
  return Napi::Number::New(env, result);
}

GL_METHOD(GetActiveUniformBlockName) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  GLuint uniformBlockIndex = info[1].As<Napi::Number>().Uint32Value();
  char name[256];
  GLsizei length;
  glGetActiveUniformBlockName(program, uniformBlockIndex, 256, &length, name);
  return Napi::String::New(env, name);
}

GL_METHOD(UniformBlockBinding) {
  GL_BOILERPLATE;
  GLuint program = info[0].As<Napi::Number>().Uint32Value();
  GLuint uniformBlockIndex = info[1].As<Napi::Number>().Uint32Value();
  GLuint uniformBlockBinding = info[2].As<Napi::Number>().Uint32Value();
  glUniformBlockBinding(program, uniformBlockIndex, uniformBlockBinding);
  return env.Undefined();
}

GL_METHOD(CreateVertexArray) {
  GL_BOILERPLATE;
  GLuint vao;
  glGenVertexArrays(1, &vao);
  return Napi::Number::New(env, vao);
}

GL_METHOD(DeleteVertexArray) {
  GL_BOILERPLATE;
  GLuint vao = info[0].As<Napi::Number>().Uint32Value();
  glDeleteVertexArrays(1, &vao);
  return env.Undefined();
}

GL_METHOD(IsVertexArray) {
  GL_BOILERPLATE;
  GLuint vao = info[0].As<Napi::Number>().Uint32Value();
  GLboolean result = glIsVertexArray(vao);
  return Napi::Boolean::New(env, result != GL_FALSE);
}

GL_METHOD(BindVertexArray) {
  GL_BOILERPLATE;
  GLuint vao = info[0].As<Napi::Number>().Uint32Value();
  glBindVertexArray(vao);
  return env.Undefined();
}
