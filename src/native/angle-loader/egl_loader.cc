// egl_loader_autogen.cc:
//   Simple EGL function loader lifted from ANGLE.

#include "egl_loader.h"

extern "C" {
PFNEGLCHOOSECONFIGPROC l_eglChooseConfig;
PFNEGLCOPYBUFFERSPROC l_eglCopyBuffers;
PFNEGLCREATECONTEXTPROC l_eglCreateContext;
PFNEGLCREATEPBUFFERSURFACEPROC l_eglCreatePbufferSurface;
PFNEGLCREATEPIXMAPSURFACEPROC l_eglCreatePixmapSurface;
PFNEGLCREATEWINDOWSURFACEPROC l_eglCreateWindowSurface;
PFNEGLDESTROYCONTEXTPROC l_eglDestroyContext;
PFNEGLDESTROYSURFACEPROC l_eglDestroySurface;
PFNEGLGETCONFIGATTRIBPROC l_eglGetConfigAttrib;
PFNEGLGETCONFIGSPROC l_eglGetConfigs;
PFNEGLGETCURRENTDISPLAYPROC l_eglGetCurrentDisplay;
PFNEGLGETCURRENTSURFACEPROC l_eglGetCurrentSurface;
PFNEGLGETDISPLAYPROC l_eglGetDisplay;
PFNEGLGETERRORPROC l_eglGetError;
PFNEGLGETPROCADDRESSPROC l_eglGetProcAddress;
PFNEGLINITIALIZEPROC l_eglInitialize;
PFNEGLMAKECURRENTPROC l_eglMakeCurrent;
PFNEGLQUERYCONTEXTPROC l_eglQueryContext;
PFNEGLQUERYSTRINGPROC l_eglQueryString;
PFNEGLQUERYSURFACEPROC l_eglQuerySurface;
PFNEGLSWAPBUFFERSPROC l_eglSwapBuffers;
PFNEGLTERMINATEPROC l_eglTerminate;
PFNEGLWAITGLPROC l_eglWaitGL;
PFNEGLWAITNATIVEPROC l_eglWaitNative;
PFNEGLBINDTEXIMAGEPROC l_eglBindTexImage;
PFNEGLRELEASETEXIMAGEPROC l_eglReleaseTexImage;
PFNEGLSURFACEATTRIBPROC l_eglSurfaceAttrib;
PFNEGLSWAPINTERVALPROC l_eglSwapInterval;
PFNEGLBINDAPIPROC l_eglBindAPI;
PFNEGLQUERYAPIPROC l_eglQueryAPI;
PFNEGLCREATEPBUFFERFROMCLIENTBUFFERPROC l_eglCreatePbufferFromClientBuffer;
PFNEGLRELEASETHREADPROC l_eglReleaseThread;
PFNEGLWAITCLIENTPROC l_eglWaitClient;
PFNEGLGETCURRENTCONTEXTPROC l_eglGetCurrentContext;
PFNEGLCREATESYNCPROC l_eglCreateSync;
PFNEGLDESTROYSYNCPROC l_eglDestroySync;
PFNEGLCLIENTWAITSYNCPROC l_eglClientWaitSync;
PFNEGLGETSYNCATTRIBPROC l_eglGetSyncAttrib;
PFNEGLCREATEIMAGEPROC l_eglCreateImage;
PFNEGLDESTROYIMAGEPROC l_eglDestroyImage;
PFNEGLGETPLATFORMDISPLAYPROC l_eglGetPlatformDisplay;
PFNEGLCREATEPLATFORMWINDOWSURFACEPROC l_eglCreatePlatformWindowSurface;
PFNEGLCREATEPLATFORMPIXMAPSURFACEPROC l_eglCreatePlatformPixmapSurface;
PFNEGLWAITSYNCPROC l_eglWaitSync;
PFNEGLSETBLOBCACHEFUNCSANDROIDPROC l_eglSetBlobCacheFuncsANDROID;
PFNEGLCREATENATIVECLIENTBUFFERANDROIDPROC l_eglCreateNativeClientBufferANDROID;
PFNEGLGETCOMPOSITORTIMINGANDROIDPROC l_eglGetCompositorTimingANDROID;
PFNEGLGETCOMPOSITORTIMINGSUPPORTEDANDROIDPROC
    l_eglGetCompositorTimingSupportedANDROID;
PFNEGLGETFRAMETIMESTAMPSUPPORTEDANDROIDPROC
    l_eglGetFrameTimestampSupportedANDROID;
PFNEGLGETFRAMETIMESTAMPSANDROIDPROC l_eglGetFrameTimestampsANDROID;
PFNEGLGETNEXTFRAMEIDANDROIDPROC l_eglGetNextFrameIdANDROID;
PFNEGLGETNATIVECLIENTBUFFERANDROIDPROC l_eglGetNativeClientBufferANDROID;
PFNEGLDUPNATIVEFENCEFDANDROIDPROC l_eglDupNativeFenceFDANDROID;
PFNEGLPRESENTATIONTIMEANDROIDPROC l_eglPresentationTimeANDROID;
PFNEGLCREATEDEVICEANGLEPROC l_eglCreateDeviceANGLE;
PFNEGLRELEASEDEVICEANGLEPROC l_eglReleaseDeviceANGLE;
PFNEGLACQUIREEXTERNALCONTEXTANGLEPROC l_eglAcquireExternalContextANGLE;
PFNEGLRELEASEEXTERNALCONTEXTANGLEPROC l_eglReleaseExternalContextANGLE;
PFNEGLQUERYDISPLAYATTRIBANGLEPROC l_eglQueryDisplayAttribANGLE;
PFNEGLQUERYSTRINGIANGLEPROC l_eglQueryStringiANGLE;
PFNEGLCOPYMETALSHAREDEVENTANGLEPROC l_eglCopyMetalSharedEventANGLE;
PFNEGLFORCEGPUSWITCHANGLEPROC l_eglForceGPUSwitchANGLE;
PFNEGLHANDLEGPUSWITCHANGLEPROC l_eglHandleGPUSwitchANGLE;
PFNEGLREACQUIREHIGHPOWERGPUANGLEPROC l_eglReacquireHighPowerGPUANGLE;
PFNEGLRELEASEHIGHPOWERGPUANGLEPROC l_eglReleaseHighPowerGPUANGLE;
PFNEGLPREPARESWAPBUFFERSANGLEPROC l_eglPrepareSwapBuffersANGLE;
PFNEGLPROGRAMCACHEGETATTRIBANGLEPROC l_eglProgramCacheGetAttribANGLE;
PFNEGLPROGRAMCACHEPOPULATEANGLEPROC l_eglProgramCachePopulateANGLE;
PFNEGLPROGRAMCACHEQUERYANGLEPROC l_eglProgramCacheQueryANGLE;
PFNEGLPROGRAMCACHERESIZEANGLEPROC l_eglProgramCacheResizeANGLE;
PFNEGLQUERYSURFACEPOINTERANGLEPROC l_eglQuerySurfacePointerANGLE;
PFNEGLCREATESTREAMPRODUCERD3DTEXTUREANGLEPROC
    l_eglCreateStreamProducerD3DTextureANGLE;
PFNEGLSTREAMPOSTD3DTEXTUREANGLEPROC l_eglStreamPostD3DTextureANGLE;
PFNEGLSWAPBUFFERSWITHFRAMETOKENANGLEPROC l_eglSwapBuffersWithFrameTokenANGLE;
PFNEGLGETMSCRATEANGLEPROC l_eglGetMscRateANGLE;
PFNEGLEXPORTVKIMAGEANGLEPROC l_eglExportVkImageANGLE;
PFNEGLWAITUNTILWORKSCHEDULEDANGLEPROC l_eglWaitUntilWorkScheduledANGLE;
PFNEGLGETSYNCVALUESCHROMIUMPROC l_eglGetSyncValuesCHROMIUM;
PFNEGLQUERYDEVICEATTRIBEXTPROC l_eglQueryDeviceAttribEXT;
PFNEGLQUERYDEVICESTRINGEXTPROC l_eglQueryDeviceStringEXT;
PFNEGLQUERYDISPLAYATTRIBEXTPROC l_eglQueryDisplayAttribEXT;
PFNEGLQUERYDMABUFFORMATSEXTPROC l_eglQueryDmaBufFormatsEXT;
PFNEGLQUERYDMABUFMODIFIERSEXTPROC l_eglQueryDmaBufModifiersEXT;
PFNEGLCREATEPLATFORMPIXMAPSURFACEEXTPROC l_eglCreatePlatformPixmapSurfaceEXT;
PFNEGLCREATEPLATFORMWINDOWSURFACEEXTPROC l_eglCreatePlatformWindowSurfaceEXT;
PFNEGLGETPLATFORMDISPLAYEXTPROC l_eglGetPlatformDisplayEXT;
PFNEGLDEBUGMESSAGECONTROLKHRPROC l_eglDebugMessageControlKHR;
PFNEGLLABELOBJECTKHRPROC l_eglLabelObjectKHR;
PFNEGLQUERYDEBUGKHRPROC l_eglQueryDebugKHR;
PFNEGLCLIENTWAITSYNCKHRPROC l_eglClientWaitSyncKHR;
PFNEGLCREATESYNCKHRPROC l_eglCreateSyncKHR;
PFNEGLDESTROYSYNCKHRPROC l_eglDestroySyncKHR;
PFNEGLGETSYNCATTRIBKHRPROC l_eglGetSyncAttribKHR;
PFNEGLCREATEIMAGEKHRPROC l_eglCreateImageKHR;
PFNEGLDESTROYIMAGEKHRPROC l_eglDestroyImageKHR;
PFNEGLLOCKSURFACEKHRPROC l_eglLockSurfaceKHR;
PFNEGLQUERYSURFACE64KHRPROC l_eglQuerySurface64KHR;
PFNEGLUNLOCKSURFACEKHRPROC l_eglUnlockSurfaceKHR;
PFNEGLSETDAMAGEREGIONKHRPROC l_eglSetDamageRegionKHR;
PFNEGLSIGNALSYNCKHRPROC l_eglSignalSyncKHR;
PFNEGLCREATESTREAMKHRPROC l_eglCreateStreamKHR;
PFNEGLDESTROYSTREAMKHRPROC l_eglDestroyStreamKHR;
PFNEGLQUERYSTREAMKHRPROC l_eglQueryStreamKHR;
PFNEGLQUERYSTREAMU64KHRPROC l_eglQueryStreamu64KHR;
PFNEGLSTREAMATTRIBKHRPROC l_eglStreamAttribKHR;
PFNEGLSTREAMCONSUMERACQUIREKHRPROC l_eglStreamConsumerAcquireKHR;
PFNEGLSTREAMCONSUMERGLTEXTUREEXTERNALKHRPROC
    l_eglStreamConsumerGLTextureExternalKHR;
PFNEGLSTREAMCONSUMERRELEASEKHRPROC l_eglStreamConsumerReleaseKHR;
PFNEGLSWAPBUFFERSWITHDAMAGEKHRPROC l_eglSwapBuffersWithDamageKHR;
PFNEGLWAITSYNCKHRPROC l_eglWaitSyncKHR;
PFNEGLPOSTSUBBUFFERNVPROC l_eglPostSubBufferNV;
PFNEGLSTREAMCONSUMERGLTEXTUREEXTERNALATTRIBSNVPROC
    l_eglStreamConsumerGLTextureExternalAttribsNV;

void LoadEGL(LoadProc loadProc)
{
    l_eglChooseConfig  = reinterpret_cast<PFNEGLCHOOSECONFIGPROC>(loadProc("eglChooseConfig"));
    l_eglCopyBuffers   = reinterpret_cast<PFNEGLCOPYBUFFERSPROC>(loadProc("eglCopyBuffers"));
    l_eglCreateContext = reinterpret_cast<PFNEGLCREATECONTEXTPROC>(loadProc("eglCreateContext"));
    l_eglCreatePbufferSurface =
        reinterpret_cast<PFNEGLCREATEPBUFFERSURFACEPROC>(loadProc("eglCreatePbufferSurface"));
    l_eglCreatePixmapSurface =
        reinterpret_cast<PFNEGLCREATEPIXMAPSURFACEPROC>(loadProc("eglCreatePixmapSurface"));
    l_eglCreateWindowSurface =
        reinterpret_cast<PFNEGLCREATEWINDOWSURFACEPROC>(loadProc("eglCreateWindowSurface"));
    l_eglDestroyContext = reinterpret_cast<PFNEGLDESTROYCONTEXTPROC>(loadProc("eglDestroyContext"));
    l_eglDestroySurface = reinterpret_cast<PFNEGLDESTROYSURFACEPROC>(loadProc("eglDestroySurface"));
    l_eglGetConfigAttrib =
        reinterpret_cast<PFNEGLGETCONFIGATTRIBPROC>(loadProc("eglGetConfigAttrib"));
    l_eglGetConfigs = reinterpret_cast<PFNEGLGETCONFIGSPROC>(loadProc("eglGetConfigs"));
    l_eglGetCurrentDisplay =
        reinterpret_cast<PFNEGLGETCURRENTDISPLAYPROC>(loadProc("eglGetCurrentDisplay"));
    l_eglGetCurrentSurface =
        reinterpret_cast<PFNEGLGETCURRENTSURFACEPROC>(loadProc("eglGetCurrentSurface"));
    l_eglGetDisplay     = reinterpret_cast<PFNEGLGETDISPLAYPROC>(loadProc("eglGetDisplay"));
    l_eglGetError       = reinterpret_cast<PFNEGLGETERRORPROC>(loadProc("eglGetError"));
    l_eglGetProcAddress = reinterpret_cast<PFNEGLGETPROCADDRESSPROC>(loadProc("eglGetProcAddress"));
    l_eglInitialize     = reinterpret_cast<PFNEGLINITIALIZEPROC>(loadProc("eglInitialize"));
    l_eglMakeCurrent    = reinterpret_cast<PFNEGLMAKECURRENTPROC>(loadProc("eglMakeCurrent"));
    l_eglQueryContext   = reinterpret_cast<PFNEGLQUERYCONTEXTPROC>(loadProc("eglQueryContext"));
    l_eglQueryString    = reinterpret_cast<PFNEGLQUERYSTRINGPROC>(loadProc("eglQueryString"));
    l_eglQuerySurface   = reinterpret_cast<PFNEGLQUERYSURFACEPROC>(loadProc("eglQuerySurface"));
    l_eglSwapBuffers    = reinterpret_cast<PFNEGLSWAPBUFFERSPROC>(loadProc("eglSwapBuffers"));
    l_eglTerminate      = reinterpret_cast<PFNEGLTERMINATEPROC>(loadProc("eglTerminate"));
    l_eglWaitGL         = reinterpret_cast<PFNEGLWAITGLPROC>(loadProc("eglWaitGL"));
    l_eglWaitNative     = reinterpret_cast<PFNEGLWAITNATIVEPROC>(loadProc("eglWaitNative"));
    l_eglBindTexImage   = reinterpret_cast<PFNEGLBINDTEXIMAGEPROC>(loadProc("eglBindTexImage"));
    l_eglReleaseTexImage =
        reinterpret_cast<PFNEGLRELEASETEXIMAGEPROC>(loadProc("eglReleaseTexImage"));
    l_eglSurfaceAttrib = reinterpret_cast<PFNEGLSURFACEATTRIBPROC>(loadProc("eglSurfaceAttrib"));
    l_eglSwapInterval  = reinterpret_cast<PFNEGLSWAPINTERVALPROC>(loadProc("eglSwapInterval"));
    l_eglBindAPI       = reinterpret_cast<PFNEGLBINDAPIPROC>(loadProc("eglBindAPI"));
    l_eglQueryAPI      = reinterpret_cast<PFNEGLQUERYAPIPROC>(loadProc("eglQueryAPI"));
    l_eglCreatePbufferFromClientBuffer = reinterpret_cast<PFNEGLCREATEPBUFFERFROMCLIENTBUFFERPROC>(
        loadProc("eglCreatePbufferFromClientBuffer"));
    l_eglReleaseThread = reinterpret_cast<PFNEGLRELEASETHREADPROC>(loadProc("eglReleaseThread"));
    l_eglWaitClient    = reinterpret_cast<PFNEGLWAITCLIENTPROC>(loadProc("eglWaitClient"));
    l_eglGetCurrentContext =
        reinterpret_cast<PFNEGLGETCURRENTCONTEXTPROC>(loadProc("eglGetCurrentContext"));
    l_eglCreateSync     = reinterpret_cast<PFNEGLCREATESYNCPROC>(loadProc("eglCreateSync"));
    l_eglDestroySync    = reinterpret_cast<PFNEGLDESTROYSYNCPROC>(loadProc("eglDestroySync"));
    l_eglClientWaitSync = reinterpret_cast<PFNEGLCLIENTWAITSYNCPROC>(loadProc("eglClientWaitSync"));
    l_eglGetSyncAttrib  = reinterpret_cast<PFNEGLGETSYNCATTRIBPROC>(loadProc("eglGetSyncAttrib"));
    l_eglCreateImage    = reinterpret_cast<PFNEGLCREATEIMAGEPROC>(loadProc("eglCreateImage"));
    l_eglDestroyImage   = reinterpret_cast<PFNEGLDESTROYIMAGEPROC>(loadProc("eglDestroyImage"));
    l_eglGetPlatformDisplay =
        reinterpret_cast<PFNEGLGETPLATFORMDISPLAYPROC>(loadProc("eglGetPlatformDisplay"));
    l_eglCreatePlatformWindowSurface = reinterpret_cast<PFNEGLCREATEPLATFORMWINDOWSURFACEPROC>(
        loadProc("eglCreatePlatformWindowSurface"));
    l_eglCreatePlatformPixmapSurface = reinterpret_cast<PFNEGLCREATEPLATFORMPIXMAPSURFACEPROC>(
        loadProc("eglCreatePlatformPixmapSurface"));
    l_eglWaitSync                 = reinterpret_cast<PFNEGLWAITSYNCPROC>(loadProc("eglWaitSync"));
    l_eglSetBlobCacheFuncsANDROID = reinterpret_cast<PFNEGLSETBLOBCACHEFUNCSANDROIDPROC>(
        loadProc("eglSetBlobCacheFuncsANDROID"));
    l_eglCreateNativeClientBufferANDROID =
        reinterpret_cast<PFNEGLCREATENATIVECLIENTBUFFERANDROIDPROC>(
            loadProc("eglCreateNativeClientBufferANDROID"));
    l_eglGetCompositorTimingANDROID = reinterpret_cast<PFNEGLGETCOMPOSITORTIMINGANDROIDPROC>(
        loadProc("eglGetCompositorTimingANDROID"));
    l_eglGetCompositorTimingSupportedANDROID =
        reinterpret_cast<PFNEGLGETCOMPOSITORTIMINGSUPPORTEDANDROIDPROC>(
            loadProc("eglGetCompositorTimingSupportedANDROID"));
    l_eglGetFrameTimestampSupportedANDROID =
        reinterpret_cast<PFNEGLGETFRAMETIMESTAMPSUPPORTEDANDROIDPROC>(
            loadProc("eglGetFrameTimestampSupportedANDROID"));
    l_eglGetFrameTimestampsANDROID = reinterpret_cast<PFNEGLGETFRAMETIMESTAMPSANDROIDPROC>(
        loadProc("eglGetFrameTimestampsANDROID"));
    l_eglGetNextFrameIdANDROID =
        reinterpret_cast<PFNEGLGETNEXTFRAMEIDANDROIDPROC>(loadProc("eglGetNextFrameIdANDROID"));
    l_eglGetNativeClientBufferANDROID = reinterpret_cast<PFNEGLGETNATIVECLIENTBUFFERANDROIDPROC>(
        loadProc("eglGetNativeClientBufferANDROID"));
    l_eglDupNativeFenceFDANDROID =
        reinterpret_cast<PFNEGLDUPNATIVEFENCEFDANDROIDPROC>(loadProc("eglDupNativeFenceFDANDROID"));
    l_eglPresentationTimeANDROID =
        reinterpret_cast<PFNEGLPRESENTATIONTIMEANDROIDPROC>(loadProc("eglPresentationTimeANDROID"));
    l_eglCreateDeviceANGLE =
        reinterpret_cast<PFNEGLCREATEDEVICEANGLEPROC>(loadProc("eglCreateDeviceANGLE"));
    l_eglReleaseDeviceANGLE =
        reinterpret_cast<PFNEGLRELEASEDEVICEANGLEPROC>(loadProc("eglReleaseDeviceANGLE"));
    l_eglAcquireExternalContextANGLE = reinterpret_cast<PFNEGLACQUIREEXTERNALCONTEXTANGLEPROC>(
        loadProc("eglAcquireExternalContextANGLE"));
    l_eglReleaseExternalContextANGLE = reinterpret_cast<PFNEGLRELEASEEXTERNALCONTEXTANGLEPROC>(
        loadProc("eglReleaseExternalContextANGLE"));
    l_eglQueryDisplayAttribANGLE =
        reinterpret_cast<PFNEGLQUERYDISPLAYATTRIBANGLEPROC>(loadProc("eglQueryDisplayAttribANGLE"));
    l_eglQueryStringiANGLE =
        reinterpret_cast<PFNEGLQUERYSTRINGIANGLEPROC>(loadProc("eglQueryStringiANGLE"));
    l_eglCopyMetalSharedEventANGLE = reinterpret_cast<PFNEGLCOPYMETALSHAREDEVENTANGLEPROC>(
        loadProc("eglCopyMetalSharedEventANGLE"));
    l_eglForceGPUSwitchANGLE =
        reinterpret_cast<PFNEGLFORCEGPUSWITCHANGLEPROC>(loadProc("eglForceGPUSwitchANGLE"));
    l_eglHandleGPUSwitchANGLE =
        reinterpret_cast<PFNEGLHANDLEGPUSWITCHANGLEPROC>(loadProc("eglHandleGPUSwitchANGLE"));
    l_eglReacquireHighPowerGPUANGLE = reinterpret_cast<PFNEGLREACQUIREHIGHPOWERGPUANGLEPROC>(
        loadProc("eglReacquireHighPowerGPUANGLE"));
    l_eglReleaseHighPowerGPUANGLE = reinterpret_cast<PFNEGLRELEASEHIGHPOWERGPUANGLEPROC>(
        loadProc("eglReleaseHighPowerGPUANGLE"));
    l_eglPrepareSwapBuffersANGLE =
        reinterpret_cast<PFNEGLPREPARESWAPBUFFERSANGLEPROC>(loadProc("eglPrepareSwapBuffersANGLE"));
    l_eglProgramCacheGetAttribANGLE = reinterpret_cast<PFNEGLPROGRAMCACHEGETATTRIBANGLEPROC>(
        loadProc("eglProgramCacheGetAttribANGLE"));
    l_eglProgramCachePopulateANGLE = reinterpret_cast<PFNEGLPROGRAMCACHEPOPULATEANGLEPROC>(
        loadProc("eglProgramCachePopulateANGLE"));
    l_eglProgramCacheQueryANGLE =
        reinterpret_cast<PFNEGLPROGRAMCACHEQUERYANGLEPROC>(loadProc("eglProgramCacheQueryANGLE"));
    l_eglProgramCacheResizeANGLE =
        reinterpret_cast<PFNEGLPROGRAMCACHERESIZEANGLEPROC>(loadProc("eglProgramCacheResizeANGLE"));
    l_eglQuerySurfacePointerANGLE = reinterpret_cast<PFNEGLQUERYSURFACEPOINTERANGLEPROC>(
        loadProc("eglQuerySurfacePointerANGLE"));
    l_eglCreateStreamProducerD3DTextureANGLE =
        reinterpret_cast<PFNEGLCREATESTREAMPRODUCERD3DTEXTUREANGLEPROC>(
            loadProc("eglCreateStreamProducerD3DTextureANGLE"));
    l_eglStreamPostD3DTextureANGLE = reinterpret_cast<PFNEGLSTREAMPOSTD3DTEXTUREANGLEPROC>(
        loadProc("eglStreamPostD3DTextureANGLE"));
    l_eglSwapBuffersWithFrameTokenANGLE =
        reinterpret_cast<PFNEGLSWAPBUFFERSWITHFRAMETOKENANGLEPROC>(
            loadProc("eglSwapBuffersWithFrameTokenANGLE"));
    l_eglGetMscRateANGLE =
        reinterpret_cast<PFNEGLGETMSCRATEANGLEPROC>(loadProc("eglGetMscRateANGLE"));
    l_eglExportVkImageANGLE =
        reinterpret_cast<PFNEGLEXPORTVKIMAGEANGLEPROC>(loadProc("eglExportVkImageANGLE"));
    l_eglWaitUntilWorkScheduledANGLE = reinterpret_cast<PFNEGLWAITUNTILWORKSCHEDULEDANGLEPROC>(
        loadProc("eglWaitUntilWorkScheduledANGLE"));
    l_eglGetSyncValuesCHROMIUM =
        reinterpret_cast<PFNEGLGETSYNCVALUESCHROMIUMPROC>(loadProc("eglGetSyncValuesCHROMIUM"));
    l_eglQueryDeviceAttribEXT =
        reinterpret_cast<PFNEGLQUERYDEVICEATTRIBEXTPROC>(loadProc("eglQueryDeviceAttribEXT"));
    l_eglQueryDeviceStringEXT =
        reinterpret_cast<PFNEGLQUERYDEVICESTRINGEXTPROC>(loadProc("eglQueryDeviceStringEXT"));
    l_eglQueryDisplayAttribEXT =
        reinterpret_cast<PFNEGLQUERYDISPLAYATTRIBEXTPROC>(loadProc("eglQueryDisplayAttribEXT"));
    l_eglQueryDmaBufFormatsEXT =
        reinterpret_cast<PFNEGLQUERYDMABUFFORMATSEXTPROC>(loadProc("eglQueryDmaBufFormatsEXT"));
    l_eglQueryDmaBufModifiersEXT =
        reinterpret_cast<PFNEGLQUERYDMABUFMODIFIERSEXTPROC>(loadProc("eglQueryDmaBufModifiersEXT"));
    l_eglCreatePlatformPixmapSurfaceEXT =
        reinterpret_cast<PFNEGLCREATEPLATFORMPIXMAPSURFACEEXTPROC>(
            loadProc("eglCreatePlatformPixmapSurfaceEXT"));
    l_eglCreatePlatformWindowSurfaceEXT =
        reinterpret_cast<PFNEGLCREATEPLATFORMWINDOWSURFACEEXTPROC>(
            loadProc("eglCreatePlatformWindowSurfaceEXT"));
    l_eglGetPlatformDisplayEXT =
        reinterpret_cast<PFNEGLGETPLATFORMDISPLAYEXTPROC>(loadProc("eglGetPlatformDisplayEXT"));
    l_eglDebugMessageControlKHR =
        reinterpret_cast<PFNEGLDEBUGMESSAGECONTROLKHRPROC>(loadProc("eglDebugMessageControlKHR"));
    l_eglLabelObjectKHR = reinterpret_cast<PFNEGLLABELOBJECTKHRPROC>(loadProc("eglLabelObjectKHR"));
    l_eglQueryDebugKHR  = reinterpret_cast<PFNEGLQUERYDEBUGKHRPROC>(loadProc("eglQueryDebugKHR"));
    l_eglClientWaitSyncKHR =
        reinterpret_cast<PFNEGLCLIENTWAITSYNCKHRPROC>(loadProc("eglClientWaitSyncKHR"));
    l_eglCreateSyncKHR  = reinterpret_cast<PFNEGLCREATESYNCKHRPROC>(loadProc("eglCreateSyncKHR"));
    l_eglDestroySyncKHR = reinterpret_cast<PFNEGLDESTROYSYNCKHRPROC>(loadProc("eglDestroySyncKHR"));
    l_eglGetSyncAttribKHR =
        reinterpret_cast<PFNEGLGETSYNCATTRIBKHRPROC>(loadProc("eglGetSyncAttribKHR"));
    l_eglCreateImageKHR = reinterpret_cast<PFNEGLCREATEIMAGEKHRPROC>(loadProc("eglCreateImageKHR"));
    l_eglDestroyImageKHR =
        reinterpret_cast<PFNEGLDESTROYIMAGEKHRPROC>(loadProc("eglDestroyImageKHR"));
    l_eglLockSurfaceKHR = reinterpret_cast<PFNEGLLOCKSURFACEKHRPROC>(loadProc("eglLockSurfaceKHR"));
    l_eglQuerySurface64KHR =
        reinterpret_cast<PFNEGLQUERYSURFACE64KHRPROC>(loadProc("eglQuerySurface64KHR"));
    l_eglUnlockSurfaceKHR =
        reinterpret_cast<PFNEGLUNLOCKSURFACEKHRPROC>(loadProc("eglUnlockSurfaceKHR"));
    l_eglSetDamageRegionKHR =
        reinterpret_cast<PFNEGLSETDAMAGEREGIONKHRPROC>(loadProc("eglSetDamageRegionKHR"));
    l_eglSignalSyncKHR = reinterpret_cast<PFNEGLSIGNALSYNCKHRPROC>(loadProc("eglSignalSyncKHR"));
    l_eglCreateStreamKHR =
        reinterpret_cast<PFNEGLCREATESTREAMKHRPROC>(loadProc("eglCreateStreamKHR"));
    l_eglDestroyStreamKHR =
        reinterpret_cast<PFNEGLDESTROYSTREAMKHRPROC>(loadProc("eglDestroyStreamKHR"));
    l_eglQueryStreamKHR = reinterpret_cast<PFNEGLQUERYSTREAMKHRPROC>(loadProc("eglQueryStreamKHR"));
    l_eglQueryStreamu64KHR =
        reinterpret_cast<PFNEGLQUERYSTREAMU64KHRPROC>(loadProc("eglQueryStreamu64KHR"));
    l_eglStreamAttribKHR =
        reinterpret_cast<PFNEGLSTREAMATTRIBKHRPROC>(loadProc("eglStreamAttribKHR"));
    l_eglStreamConsumerAcquireKHR = reinterpret_cast<PFNEGLSTREAMCONSUMERACQUIREKHRPROC>(
        loadProc("eglStreamConsumerAcquireKHR"));
    l_eglStreamConsumerGLTextureExternalKHR =
        reinterpret_cast<PFNEGLSTREAMCONSUMERGLTEXTUREEXTERNALKHRPROC>(
            loadProc("eglStreamConsumerGLTextureExternalKHR"));
    l_eglStreamConsumerReleaseKHR = reinterpret_cast<PFNEGLSTREAMCONSUMERRELEASEKHRPROC>(
        loadProc("eglStreamConsumerReleaseKHR"));
    l_eglSwapBuffersWithDamageKHR = reinterpret_cast<PFNEGLSWAPBUFFERSWITHDAMAGEKHRPROC>(
        loadProc("eglSwapBuffersWithDamageKHR"));
    l_eglWaitSyncKHR = reinterpret_cast<PFNEGLWAITSYNCKHRPROC>(loadProc("eglWaitSyncKHR"));
    l_eglPostSubBufferNV =
        reinterpret_cast<PFNEGLPOSTSUBBUFFERNVPROC>(loadProc("eglPostSubBufferNV"));
    l_eglStreamConsumerGLTextureExternalAttribsNV =
        reinterpret_cast<PFNEGLSTREAMCONSUMERGLTEXTUREEXTERNALATTRIBSNVPROC>(
            loadProc("eglStreamConsumerGLTextureExternalAttribsNV"));
}
}  // extern "C"
