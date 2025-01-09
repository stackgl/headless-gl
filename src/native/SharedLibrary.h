#pragma once

#include <iostream>
#include <stdexcept>
#include <string>

#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#endif

inline std::string GetSharedLibraryExtension() {
#ifdef _WIN32
  return ".dll"; // Windows
#elif __APPLE__
  return ".dylib"; // OSX
#elif __linux__
  return ".so"; // Linux
#else
#error Unsupported platform
#endif
}

std::string GetModuleDirectory();

class SharedLibrary {
public:
  SharedLibrary() {}

  bool open(const std::string &libraryPath) {
    const std::string libraryPathWithExt =
        GetModuleDirectory() + "/" + libraryPath + GetSharedLibraryExtension();
#ifdef _WIN32
    handle = LoadLibraryA(libraryPathWithExt.c_str());
#else
    handle = dlopen(libraryPathWithExt.c_str(), RTLD_LAZY);
#endif
    return handle != nullptr;
  }

  ~SharedLibrary() {
    if (handle) {
#ifdef _WIN32
      FreeLibrary(static_cast<HMODULE>(handle));
#else
      dlclose(handle);
#endif
    }
  }

  template <typename Func> Func getFunction(const std::string &functionName) {
#ifdef _WIN32
    auto func =
        reinterpret_cast<Func>(GetProcAddress(static_cast<HMODULE>(handle), functionName.c_str()));
#else
    auto func = reinterpret_cast<Func>(dlsym(handle, functionName.c_str()));
#endif
    return func;
  }

private:
  void *handle = nullptr;
};
