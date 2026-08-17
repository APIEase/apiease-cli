import { ApiEaseReadRequestClient } from '../client/ApiEaseReadRequestClient.js';
import { ApiEaseCrudResourceClient } from '../client/ApiEaseCrudResourceClient.js';
import { ApiEaseHomeConfigurationResolver } from '../config/ApiEaseHomeConfigurationResolver.js';
import { CrudResourceDefinitionCollection } from '../crud/CrudResourceDefinitionCollection.js';
import { ApiEaseCommandConfigurationResolver } from './ApiEaseCommandConfigurationResolver.js';

const JSON_FLAG = '--json';
const CONFIGURATION_OPTION_NAMES = ['--base-url', '--shop-domain'];

class ReadRequestCommand {
  constructor({
    apiEaseReadRequestClient = new ApiEaseReadRequestClient(),
    apiEaseCrudResourceClient = new ApiEaseCrudResourceClient(),
    apiEaseHomeConfigurationResolver = new ApiEaseHomeConfigurationResolver(),
    crudResourceDefinitionCollection = new CrudResourceDefinitionCollection(),
    apiEaseCommandConfigurationResolver = new ApiEaseCommandConfigurationResolver({
      apiEaseHomeConfigurationResolver,
    }),
    stdout = process.stdout,
    stderr = process.stderr,
  } = {}) {
    this.apiEaseReadRequestClient = apiEaseReadRequestClient;
    this.apiEaseCrudResourceClient = apiEaseCrudResourceClient;
    this.crudResourceDefinitionCollection = crudResourceDefinitionCollection;
    this.apiEaseCommandConfigurationResolver = apiEaseCommandConfigurationResolver;
    this.stdout = stdout;
    this.stderr = stderr;
  }

  async run(commandArguments = []) {
    const parseResult = this.parseCommandArguments(commandArguments);
    if (!parseResult.ok) {
      this.writeUsageFailure(parseResult);
      return 1;
    }

    const configurationResult = await this.resolveCommandConfiguration(parseResult);
    if (!configurationResult.ok) {
      this.writeConfigurationFailure(configurationResult, parseResult);
      return 1;
    }

    const result = await this.readResource({ parseResult, configurationResult });
    this.writeResult(result, parseResult);
    return result.ok ? 0 : 1;
  }

  parseCommandArguments(commandArguments) {
    if (commandArguments[0] !== 'read') {
      return this.buildParseFailure('Unsupported command. Only "read" is supported.');
    }

    const resourceName = commandArguments[1];
    if (!resourceName || resourceName.startsWith('--')) {
      return this.buildParseFailure('Missing required resource argument.');
    }

    const crudResourceDefinition = this.crudResourceDefinitionCollection.findResourceDefinition(resourceName);
    if (!crudResourceDefinition) {
      return this.buildParseFailure(`Unsupported resource: ${resourceName}.`);
    }

    const optionMap = this.buildOptionMap(commandArguments, 2);
    const missingRequiredOptionNames = this.buildMissingRequiredIdentifierOptionNames({
      optionMap,
      crudResourceDefinition,
    });
    if (missingRequiredOptionNames.length > 0) {
      return this.buildParseFailure(
        `Missing required arguments: ${missingRequiredOptionNames.join(', ')}`,
        crudResourceDefinition,
      );
    }

    return {
      ok: true,
      crudResourceDefinition,
      resourceIdentifier: this.readResourceIdentifier({ optionMap, crudResourceDefinition }),
      apiBaseUrl: optionMap['--base-url'],
      shopDomain: optionMap['--shop-domain'],
      apiKey: optionMap['--api-key'],
      json: optionMap[JSON_FLAG] === true,
    };
  }

  async resolveCommandConfiguration(parseResult) {
    const configurationResult = await this.apiEaseCommandConfigurationResolver.resolveConfiguration({
      explicitApiBaseUrl: parseResult.apiBaseUrl,
      explicitApiKey: parseResult.apiKey,
      explicitShopDomain: parseResult.shopDomain,
      requiredConfigurationFieldPaths: ['apiKey'],
    });
    if (!configurationResult.ok) {
      return configurationResult;
    }

    const missingRequiredOptionNames = this.buildMissingRequiredOptionNames({
      '--base-url': configurationResult.apiBaseUrl,
      '--shop-domain': configurationResult.shopDomain,
    }, CONFIGURATION_OPTION_NAMES);
    if (missingRequiredOptionNames.length > 0) {
      return this.buildParseFailure(
        `Missing required arguments: ${missingRequiredOptionNames.join(', ')}`,
        parseResult.crudResourceDefinition,
      );
    }

    return configurationResult;
  }

