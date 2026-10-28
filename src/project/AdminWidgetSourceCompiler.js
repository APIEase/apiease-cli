// Adapted from the authoritative APIEase compiler; see contracts/widgets/v1/provenance.json.
import {parse, parseExpression} from "@babel/parser";
import {createHash} from "node:crypto";
import {EMBEDDED_REQUEST_PARAMETER_NAMES, PUBLIC_HANDLE_PATTERN, SAMPLE_REQUESTS} from "../../contracts/widgets/v1/constants.js";

const COMPONENT_PROPS = {
  "s-admin-block": ["heading"],
  "s-stack": ["direction", "gap", "alignItems", "justifyContent"],
  "s-box": ["padding", "background", "border", "borderRadius", "inlineSize", "maxInlineSize", "maxBlockSize"],
  "s-section": ["heading"], "s-heading": [], "s-paragraph": [],
  "s-text": ["tone", "type", "color"], "s-badge": ["tone"],
  "s-banner": ["heading", "tone"], "s-divider": [],
  "s-image": ["src", "alt", "aspectRatio", "objectFit", "inlineSize", "loading"],
  "s-text-field": ["label", "name", "value", "placeholder", "details", "error", "disabled", "readOnly", "onInput", "onChange"],
  "s-text-area": ["label", "name", "value", "placeholder", "details", "error", "disabled", "readOnly", "rows", "onInput", "onChange"],
  "s-select": ["label", "name", "value", "details", "error", "disabled", "onChange"],
  "s-option": ["value", "disabled"],
  "s-button": ["variant", "tone", "disabled", "loading", "onClick"],
};
const BINARY_OPERATORS = ["+", "-", "*", "/", "%", "===", "!==", "<", ">", "<=", ">=", "&&", "||", "??"];
const RESERVED_NAMES = ["shopify", "inputs", "apiease", "JSON", "undefined", "event"];
const FORBIDDEN_KEYS = ["__proto__", "prototype", "constructor"];

// This produces data for the renderer, never executable JavaScript.
export default class AdminWidgetSourceCompiler {
  compile(block) {
    const revision = createHash("sha256").update(JSON.stringify([block.variables, block.render])).digest("hex").slice(0, 20);
    const scope = {names: new Set(RESERVED_NAMES), buttons: [], budget: {count: 0}, revision, allowElements: false};
    const program = parseSource(block.variables, "Variables", false);
    const variables = program.program.body.flatMap(statement => compileDeclaration(statement, scope));
    scope.allowElements = true;
    const root = parseSource(block.render, "Render", true);
    if (root.type !== "JSXElement" || root.openingElement.name.name !== "s-admin-block") fail("Render must have one s-admin-block root");
    return {variables, render: compileElement(root, scope, 0), buttons: scope.buttons};
  }
}

function parseSource(source, field, expression) {
  if (typeof source !== "string") fail(`${field} must be text`);
  try {return (expression ? parseExpression : parse)(source, {sourceType: "module", plugins: ["jsx"]});}
  catch (error) {fail(`${field}, line ${error.loc?.line || 1}: ${error.message}`);}
}

function compileDeclaration(statement, scope) {
  if (statement.type !== "VariableDeclaration" || statement.kind !== "const") fail("Variables supports const declarations only");
  return statement.declarations.map(declaration => {
    if (declaration.id.type !== "Identifier" || !declaration.init) fail("Each variable needs a name and a value");
    const name = requireName(declaration.id.name);
    if (scope.names.has(name)) fail(`Variable ${name} is already defined or reserved`);
    const value = compileExpression(declaration.init, scope, 0);
    scope.names.add(name);
    return {name, value};
  });
}

function checkComplexity(scope, depth) {
  scope.budget.count += 1;
  if (depth > 40 || scope.budget.count > 1500) fail("Block source is too complex");
}

function compileExpression(node, scope, depth) {
  checkComplexity(scope, depth);
  const child = value => compileExpression(value, scope, depth + 1);
  if (["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral"].includes(node?.type)) return {kind: "literal", value: node.value ?? null};
  if (node?.type === "Identifier") {
    if (!scope.names.has(node.name)) fail(`Unknown variable: ${node.name}`);
    if (node.name === "event" && !scope.event) fail("event is only available inside input handlers");
    return {kind: "identifier", name: node.name};
  }
  if (["MemberExpression", "OptionalMemberExpression"].includes(node?.type)) return compileMember(node, child);
  if (["BinaryExpression", "LogicalExpression"].includes(node?.type) && BINARY_OPERATORS.includes(node.operator)) {
    return {kind: "binary", operator: node.operator, left: child(node.left), right: child(node.right)};
  }
  if (node?.type === "UnaryExpression" && ["!", "-", "+", "typeof"].includes(node.operator)) return {kind: "unary", operator: node.operator, value: child(node.argument)};
  if (node?.type === "ConditionalExpression") return {kind: "conditional", test: child(node.test), yes: child(node.consequent), no: child(node.alternate)};
  if (node?.type === "TemplateLiteral") return {kind: "template", strings: node.quasis.map(part => part.value.cooked), values: node.expressions.map(child)};
  if (node?.type === "ArrayExpression") return {kind: "array", values: node.elements.map(child)};
  if (node?.type === "ObjectExpression") return {kind: "object", entries: node.properties.map(property => compileProperty(property, child))};
  if (node?.type === "CallExpression" && isMember(node.callee, "JSON", "stringify")) return compileStringify(node, child);
  if (node?.type === "JSXElement" && scope.allowElements) return compileElement(node, scope, depth + 1);
  fail(`Unsupported expression: ${node?.type || "empty"}`);
}

