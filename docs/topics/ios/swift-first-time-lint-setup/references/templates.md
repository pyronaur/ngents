# Templates

## .swiftlint.yml (tests excluded)
```yaml
included:
  - App
  - Sources
  - Packages

excluded:
  - Build
  - .derivedData
  - .build
  - Tests
  - UITests

reporter: "xcode"

analyzer_rules:
  - unused_declaration
  - unused_import

opt_in_rules:
  - array_init
  - closure_end_indentation
  - closure_spacing
  - collection_alignment
  - contains_over_filter_count
  - contains_over_filter_is_empty
  - contains_over_first_not_nil
  - contains_over_range_nil_comparison
  - convenience_type
  - discouraged_direct_init
  - discouraged_object_literal
  - discouraged_optional_boolean
  - discouraged_optional_collection
  - empty_collection_literal
  - empty_count
  - empty_string
  - empty_xctest_method
  - explicit_init
  - fatal_error_message
  - first_where
  - flatmap_over_map_reduce
  - force_try
  - force_unwrapping
  - identical_operands
  - joined_default_parameter
  - last_where
  - let_var_whitespace
  - literal_expression_end_indentation
  - multiline_arguments
  - multiline_function_chains
  - multiline_parameters
  - multiline_parameters_brackets
  - operator_usage_whitespace
  - optional_enum_case_matching
  - override_in_extension
  - prefer_zero_over_explicit_init
  - reduce_into
  - redundant_nil_coalescing
  - redundant_type_annotation
  - sorted_imports
  - static_operator
  - toggle_bool
  - unneeded_parentheses_in_closure_argument
  - unused_optional_binding
  - vertical_parameter_alignment_on_call
  - weak_delegate

cyclomatic_complexity:
  warning: 10
  error: 15

file_length:
  warning: 500
  error: 800

function_body_length:
  warning: 80
  error: 120

type_body_length:
  warning: 300
  error: 450

identifier_name:
  min_length:
    warning: 2
    error: 1
  max_length:
    warning: 40
    error: 60
  excluded:
    - id
    - url
    - ui
    - x
    - y
    - z
    - i
    - j
    - k

type_name:
  min_length:
    warning: 3
    error: 2
  max_length:
    warning: 40
    error: 60

line_length:
  warning: 120
  error: 160
  ignores_comments: true
  ignores_urls: true
  ignores_interpolated_strings: true

nesting:
  type_level: 2
  function_level: 5

large_tuple:
  warning: 3
  error: 4
```

## .periphery.yml (index-store, no build)
```yaml
project: App.xcworkspace
schemes:
  - App
index_store_path: .derivedData/Index.noindex/DataStore
skip_build: true

retain_public: true
retain_objc_accessible: true
retain_assign_only_properties: true
retain_unused_protocol_func_params: true
```

## .jscpd.json (strict duplication)
```json
{
  "threshold": 0,
  "reporters": ["console"],
  "minLines": 5,
  "minTokens": 70,
  "ignore": [
    "**/.derivedData/**",
    "**/Build/**",
    "**/.build/**",
    "**/Package.resolved",
    "**/Tests/**",
    "**/UITests/**"
  ]
}
```

## Makefile snippet
```make
SWIFTLINT := swiftlint
PERIPHERY := periphery
BUNX := bunx
SWIFTLINT_BUILD_LOG := .swiftlint-build.log

lint: lint-swift lint-analyze lint-unused lint-dup

lint-swift:
	$(SWIFTLINT) lint --config .swiftlint.yml --strict

lint-analyze:
	xcodebuild clean build \
		-workspace "$(WORKSPACE)" \
		-scheme "$(SCHEME)" \
		-derivedDataPath "$(DERIVED_DATA)" \
		-destination "platform=iOS Simulator,name=$(IPHONE_SIMULATOR)" \
		| tee "$(SWIFTLINT_BUILD_LOG)"
	$(SWIFTLINT) analyze --config .swiftlint.yml --strict \
		--compiler-log-path "$(SWIFTLINT_BUILD_LOG)"

lint-unused:
	$(PERIPHERY) scan --config .periphery.yml --strict --exclude-tests

lint-dup:
	$(BUNX) jscpd --config .jscpd.json $(JSCPD_PATHS)
```