  async readResource({ parseResult, configurationResult }) {
    if (parseResult.crudResourceDefinition.resourceName === 'request') {
      return await this.apiEaseReadRequestClient.readRequest({
        apiBaseUrl: configurationResult.apiBaseUrl,
        apiKey: configurationResult.apiKey,
        shopDomain: configurationResult.shopDomain,
        requestId: parseResult.resourceIdentifier,
      });
    }

    return await this.apiEaseCrudResourceClient.readResource({
      resourceName: parseResult.crudResourceDefinition.resourceName,
      apiBaseUrl: configurationResult.apiBaseUrl,
      apiKey: configurationResult.apiKey,
      shopDomain: configurationResult.shopDomain,
      resourceIdentifier: parseResult.resourceIdentifier,
      failureErrorCode: this.buildFailureErrorCode(parseResult.crudResourceDefinition, 'READ'),
    });
  }

  buildOptionMap(commandArguments, startIndex) {
    const optionMap = {};

    for (let index = startIndex; index < commandArguments.length; index += 1) {
      const commandArgument = commandArguments[index];
      if (commandArgument === JSON_FLAG) {
        optionMap[JSON_FLAG] = true;
        continue;
      }

      optionMap[commandArgument] = commandArguments[index + 1];
      index += 1;
    }

    return optionMap;
  }

  buildMissingRequiredOptionNames(optionMap, requiredOptionNames) {
    return requiredOptionNames.filter((requiredOptionName) => !optionMap[requiredOptionName]);
  }

  buildMissingRequiredIdentifierOptionNames({ optionMap, crudResourceDefinition }) {
    if (this.readResourceIdentifier({ optionMap, crudResourceDefinition })) {
      return [];
    }

    return [crudResourceDefinition.identifierOptionName];
  }

  readResourceIdentifier({ optionMap, crudResourceDefinition }) {
    const identifierOptionName = this.crudResourceDefinitionCollection
      .listIdentifierOptionNames(crudResourceDefinition)
      .find((optionName) => optionMap[optionName]);
    return optionMap[identifierOptionName];
  }

  buildParseFailure(message, crudResourceDefinition = null) {
    return {
      ok: false,
      message,
      usageText: this.buildUsageText(crudResourceDefinition),
    };
  }

  buildUsageText(crudResourceDefinition) {
    const resourceToken = crudResourceDefinition?.resourceName || this.buildSupportedResourceToken();
    const identifierOptionName = crudResourceDefinition?.identifierOptionName || '<resource-identifier>';
    const identifierValueName = crudResourceDefinition?.identifierValueName || 'value';
    const usageLines = [
      `Usage: apiease read ${resourceToken} ${identifierOptionName} <${identifierValueName}> [--base-url <url>] [--shop-domain <shop-domain>] [--api-key <api-key>] [--json]`,
      '',
      'Options:',
    ];

    if (!crudResourceDefinition) {
      usageLines.push(`  ${this.buildSupportedResourceToken()}      Supported resource name.`);
      for (const resourceName of this.crudResourceDefinitionCollection.listSupportedResourceNames()) {
        usageLines.push(...this.buildIdentifierOptionLines(
          this.crudResourceDefinitionCollection.readResourceDefinition(resourceName),
        ));
      }
    } else {
      usageLines.push(...this.buildIdentifierOptionLines(crudResourceDefinition));
    }

    usageLines.push(
      '  --base-url <url>            APIEase base URL. Defaults to ~/.apiease/.env.<environment>.',
      '  --shop-domain <shop-domain> Shopify shop domain. Defaults to ~/.apiease/.env.<environment>.',
      '  --api-key <api-key>         APIEase API key. Defaults to ~/.apiease home configuration.',
      '  --json                      Emit raw JSON output.',
    );

    return usageLines.join('\n');
  }

  buildSupportedResourceToken() {
    return `<${this.crudResourceDefinitionCollection.listSupportedResourceNames().join('|')}>`;
  }

  buildIdentifierOptionLine(crudResourceDefinition) {
    return this.buildOptionLine(
      `${crudResourceDefinition.identifierOptionName} <${crudResourceDefinition.identifierValueName}>`,
      `APIEase ${crudResourceDefinition.resourceName} ${crudResourceDefinition.identifierValueName}.`,
    );
  }

  buildIdentifierOptionLines(crudResourceDefinition) {
    return [
      this.buildIdentifierOptionLine(crudResourceDefinition),
      ...crudResourceDefinition.legacyIdentifierOptions.map(
        (legacyIdentifierOption) => this.buildLegacyIdentifierOptionLine(
          crudResourceDefinition,
          legacyIdentifierOption,
        ),
      ),
    ];
  }

