from pathlib import Path

p = Path("lib/evidence-algebra.mjs")
s = p.read_text()

backup = Path("/tmp/evidence-algebra.before-variants-v6.mjs")
backup.write_text(s)

old = '''function exactKey(value = "") {
  return clean(value)
    .toLocaleLowerCase();
}
'''

new = '''function exactKey(value = "") {
  return clean(value)
    .toLocaleLowerCase();
}

function foldSpecialLetters(value = "") {
  return clean(value)
    .replace(/æ/giu, "ae")
    .replace(/œ/giu, "oe")
    .replace(/ø/giu, "o")
    .replace(/ð/giu, "d")
    .replace(/þ/giu, "th")
    .replace(/ł/giu, "l");
}

function creditCoreKey(value = "") {
  return foldSpecialLetters(value)
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/^\\s*the\\s+/u, "")
    .replace(/^\\s*dj\\s+/u, "")
    .replace(/\\s*\\([^)]{1,80}\\)\\s*$/u, "")
    .replace(/[^\\p{L}\\p{N}]+/gu, " ")
    .trim();
}

function probableCreditVariant(a, b) {
  const A = creditCoreKey(a);
  const B = creditCoreKey(b);

  if (!A || !B || A === B) {
    return Boolean(A && B && A === B);
  }

  return false;
}
'''

if old not in s:
    raise SystemExit("Bloc exactKey introuvable : aucun changement effectué.")

s = s.replace(old, new)

old2 = '''  if (looseKey(A) === looseKey(B)) {
    return RELATIONS.ORTHOGRAPHIC_VARIANT;
  }

  return RELATIONS.COMPETING_IDENTITY;
}
'''

new2 = '''  if (looseKey(A) === looseKey(B)) {
    return RELATIONS.ORTHOGRAPHIC_VARIANT;
  }

  if (
    creditCoreKey(A) === creditCoreKey(B)
  ) {
    const specialFoldChanged =
      looseKey(A) !== looseKey(
        foldSpecialLetters(A)
      ) ||
      looseKey(B) !== looseKey(
        foldSpecialLetters(B)
      );

    const onlyOrthographic =
      specialFoldChanged &&
      !/^\\s*(?:the|dj)\\s+/iu.test(A) &&
      !/^\\s*(?:the|dj)\\s+/iu.test(B) &&
      !/\\([^)]{1,80}\\)\\s*$/u.test(A) &&
      !/\\([^)]{1,80}\\)\\s*$/u.test(B);

    return onlyOrthographic
      ? RELATIONS.ORTHOGRAPHIC_VARIANT
      : RELATIONS.CREDIT_VARIANT;
  }

  if (probableCreditVariant(A, B)) {
    return RELATIONS.CREDIT_VARIANT;
  }

  return RELATIONS.COMPETING_IDENTITY;
}
'''

if old2 not in s:
    raise SystemExit("Bloc relationBetweenNames introuvable : aucun changement effectué.")

s = s.replace(old2, new2)
p.write_text(s)

print("Patch appliqué :", p)
print("Backup :", backup)
