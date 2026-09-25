class CrudFailureOutputFormatter {
  format(result, heading) {
    const error = result.error ?? result;
    const outputLines = [heading];
    this.#appendValue(outputLines, 'Error Code', error.code ?? result.errorCode ?? result.outcome);
    this.#appendValue(outputLines, 'Message', error.message ?? result.message);
    this.#appendValue(outputLines, 'Status', result.status);
    this.#appendEntries(outputLines, 'Field Error', error.fieldErrors ?? result.fieldErrors);
    this.#appendEntries(outputLines, 'Diagnostic', error.diagnostics ?? result.diagnostics);
    this.#appendValue(outputLines, 'Details', error.details ?? result.details);
    this.#appendContext(outputLines, error);
    return `${outputLines.join('\n')}\n`;
  }

  #appendContext(outputLines, error) {
    const { code, errorCode, message, status, ok, contractVersion, outcome,
      fieldErrors, diagnostics, details, ...context } = error;
    this.#appendValue(outputLines, 'Context', context);
  }

  #appendEntries(outputLines, label, entries = []) {
    for (const entry of entries ?? []) {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        this.#appendEntry(outputLines, label, entry);
      } else {
        this.#appendValue(outputLines, label, entry);
      }
    }
  }

  #appendEntry(outputLines, label, entry) {
    const { path, code, message, ...context } = entry;
    const summary = [path, code, message].filter(value => this.#hasValue(value)).join(' ');
    if (summary) outputLines.push(`${label}: ${summary}`);
    if (Object.keys(context).length > 0) {
      if (!summary) outputLines.push(`${label}:`);
      outputLines.push(this.#formatStructuredValue(context));
    }
  }

  #appendValue(outputLines, label, value) {
    if (!this.#hasValue(value)) return;
    outputLines.push(typeof value === 'object'
      ? `${label}:\n${this.#formatStructuredValue(value)}`
      : `${label}: ${value}`);
  }

  #hasValue(value) {
    if (value === undefined || value === null || value === '') return false;
    return typeof value !== 'object' || Object.keys(value).length > 0;
  }

  #formatStructuredValue(value) {
    return JSON.stringify(value, null, 2).split('\n').map(line => `  ${line}`).join('\n');
  }
}

export { CrudFailureOutputFormatter };
