#ifndef WEBGL_H_
#define WEBGL_H_

#include <algorithm>
#include <map>
#include <set>
#include <utility>
#include <vector>

#include <napi.h>

#define EGL_EGL_PROTOTYPES 0
#define GL_GLES_PROTOTYPES 0

#include "SharedLibrary.h"
#include "angle-loader/egl_loader.h"
#include "angle-loader/gles_loader.h"

enum GLObjectType {
  GLOBJECT_TYPE_BUFFER,
  GLOBJECT_TYPE_FRAMEBUFFER,
  GLOBJECT_TYPE_PROGRAM,
  GLOBJECT_TYPE_RENDERBUFFER,
  GLOBJECT_TYPE_SHADER,
  GLOBJECT_TYPE_TEXTURE,
  GLOBJECT_TYPE_VERTEX_ARRAY,
};

enum GLContextState {
  GLCONTEXT_STATE_INIT,
  GLCONTEXT_STATE_OK,
  GLCONTEXT_STATE_DESTROY,
  GLCONTEXT_STATE_ERROR
};

bool CaseInsensitiveCompare(const std::string &a, const std::string &b);

using GLObjectReference = std::pair<GLuint, GLObjectType>;
using WebGLToANGLEExtensionsMap =
    std::map<std::string, std::vector<std::string>, decltype(&CaseInsensitiveCompare)>;

struct WebGLRenderingContext : public Napi::ObjectWrap<WebGLRenderingContext> {

  // The underlying OpenGL context
  static bool HAS_DISPLAY;
  static EGLDisplay DISPLAY;

  SharedLibrary eglLibrary;
  EGLContext context;
  EGLConfig config;
  EGLSurface surface;
  GLContextState state;
  std::string errorMessage;

  // Pixel storage flags
  bool unpack_flip_y;
  bool unpack_premultiply_alpha;
  GLint unpack_colorspace_conversion;
  GLint unpack_alignment;

  std::set<std::string> requestableExtensions;
  std::set<std::string> enabledExtensions;
  std::set<std::string> supportedWebGLExtensions;
  WebGLToANGLEExtensionsMap webGLToANGLEExtensions;

  // A list of object references, need do destroy them at program exit
  std::map<std::pair<GLuint, GLObjectType>, bool> objects;
  void registerGLObj(GLObjectType type, GLuint obj) { objects[std::make_pair(obj, type)] = true; }
  void unregisterGLObj(GLObjectType type, GLuint obj) { objects.erase(std::make_pair(obj, type)); }

  // Context list
  WebGLRenderingContext *next, *prev;
  static WebGLRenderingContext *CONTEXT_LIST_HEAD;
  void registerContext() {
    if (CONTEXT_LIST_HEAD) {
      CONTEXT_LIST_HEAD->prev = this;
    }
    next = CONTEXT_LIST_HEAD;
    prev = NULL;
    CONTEXT_LIST_HEAD = this;
  }
  void unregisterContext() {
    if (next) {
      next->prev = this->prev;
    }
    if (prev) {
      prev->next = this->next;
    }
    if (CONTEXT_LIST_HEAD == this) {
      CONTEXT_LIST_HEAD = this->next;
    }
    next = prev = NULL;
  }

  // Napi constructor
  WebGLRenderingContext(const Napi::CallbackInfo& info);
  static Napi::Function GetClass(Napi::Env env);

  // Internal GL init helper (moved from old constructor)
  void _initContext(int width, int height, bool alpha, bool depth, bool stencil, bool antialias,
                    bool premultipliedAlpha, bool preserveDrawingBuffer,
                    bool preferLowPowerToHighPerformance, bool failIfMajorPerformanceCaveat,
                    bool createWebGL2Context);

  virtual ~WebGLRenderingContext();

  // Context validation
  static WebGLRenderingContext *ACTIVE;
  bool setActive();

  // Unpacks a buffer full of pixels into memory
  std::vector<uint8_t> unpackPixels(GLenum type, GLenum format, GLint width, GLint height,
                                    unsigned char *pixels);