  buildLegacyIdentifierOptionLine(crudResourceDefinition, legacyIdentifierOption) {
    return this.buildOptionLine(
      `${legacyIdentifierOption.optionName} <${legacyIdentifierOption.valueName}>`,
      `Compatibility alias; prefer ${crudResourceDefinition.identifierOptionName}.`,
    );
  }

  buildOptionLine(optionToken, description) {
    return `  ${optionToken.padEnd(28)} ${description}`;
  }

  buildFailureErrorCode(crudResourceDefinition, operationName) {
    return `${crudResourceDefinition.resourceName.toUpperCase()}_${operationName}_FAILED`;
  }

  writeUsageFailure(parseFailure) {
    this.stderr.write(`${parseFailure.message}\n${parseFailure.usageText}\n`);
  }

  writeConfigurationFailure(result, parseResult) {
    if (result.errorCode) {
      this.writeResult(result, parseResult);
      return;
    }

    this.writeUsageFailure(result);
  }

  writeResult(result, parseResult) {
    const json = parseResult?.json === true;
    const output = json ? this.buildJsonOutput(result) : this.buildHumanReadableOutput(result, parseResult);
    const stream = json || result.ok ? this.stdout : this.stderr;
    stream.write(output);
  }

  buildJsonOutput(result) {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  buildHumanReadableOutput(result, parseResult) {
    return result.ok
      ? this.buildHumanReadableSuccessOutput(result, parseResult)
      : this.buildHumanReadableFailureOutput(result, parseResult);
  }

  buildHumanReadableSuccessOutput(result, parseResult) {
    const crudResourceDefinition = this.readResultResourceDefinition(result, parseResult);
    const outputLines = [`${crudResourceDefinition.humanReadableLabel} read successfully.`];
    const resourcePayload = result?.[crudResourceDefinition.responsePayloadKey];
    const resourceIdentifierOutputProperty = this.readResourceIdentifierOutputProperty({
      crudResourceDefinition,
      resourcePayload,
    });

    if (resourceIdentifierOutputProperty) {
      outputLines.push(
        `${crudResourceDefinition.humanReadableLabel} ${this.buildIdentifierLabel(resourceIdentifierOutputProperty.valueName)}: ${resourceIdentifierOutputProperty.value}`,
      );
    }

    if (crudResourceDefinition.resourceName === 'request') {
      this.appendRequestDetails(outputLines, resourcePayload);
    }

    if (result.shopDomain) {
      outputLines.push(`Shop Domain: ${result.shopDomain}`);
    }

    return `${outputLines.join('\n')}\n`;
  }

  appendRequestDetails(outputLines, request) {
    if (request?.name) {
      outputLines.push(`Name: ${request.name}`);
    }

    if (request?.type) {
      outputLines.push(`Type: ${request.type}`);
    }

    if (request?.method) {
      outputLines.push(`Method: ${request.method}`);
    }

    if (request?.address) {
      outputLines.push(`Address: ${request.address}`);
    }
  }

  buildHumanReadableFailureOutput(result, parseResult) {
    const crudResourceDefinition = this.readResultResourceDefinition(result, parseResult);
    const outputLines = [
      `${crudResourceDefinition.humanReadableLabel} read failed.`,
      `Error Code: ${result.errorCode}`,
      `Message: ${result.message}`,
    ];

    if (result.status) {
      outputLines.push(`Status: ${result.status}`);
    }

    for (const fieldError of result.fieldErrors ?? []) {
      outputLines.push(`Field Error: ${fieldError.path} ${fieldError.code} ${fieldError.message}`);
    }

    return `${outputLines.join('\n')}\n`;
  }

  readResultResourceDefinition(result, parseResult) {
    if (parseResult?.crudResourceDefinition) {
      return parseResult.crudResourceDefinition;
    }

    return this.crudResourceDefinitionCollection.listSupportedResourceNames()
      .map((resourceName) => this.crudResourceDefinitionCollection.readResourceDefinition(resourceName))
      .find((crudResourceDefinition) => result?.[crudResourceDefinition.responsePayloadKey]) || this.crudResourceDefinitionCollection.readResourceDefinition('request');
  }

  buildIdentifierLabel(identifierValueName) {
    if (identifierValueName === 'id') {
      return 'ID';
    }

    return `${identifierValueName.charAt(0).toUpperCase()}${identifierValueName.slice(1)}`;
  }

  readResourceIdentifierOutputProperty({ crudResourceDefinition, resourcePayload }) {
    for (const identifierOutputProperty of crudResourceDefinition.identifierOutputProperties) {
      const value = resourcePayload?.[identifierOutputProperty.propertyName];
      if (value) {
        return {
          ...identifierOutputProperty,
          value,
        };
      }
    }

    return null;
  }
}

export { ReadRequestCommand };
