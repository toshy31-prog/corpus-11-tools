const OPERATORS = new Set(["add", "sub", "mul", "div", "min", "max", "abs", "mean"]);
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function pathSegments(path) {
  if (typeof path !== "string" || !path) throw new Error("expression path must be a non-empty string");
  const segments = path.split(".");
  if (segments.some((segment) => !segment || FORBIDDEN_SEGMENTS.has(segment))) {
    throw new Error(`unsafe expression path: ${path}`);
  }
  return segments;
}

export function getPath(root, path) {
  return pathSegments(path).reduce((value, segment) => {
    if (value === null || value === undefined || !(segment in Object(value))) {
      throw new Error(`missing expression path: ${path}`);
    }
    return value[segment];
  }, root);
}

export function setPath(root, path, value) {
  const segments = pathSegments(path);
  const leaf = segments.pop();
  const parent = segments.reduce((current, segment) => {
    if (!current[segment] || typeof current[segment] !== "object") {
      throw new Error(`missing mutation path: ${path}`);
    }
    return current[segment];
  }, root);
  parent[leaf] = value;
}

function numeric(values, operator) {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${operator} requires finite numeric operands`);
  }
  return values;
}

export function evaluateExpression(expression, context) {
  if (expression === null || typeof expression === "boolean" || typeof expression === "string") return expression;
  if (typeof expression === "number") {
    if (!Number.isFinite(expression)) throw new Error("expression number must be finite");
    return expression;
  }
  if (!expression || typeof expression !== "object" || Array.isArray(expression)) {
    throw new Error("expression must be a scalar, path, or operator object");
  }
  if (Object.keys(expression).length === 1 && "path" in expression) return getPath(context, expression.path);
  if (!OPERATORS.has(expression.op) || !Array.isArray(expression.args)) {
    throw new Error(`unsupported expression operator: ${expression.op ?? "<missing>"}`);
  }
  const values = expression.args.map((item) => evaluateExpression(item, context));
  if (expression.op === "abs") {
    numeric(values, "abs");
    if (values.length !== 1) throw new Error("abs requires one operand");
    return Math.abs(values[0]);
  }
  numeric(values, expression.op);
  if (values.length === 0) throw new Error(`${expression.op} requires operands`);
  if (expression.op === "add") return values.reduce((sum, value) => sum + value, 0);
  if (expression.op === "sub") return values.slice(1).reduce((result, value) => result - value, values[0]);
  if (expression.op === "mul") return values.reduce((result, value) => result * value, 1);
  if (expression.op === "div") return values.slice(1).reduce((result, value) => {
    if (value === 0) throw new Error("division by zero");
    return result / value;
  }, values[0]);
  if (expression.op === "min") return Math.min(...values);
  if (expression.op === "max") return Math.max(...values);
  if (expression.op === "mean") return values.reduce((sum, value) => sum + value, 0) / values.length;
  throw new Error(`unreachable operator: ${expression.op}`);
}

export function applyMutations(mutations, context) {
  if (!Array.isArray(mutations)) throw new Error("mutations must be an array");
  for (const mutation of mutations) {
    if (!mutation || !["set", "add"].includes(mutation.op) || typeof mutation.path !== "string") {
      throw new Error("mutation requires op set|add and a path");
    }
    if (!mutation.path.startsWith("state.")) throw new Error("mutations may target state only");
    const value = evaluateExpression(mutation.value, context);
    if (mutation.op === "set") setPath(context, mutation.path, value);
    else {
      const current = getPath(context, mutation.path);
      if (!Number.isFinite(current) || !Number.isFinite(value)) throw new Error("add mutation requires finite numbers");
      setPath(context, mutation.path, current + value);
    }
  }
}

export function projectExpressions(mapping, context) {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    throw new Error("expression mapping must be an object");
  }
  return Object.fromEntries(Object.entries(mapping).map(([key, expression]) => [
    key,
    evaluateExpression(expression, context),
  ]));
}
