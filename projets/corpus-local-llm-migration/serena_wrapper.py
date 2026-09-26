#!/usr/bin/env python3
import os
from corpus_paths import LOCAL_RUNTIME_ROOT,REPO_ROOT
exe=LOCAL_RUNTIME_ROOT/'corpus-tools/serena-env/bin/serena';os.environ.setdefault('UV_OFFLINE','1');os.execv(str(exe),[str(exe),'start-mcp-server','--project',str(REPO_ROOT)])
