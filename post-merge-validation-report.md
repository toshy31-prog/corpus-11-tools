# Post-merge validation report

- base: `f8e3fe522aea9e437cb07482f02317822e02c8ad`
- validated head: `3bf1eb6ff14e508ee62adb233a7aa143c61e19e7`
- runner: GitHub Actions / `ubuntu-latest`
- generated UTC: `2026-08-18T22:49:47Z`

## Package validator

- exit code: `0`
- verdict: **PASS**

## Graph validator

- exit code: `0`
- verdict: **PASS**

## Documentation validator

- exit code: `0`
- verdict: **PASS**

## Product/research boundary validator

- exit code: `1`
- verdict: **FAIL**

```text
FAIL
 - accepted transfer lacks Destination or Vérification: transfers/accepted/epistemic-trajectory-governance.md

```

## Python test discovery

- exit code: `2`
- verdict: **FAIL**

```text

==================================== ERRORS ====================================
_ ERROR collecting corpus-11-tools/labs/python/tests/test_institutional_protocol.py _
ImportError while importing test module '/home/runner/work/corpus-11-tools/corpus-11-tools/corpus-11-tools/labs/python/tests/test_institutional_protocol.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
corpus-11-tools/labs/python/tests/test_institutional_protocol.py:9: in <module>
    from corpus_labs import EventStore, InstitutionalService, ProtocolError, StoreError
E   ModuleNotFoundError: No module named 'corpus_labs'
_ ERROR collecting corpus-11-tools/labs/python/tests/test_json_schema_subset.py _
ImportError while importing test module '/home/runner/work/corpus-11-tools/corpus-11-tools/corpus-11-tools/labs/python/tests/test_json_schema_subset.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
corpus-11-tools/labs/python/tests/test_json_schema_subset.py:5: in <module>
    from corpus_labs import JsonSchemaSubsetError, validate_json_schema_subset
E   ModuleNotFoundError: No module named 'corpus_labs'
_ ERROR collecting corpus-11-tools/labs/python/tests/test_simulation_campaign.py _
ImportError while importing test module '/home/runner/work/corpus-11-tools/corpus-11-tools/corpus-11-tools/labs/python/tests/test_simulation_campaign.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
/opt/hostedtoolcache/Python/3.12.13/x64/lib/python3.12/importlib/__init__.py:90: in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
corpus-11-tools/labs/python/tests/test_simulation_campaign.py:5: in <module>
    from corpus_labs.simulation_campaign import (
E   ModuleNotFoundError: No module named 'corpus_labs'
=========================== short test summary info ============================
ERROR corpus-11-tools/labs/python/tests/test_institutional_protocol.py
ERROR corpus-11-tools/labs/python/tests/test_json_schema_subset.py
ERROR corpus-11-tools/labs/python/tests/test_simulation_campaign.py
!!!!!!!!!!!!!!!!!!! Interrupted: 3 errors during collection !!!!!!!!!!!!!!!!!!!!
3 errors in 0.56s

```

## Node test discovery

- exit code: `1`
- verdict: **FAIL**

```text
    moduleResolve (node:internal/modules/esm/resolve:861:10)
    defaultResolve (node:internal/modules/esm/resolve:985:11)
    #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)
    ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)
    ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:320:38)
    onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:680:36)
    TracingChannel.tracePromise (node:diagnostics_channel:350:14)
    ModuleLoader.import (node:internal/modules/esm/loader:679:21)
    defaultImportModuleDynamicallyForModule (node:internal/modules/esm/utils:222:31)
  ...
# Subtest: marks external destinations safely
not ok 137 - marks external destinations safely
  ---
  duration_ms: 0.502185
  type: 'test'
  location: '/home/runner/work/corpus-11-tools/corpus-11-tools/research/completed/food-access-paris/site/tests/rendered-html.test.mjs:49:1'
  failureType: 'testCodeFailure'
  error: "Cannot find module '/home/runner/work/corpus-11-tools/corpus-11-tools/research/completed/food-access-paris/site/dist/server/index.js' imported from /home/runner/work/corpus-11-tools/corpus-11-tools/research/completed/food-access-paris/site/tests/rendered-html.test.mjs"
  code: 'ERR_MODULE_NOT_FOUND'
  stack: |-
    finalizeResolution (node:internal/modules/esm/resolve:275:11)
    moduleResolve (node:internal/modules/esm/resolve:861:10)
    defaultResolve (node:internal/modules/esm/resolve:985:11)
    #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)
    ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)
    ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:320:38)
    onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:680:36)
    TracingChannel.tracePromise (node:diagnostics_channel:350:14)
    ModuleLoader.import (node:internal/modules/esm/loader:679:21)
    defaultImportModuleDynamicallyForModule (node:internal/modules/esm/utils:222:31)
  ...
1..137
# tests 137
# suites 0
# pass 135
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3636.730858

```

## CCT integration controls

- exit code: `0`
- verdict: **PASS**

## Completed food-access prototype

- exit code: `0`
- verdict: **PASS**

## Tracked JSON and JSONL integrity

- exit code: `0`
- verdict: **PASS**

## Patch whitespace integrity

- exit code: `0`
- verdict: **PASS**

## Final verdict

**FAIL — at least one reception control failed.**
