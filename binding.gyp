{
  'variables': {
    'platform': '<(OS)',
    'openssl_fips' : '0',
  },
  'conditions': [
    ['platform == "mac"', {'variables': {'platform': 'darwin'}}],
    ['platform == "win"', {'variables': {'platform': 'win32'}}]
  ],
  'targets': [
    {
      'target_name': 'webgl',
      'defines': [
        'VERSION=1.0.0'
      ],
      'sources': [
          'src/native/bindings.cc',
          'src/native/webgl.cc',
          'src/native/SharedLibrary.cc',
          'src/native/angle-loader/egl_loader.cc',
          'src/native/angle-loader/gles_loader.cc'
      ],
      'include_dirs': [
        "<!(node -e \"require('nan')\")",
        '<(module_root_dir)/deps/include',
        "src/native/angle-includes"
      ],
      'library_dirs': [
        '<(module_root_dir)/deps/<(platform)'
      ],
      'conditions': [
        ['OS=="mac"', {
            'libraries': [
                '-framework QuartzCore',
                '-framework Quartz'
            ],
            'xcode_settings': {
              'GCC_ENABLE_CPP_RTTI': 'YES',
              'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
              'MACOSX_DEPLOYMENT_TARGET':'10.8',
              'CLANG_CXX_LIBRARY': 'libc++',
              'CLANG_CXX_LANGUAGE_STANDARD':'c++17',
              'GCC_VERSION': 'com.apple.compilers.llvm.clang.1_0'
            },
            "copies": [
              {
                'destination': '<(PRODUCT_DIR)',
                'files': [
                  '<(module_root_dir)/deps/darwin/dylib/libEGL.dylib',
                  '<(module_root_dir)/deps/darwin/dylib/libGLESv2.dylib',
                ]
              }
           ]
        }],
        ['OS=="linux" and target_arch=="arm64"', {
            "copies": [
              {
                'destination': '<(PRODUCT_DIR)',
                'files': [
                  '<(module_root_dir)/deps/linux-arm64/so/libEGL.so',
                  '<(module_root_dir)/deps/linux-arm64/so/libGLESv2.so',
                ]
              }
           ]
        }],
        ['OS=="linux" and target_arch=="x64"', {
            "copies": [
              {
                'destination': '<(PRODUCT_DIR)',
                'files': [
                  '<(module_root_dir)/deps/linux/so/libEGL.so',
                  '<(module_root_dir)/deps/linux/so/libGLESv2.so',
                ]
              }
           ]
        }],
        ['OS=="win"', {
            'defines' : [
              'WIN32_LEAN_AND_MEAN',
              'VC_EXTRALEAN'
            ],
            'configurations': {
              'Release': {
                'msvs_settings': {
                  'VCCLCompilerTool': {
                    'RuntimeLibrary': 0, # static release
                    'Optimization': 0, # /Od, disabled
                    'FavorSizeOrSpeed': 1, # /Ot, favour speed over size
                    'InlineFunctionExpansion': 2, # /Ob2, inline anything eligible
                    'WholeProgramOptimization': 'false', # No
                    'OmitFramePointers': 'true',
                    'EnableFunctionLevelLinking': 'true',
                    'EnableIntrinsicFunctions': 'true',
                    'RuntimeTypeInfo': 'false',
                    'ExceptionHandling': '0',
                    'AdditionalOptions': [
                      '/MP', # compile across multiple CPUs
                    ]
                  },
                  'VCLinkerTool': {
                    'LinkTimeCodeGeneration': 0, # Link Time Code generation default
                    'OptimizeReferences': 1, # /OPT:NOREF
                    'EnableCOMDATFolding': 1, # /OPT:NOICF
                    'LinkIncremental': 2, # /INCREMENTAL
                    'AdditionalOptions': [
                      '/LTCG:OFF',
                    ]
                  }
                },
                'msvs_configuration_attributes':
                {
                    'OutputDirectory': '$(SolutionDir)$(ConfigurationName)',
                    'IntermediateDirectory': '$(OutDir)\\obj\\$(ProjectName)'
                }
              }
            },
            "copies": [
              {
                'destination': '<(PRODUCT_DIR)',
                'files': [
                  '<(module_root_dir)/deps/windows/dll/libEGL.dll',
                  '<(module_root_dir)/deps/windows/dll/libGLESv2.dll',
                  '<(module_root_dir)/deps/windows/dll/d3dcompiler_47.dll'
                ]
              }
           ]
          }
        ]
      ]
    }
  ]
}