function compileMember(node, child) {
  const key = node.computed ? node.property.value : node.property.name;
  if (node.computed && !["StringLiteral", "NumericLiteral"].includes(node.property.type)) fail("Property access needs a literal name or index");
  requireSafeKey(key);
  return {kind: "member", object: child(node.object), key, optional: Boolean(node.optional), chain: node.type === "OptionalMemberExpression"};
}

function compileProperty(property, child) {
  if (property.type !== "ObjectProperty" || property.computed) fail("Objects support named properties only");
  const key = property.key.name ?? property.key.value;
  requireSafeKey(key);
  return [key, child(property.value)];
}

function compileStringify(node, child) {
  if (node.arguments.length < 1 || node.arguments.length > 3) fail("Use JSON.stringify(value, null, 2)");
  if (node.arguments[1] && node.arguments[1].type !== "NullLiteral") fail("JSON.stringify replacer must be null");
  const indent = node.arguments[2]?.value ?? 0;
  if (!Number.isInteger(indent) || indent < 0 || indent > 10) fail("JSON.stringify indentation must be 0–10");
  return {kind: "stringify", value: child(node.arguments[0]), indent};
}

function compileElement(node, scope, depth) {
  checkComplexity(scope, depth);
  const tag = node.openingElement.name.name;
  if (!Object.hasOwn(COMPONENT_PROPS, tag || "")) fail(`Unsupported Shopify component: ${tag || "expression"}`);
  if (tag === "s-admin-block" && depth !== 0) fail("s-admin-block can only be the Render root");
  const props = node.openingElement.attributes.map(attribute => compileAttribute(attribute, tag, scope, depth));
  if (new Set(props.map(([name]) => name)).size !== props.length) fail("Component properties must be unique");
  const children = node.children.flatMap(child => compileChild(child, scope, depth + 1));
  return {kind: "element", tag, props, children};
}

function compileAttribute(attribute, tag, scope, depth) {
  const name = attribute.name?.name;
  if (attribute.type !== "JSXAttribute" || !COMPONENT_PROPS[tag].includes(name)) fail(`Unsupported ${tag} property: ${name || "spread"}`);
  const value = attribute.value?.type === "JSXExpressionContainer" ? attribute.value.expression : attribute.value;
  if (name.startsWith("on")) return [name, compileEvent(value, name, scope, depth + 1)];
  return [name, value ? compileExpression(value, scope, depth + 1) : {kind: "literal", value: true}];
}

function compileChild(node, scope, depth) {
  if (node.type === "JSXText") {
    const text = node.value.split(/\r?\n/).map((line, index, lines) => {
      let value = line.replace(/\t/g, " ");
      if (index) value = value.trimStart();
      if (index < lines.length - 1) value = value.trimEnd();
      return value;
    }).filter(Boolean).join(" ");
    return text ? [{kind: "literal", value: text}] : [];
  }
  if (node.type === "JSXExpressionContainer" && node.expression.type === "JSXEmptyExpression") return [];
  return [compileExpression(node.type === "JSXExpressionContainer" ? node.expression : node, scope, depth)];
}

function compileEvent(node, eventName, scope, depth) {
  if (node?.type !== "ArrowFunctionExpression" || node.async || node.body.type !== "CallExpression") fail("Handlers must be arrow functions calling an APIEase helper");
  const call = node.body;
  if (eventName === "onClick" && node.params.length === 0 && isMember(call.callee, "apiease", "runRequest")) return compileRequest(call, {...scope, allowElements: false}, depth);
  if (["onInput", "onChange"].includes(eventName) && node.params.length === 1 && node.params[0].name === "event" && isMember(call.callee, "apiease", "setInput")) {
    if (call.arguments.length !== 2 || call.arguments[0].type !== "StringLiteral") fail("setInput needs a literal input name and a value");
    return {kind: "event", action: "input", name: requireName(call.arguments[0].value), value: compileExpression(call.arguments[1], {...scope, event: true, allowElements: false}, depth + 1)};
  }
  fail("Use onClick={() => apiease.runRequest(\"handle\", {liquidParamsEmbedded: {value}})} or onInput={event => apiease.setInput(\"input\", event.currentTarget.value)}");
}

function compileRequest(call, scope, depth) {
  const [handle, parameters] = call.arguments;
  if (call.arguments.length !== 2 || handle.type !== "StringLiteral" || parameters.type !== "ObjectExpression"
    || (!PUBLIC_HANDLE_PATTERN.test(handle.value) && !SAMPLE_REQUESTS.some(sample => sample.id === handle.value))) {
    fail("runRequest needs a literal saved request handle or built-in sample ID and an embedded parameter groups object");
  }
  const entries = parameters.properties.map(property => compileProperty(property, value => compileExpression(value, scope, depth + 1)));
  entries.forEach(([name]) => {
    if (!EMBEDDED_REQUEST_PARAMETER_NAMES.includes(name)) fail(`Use an existing embedded parameter group, such as liquidParamsEmbedded, instead of ${name}`);
  });
  if (new Set(entries.map(([name]) => name)).size !== entries.length) fail("Request parameter groups must be unique");
  const id = `sourceButton${scope.buttons.length}_${scope.revision}`;
  scope.buttons.push({id, requestHandle: handle.value});
  return {kind: "event", action: "request", id, parameters: {kind: "object", entries}};
}

function isMember(node, object, property) {
  return node?.type === "MemberExpression" && !node.computed && node.object.name === object && node.property.name === property;
}
function requireSafeKey(key) {
  if (!["string", "number"].includes(typeof key) || FORBIDDEN_KEYS.includes(String(key))) fail("Unsupported property name");
}
function requireName(name) {
  requireSafeKey(name);
  if (typeof name !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name)) fail("Names must start with a letter and contain up to 64 letters, digits, or underscores");
  return name;
}
function fail(message) {throw Object.assign(new Error(message), {status: 400});}