  // Error handling
  std::set<GLenum> errorSet;
  void setError(GLenum error);
  GLenum getError();
  Napi::Value SetError(const Napi::CallbackInfo& info);
  Napi::Value GetError(const Napi::CallbackInfo& info);

  // Preferred depth format
  GLenum preferredDepth;

  // Destructors
  void dispose();

  static Napi::Value DisposeAll(const Napi::CallbackInfo& info);

  Napi::Value Destroy(const Napi::CallbackInfo& info);

  Napi::Value VertexAttribDivisorANGLE(const Napi::CallbackInfo& info);
  Napi::Value DrawArraysInstancedANGLE(const Napi::CallbackInfo& info);
  Napi::Value DrawElementsInstancedANGLE(const Napi::CallbackInfo& info);

  Napi::Value Uniform1f(const Napi::CallbackInfo& info);
  Napi::Value Uniform2f(const Napi::CallbackInfo& info);
  Napi::Value Uniform3f(const Napi::CallbackInfo& info);
  Napi::Value Uniform4f(const Napi::CallbackInfo& info);
  Napi::Value Uniform1i(const Napi::CallbackInfo& info);
  Napi::Value Uniform2i(const Napi::CallbackInfo& info);
  Napi::Value Uniform3i(const Napi::CallbackInfo& info);
  Napi::Value Uniform4i(const Napi::CallbackInfo& info);

