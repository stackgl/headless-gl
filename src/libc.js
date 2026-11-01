// binding.gyp runs this on Linux to choose which ANGLE libraries to copy, and it prints musl or glibc.
// It decides the same way prebuild-install does when it picks a prebuilt binary, so the LIBC environment variable and npm's --libc option apply to source builds too.
const detectLibc = require('detect-libc')

const libc = process.env.LIBC || process.env.npm_config_libc || (detectLibc.isNonGlibcLinuxSync() && detectLibc.familySync())
console.log(libc === detectLibc.MUSL ? 'musl' : 'glibc')
