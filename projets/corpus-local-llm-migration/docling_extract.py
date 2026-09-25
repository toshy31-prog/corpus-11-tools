#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys
from pathlib import Path
from corpus_paths import CAPABILITIES_RUNTIME_ROOT
ROOT=Path(os.environ.get("CORPUS_ROOT", Path.cwd())).resolve()

def main():
    if len(sys.argv)!=3:
        raise SystemExit("usage: docling_extract.py PATH MAX_CHARS")
    p=Path(sys.argv[1]).expanduser().resolve()
    try: p.relative_to(ROOT)
    except ValueError: raise SystemExit("path outside Corpus root")
    if not p.is_file(): raise SystemExit("file not found")
    limit=max(1000,min(int(sys.argv[2]),250000))
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import PdfFormatOption

    options = PdfPipelineOptions()
    options.artifacts_path = CAPABILITIES_RUNTIME_ROOT / 'docling-artifacts'

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=options
            )
        }
    )
    result=converter.convert(str(p))
    text=result.document.export_to_markdown()
    original=len(text)
    truncated=original>limit
    if truncated: text=text[:limit]+"\n\n[TRUNCATED BY CORPUS]"
    print(json.dumps({"ok":True,"path":str(p),"format":"markdown",
        "truncated":truncated,"original_characters":original,
        "returned_characters":len(text),"content":text},ensure_ascii=False))
if __name__=="__main__": main()
