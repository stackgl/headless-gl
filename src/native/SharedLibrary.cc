#include <array>
#include <string>

#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#endif

#ifdef _WIN32
std::string Narrow(const std::wstring_view &utf16) {
  if (utf16.empty()) {
    return {};
  }
  int requiredSize = WideCharToMultiByte(CP_UTF8, 0, utf16.data(), static_cast<int>(utf16.size()),
                                         nullptr, 0, nullptr, nullptr);
  std::string utf8(requiredSize, '\0');
  WideCharToMultiByte(CP_UTF8, 0, utf16.data(), static_cast<int>(utf16.size()), &utf8[0],
                      requiredSize, nullptr, nullptr);
  return utf8;
}

std::string GetPath(HMODULE module) {
  std::array<wchar_t, MAX_PATH> executableFileBuf;
  DWORD executablePathLen = GetModuleFileNameW(module, executableFileBuf.data(),
                                               static_cast<DWORD>(executableFileBuf.size()));
  return Narrow(executablePathLen > 0 ? executableFileBuf.data() : L"");
}

std::string GetModulePath(void *moduleOrSymbol) {
  HMODULE module = nullptr;
  if (GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
                             GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                         reinterpret_cast<LPCWSTR>(moduleOrSymbol), &module)) {
    return GetPath(module);
  }

  return "";
}
#else
std::string GetModulePath(void *moduleOrSymbol) {
  Dl_info dlInfo;
  if (dladdr(moduleOrSymbol, &dlInfo) == 0) {
    return "";
  }

  return dlInfo.dli_fname;
}
#endif

std::string StripFilenameFromPath(const std::string &path) {
  size_t lastPathSepLoc = path.find_last_of("\\/");
  return (lastPathSepLoc != std::string::npos) ? path.substr(0, lastPathSepLoc) : "";
}

std::string GetModuleDirectory() {
  static int placeholderSymbol = 0;
  std::string moduleName = GetModulePath(&placeholderSymbol);
  return StripFilenameFromPath(moduleName);
}
