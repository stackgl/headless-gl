{
  'variables': {
    'platform': '<(OS)',
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
          'src/bindings.cc',
          'src/webgl.cc',
          'src/procs.cc'
      ],
      'include_dirs': [
        "<!(node -e \"require('nan')\")",
        '<(module_root_dir)/deps/include',
        "angle/include"
      ],
      'library_dirs': [
        '<(module_root_dir)/deps/<(platform)'
      ],
      'dependencies':
      [
        'angle/src/angle.gyp:libEGL',
        'angle/src/angle.gyp:libGLESv2'
      ],
      'conditions': [
        ['OS=="mac"', {
            'libraries': [
                '-framework QuartzCore',
                '-framework Quartz'
            ]
        }],
        ['OS=="linux"', {
        }],
        ['OS=="win"', {
            'library_dirs': [
              '<(module_root_dir)/build/$(Configuration)_$(Platform)/lib',
            ],
            'libraries': [
              'libEGL.lib',
              'libGLESv2.lib'
            ],
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
                'destination': '$(SolutionDir)$(ConfigurationName)',
                'files': [
                  '<(module_root_dir)/build/$(Configuration)_$(Platform)/libEGL.dll',
                  '<(module_root_dir)/build/$(Configuration)_$(Platform)/libGLESv2.dll'
                ]
              }
           ]
          }
        ]
      ]
    }
  ]
}