  Napi::Value PixelStorei(const Napi::CallbackInfo& info);
  Napi::Value BindAttribLocation(const Napi::CallbackInfo& info);
  Napi::Value DrawArrays(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix2fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix3fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix4fv(const Napi::CallbackInfo& info);
  Napi::Value GenerateMipmap(const Napi::CallbackInfo& info);
  Napi::Value GetAttribLocation(const Napi::CallbackInfo& info);
  Napi::Value DepthFunc(const Napi::CallbackInfo& info);
  Napi::Value Viewport(const Napi::CallbackInfo& info);
  Napi::Value CreateShader(const Napi::CallbackInfo& info);
  Napi::Value ShaderSource(const Napi::CallbackInfo& info);
  Napi::Value CompileShader(const Napi::CallbackInfo& info);
  Napi::Value GetShaderParameter(const Napi::CallbackInfo& info);
  Napi::Value GetShaderInfoLog(const Napi::CallbackInfo& info);
  Napi::Value CreateProgram(const Napi::CallbackInfo& info);
  Napi::Value AttachShader(const Napi::CallbackInfo& info);
  Napi::Value LinkProgram(const Napi::CallbackInfo& info);
  Napi::Value GetProgramParameter(const Napi::CallbackInfo& info);
  Napi::Value GetUniformLocation(const Napi::CallbackInfo& info);
  Napi::Value ClearColor(const Napi::CallbackInfo& info);
  Napi::Value ClearDepth(const Napi::CallbackInfo& info);
  Napi::Value Disable(const Napi::CallbackInfo& info);
  Napi::Value Enable(const Napi::CallbackInfo& info);
  Napi::Value CreateTexture(const Napi::CallbackInfo& info);
  Napi::Value BindTexture(const Napi::CallbackInfo& info);
  Napi::Value TexImage2D(const Napi::CallbackInfo& info);
  Napi::Value TexParameteri(const Napi::CallbackInfo& info);
  Napi::Value TexParameterf(const Napi::CallbackInfo& info);
  Napi::Value Clear(const Napi::CallbackInfo& info);
  Napi::Value UseProgram(const Napi::CallbackInfo& info);
  Napi::Value CreateBuffer(const Napi::CallbackInfo& info);
  Napi::Value BindBuffer(const Napi::CallbackInfo& info);
  Napi::Value CreateFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value BindFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value FramebufferTexture2D(const Napi::CallbackInfo& info);
  Napi::Value BufferData(const Napi::CallbackInfo& info);
  Napi::Value BufferSubData(const Napi::CallbackInfo& info);
  Napi::Value BlendEquation(const Napi::CallbackInfo& info);
  Napi::Value BlendFunc(const Napi::CallbackInfo& info);
  Napi::Value EnableVertexAttribArray(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribPointer(const Napi::CallbackInfo& info);
  Napi::Value ActiveTexture(const Napi::CallbackInfo& info);
  Napi::Value DrawElements(const Napi::CallbackInfo& info);
  Napi::Value Flush(const Napi::CallbackInfo& info);
  Napi::Value Finish(const Napi::CallbackInfo& info);

  Napi::Value VertexAttrib1f(const Napi::CallbackInfo& info);
  Napi::Value VertexAttrib2f(const Napi::CallbackInfo& info);
  Napi::Value VertexAttrib3f(const Napi::CallbackInfo& info);
  Napi::Value VertexAttrib4f(const Napi::CallbackInfo& info);

  Napi::Value BlendColor(const Napi::CallbackInfo& info);
  Napi::Value BlendEquationSeparate(const Napi::CallbackInfo& info);
  Napi::Value BlendFuncSeparate(const Napi::CallbackInfo& info);
  Napi::Value ClearStencil(const Napi::CallbackInfo& info);
  Napi::Value ColorMask(const Napi::CallbackInfo& info);
  Napi::Value CopyTexImage2D(const Napi::CallbackInfo& info);
  Napi::Value CopyTexSubImage2D(const Napi::CallbackInfo& info);
  Napi::Value CullFace(const Napi::CallbackInfo& info);
  Napi::Value DepthMask(const Napi::CallbackInfo& info);
  Napi::Value DepthRange(const Napi::CallbackInfo& info);
  Napi::Value Hint(const Napi::CallbackInfo& info);
  Napi::Value IsEnabled(const Napi::CallbackInfo& info);
  Napi::Value LineWidth(const Napi::CallbackInfo& info);
  Napi::Value PolygonOffset(const Napi::CallbackInfo& info);

  Napi::Value GetShaderPrecisionFormat(const Napi::CallbackInfo& info);

  Napi::Value StencilFunc(const Napi::CallbackInfo& info);
  Napi::Value StencilFuncSeparate(const Napi::CallbackInfo& info);
  Napi::Value StencilMask(const Napi::CallbackInfo& info);
  Napi::Value StencilMaskSeparate(const Napi::CallbackInfo& info);
  Napi::Value StencilOp(const Napi::CallbackInfo& info);
  Napi::Value StencilOpSeparate(const Napi::CallbackInfo& info);

  Napi::Value Scissor(const Napi::CallbackInfo& info);

  Napi::Value BindRenderbuffer(const Napi::CallbackInfo& info);
  Napi::Value CreateRenderbuffer(const Napi::CallbackInfo& info);
  Napi::Value FramebufferRenderbuffer(const Napi::CallbackInfo& info);

  Napi::Value DeleteBuffer(const Napi::CallbackInfo& info);
  Napi::Value DeleteFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value DeleteProgram(const Napi::CallbackInfo& info);
  Napi::Value DeleteRenderbuffer(const Napi::CallbackInfo& info);
  Napi::Value DeleteShader(const Napi::CallbackInfo& info);
  Napi::Value DeleteTexture(const Napi::CallbackInfo& info);
  Napi::Value DetachShader(const Napi::CallbackInfo& info);

  Napi::Value GetVertexAttribOffset(const Napi::CallbackInfo& info);
  Napi::Value DisableVertexAttribArray(const Napi::CallbackInfo& info);

  Napi::Value IsBuffer(const Napi::CallbackInfo& info);
  Napi::Value IsFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value IsProgram(const Napi::CallbackInfo& info);
  Napi::Value IsRenderbuffer(const Napi::CallbackInfo& info);
  Napi::Value IsShader(const Napi::CallbackInfo& info);
  Napi::Value IsTexture(const Napi::CallbackInfo& info);

  Napi::Value RenderbufferStorage(const Napi::CallbackInfo& info);
  Napi::Value GetShaderSource(const Napi::CallbackInfo& info);
  Napi::Value ValidateProgram(const Napi::CallbackInfo& info);

  Napi::Value TexSubImage2D(const Napi::CallbackInfo& info);
  Napi::Value ReadPixels(const Napi::CallbackInfo& info);
  Napi::Value GetTexParameter(const Napi::CallbackInfo& info);
  Napi::Value GetActiveAttrib(const Napi::CallbackInfo& info);
  Napi::Value GetActiveUniform(const Napi::CallbackInfo& info);
  Napi::Value GetAttachedShaders(const Napi::CallbackInfo& info);
  Napi::Value GetParameter(const Napi::CallbackInfo& info);
  Napi::Value GetBufferParameter(const Napi::CallbackInfo& info);
  Napi::Value GetFramebufferAttachmentParameter(const Napi::CallbackInfo& info);
  Napi::Value GetProgramInfoLog(const Napi::CallbackInfo& info);
  Napi::Value GetRenderbufferParameter(const Napi::CallbackInfo& info);
  Napi::Value GetVertexAttrib(const Napi::CallbackInfo& info);
  Napi::Value GetSupportedExtensions(const Napi::CallbackInfo& info);
  Napi::Value GetExtension(const Napi::CallbackInfo& info);
  Napi::Value CheckFramebufferStatus(const Napi::CallbackInfo& info);

  Napi::Value FrontFace(const Napi::CallbackInfo& info);
  Napi::Value SampleCoverage(const Napi::CallbackInfo& info);
  Napi::Value GetUniform(const Napi::CallbackInfo& info);

  Napi::Value DrawBuffersWEBGL(const Napi::CallbackInfo& info);
  Napi::Value EXTWEBGL_draw_buffers(const Napi::CallbackInfo& info);

  Napi::Value BindVertexArrayOES(const Napi::CallbackInfo& info);
  Napi::Value CreateVertexArrayOES(const Napi::CallbackInfo& info);
  Napi::Value DeleteVertexArrayOES(const Napi::CallbackInfo& info);
  Napi::Value IsVertexArrayOES(const Napi::CallbackInfo& info);

  // WebGL 2 methods
  Napi::Value CopyBufferSubData(const Napi::CallbackInfo& info);
  Napi::Value GetBufferSubData(const Napi::CallbackInfo& info);
  Napi::Value BlitFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value FramebufferTextureLayer(const Napi::CallbackInfo& info);
  Napi::Value InvalidateFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value InvalidateSubFramebuffer(const Napi::CallbackInfo& info);
  Napi::Value ReadBuffer(const Napi::CallbackInfo& info);
  Napi::Value GetInternalformatParameter(const Napi::CallbackInfo& info);
  Napi::Value RenderbufferStorageMultisample(const Napi::CallbackInfo& info);
  Napi::Value TexStorage2D(const Napi::CallbackInfo& info);
  Napi::Value TexStorage3D(const Napi::CallbackInfo& info);
  Napi::Value TexImage3D(const Napi::CallbackInfo& info);
  Napi::Value TexSubImage3D(const Napi::CallbackInfo& info);
  Napi::Value CopyTexSubImage3D(const Napi::CallbackInfo& info);
  Napi::Value CompressedTexImage3D(const Napi::CallbackInfo& info);
  Napi::Value CompressedTexSubImage3D(const Napi::CallbackInfo& info);
  Napi::Value GetFragDataLocation(const Napi::CallbackInfo& info);
  Napi::Value Uniform1ui(const Napi::CallbackInfo& info);
  Napi::Value Uniform2ui(const Napi::CallbackInfo& info);
  Napi::Value Uniform3ui(const Napi::CallbackInfo& info);
  Napi::Value Uniform4ui(const Napi::CallbackInfo& info);
  Napi::Value Uniform1uiv(const Napi::CallbackInfo& info);
  Napi::Value Uniform2uiv(const Napi::CallbackInfo& info);
  Napi::Value Uniform3uiv(const Napi::CallbackInfo& info);
  Napi::Value Uniform4uiv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix3x2fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix4x2fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix2x3fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix4x3fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix2x4fv(const Napi::CallbackInfo& info);
  Napi::Value UniformMatrix3x4fv(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribI4i(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribI4iv(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribI4ui(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribI4uiv(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribIPointer(const Napi::CallbackInfo& info);
  Napi::Value VertexAttribDivisor(const Napi::CallbackInfo& info);
  Napi::Value DrawArraysInstanced(const Napi::CallbackInfo& info);
  Napi::Value DrawElementsInstanced(const Napi::CallbackInfo& info);
  Napi::Value DrawRangeElements(const Napi::CallbackInfo& info);
  Napi::Value DrawBuffers(const Napi::CallbackInfo& info);
  Napi::Value ClearBufferfv(const Napi::CallbackInfo& info);
  Napi::Value ClearBufferiv(const Napi::CallbackInfo& info);
  Napi::Value ClearBufferuiv(const Napi::CallbackInfo& info);
  Napi::Value ClearBufferfi(const Napi::CallbackInfo& info);
  Napi::Value CreateQuery(const Napi::CallbackInfo& info);
  Napi::Value DeleteQuery(const Napi::CallbackInfo& info);
  Napi::Value IsQuery(const Napi::CallbackInfo& info);
  Napi::Value BeginQuery(const Napi::CallbackInfo& info);
  Napi::Value EndQuery(const Napi::CallbackInfo& info);
  Napi::Value GetQuery(const Napi::CallbackInfo& info);
  Napi::Value GetQueryParameter(const Napi::CallbackInfo& info);
  Napi::Value CreateSampler(const Napi::CallbackInfo& info);
  Napi::Value DeleteSampler(const Napi::CallbackInfo& info);
  Napi::Value IsSampler(const Napi::CallbackInfo& info);
  Napi::Value BindSampler(const Napi::CallbackInfo& info);
  Napi::Value SamplerParameteri(const Napi::CallbackInfo& info);
  Napi::Value SamplerParameterf(const Napi::CallbackInfo& info);
  Napi::Value GetSamplerParameter(const Napi::CallbackInfo& info);
  Napi::Value FenceSync(const Napi::CallbackInfo& info);
  Napi::Value IsSync(const Napi::CallbackInfo& info);
  Napi::Value DeleteSync(const Napi::CallbackInfo& info);
  Napi::Value ClientWaitSync(const Napi::CallbackInfo& info);
  Napi::Value WaitSync(const Napi::CallbackInfo& info);
  Napi::Value GetSyncParameter(const Napi::CallbackInfo& info);
  Napi::Value CreateTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value DeleteTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value IsTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value BindTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value BeginTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value EndTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value TransformFeedbackVaryings(const Napi::CallbackInfo& info);
  Napi::Value GetTransformFeedbackVarying(const Napi::CallbackInfo& info);
  Napi::Value PauseTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value ResumeTransformFeedback(const Napi::CallbackInfo& info);
  Napi::Value BindBufferBase(const Napi::CallbackInfo& info);
  Napi::Value BindBufferRange(const Napi::CallbackInfo& info);
  Napi::Value GetIndexedParameter(const Napi::CallbackInfo& info);
  Napi::Value GetUniformIndices(const Napi::CallbackInfo& info);
  Napi::Value GetActiveUniforms(const Napi::CallbackInfo& info);
  Napi::Value GetUniformBlockIndex(const Napi::CallbackInfo& info);
  Napi::Value GetActiveUniformBlockParameter(const Napi::CallbackInfo& info);
  Napi::Value GetActiveUniformBlockName(const Napi::CallbackInfo& info);
  Napi::Value UniformBlockBinding(const Napi::CallbackInfo& info);
  Napi::Value CreateVertexArray(const Napi::CallbackInfo& info);
  Napi::Value DeleteVertexArray(const Napi::CallbackInfo& info);
  Napi::Value IsVertexArray(const Napi::CallbackInfo& info);
  Napi::Value BindVertexArray(const Napi::CallbackInfo& info);
};

void BindWebGL2(Napi::Object target, Napi::Env env);

#endif
