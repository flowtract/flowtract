import { RequestContractError } from '../errors.js';
import type { OperationDefinition } from '../operation-types.js';

type PathParameterValue = string | number | boolean | bigint;

function isPathParameterValue(value: unknown): value is PathParameterValue {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  );
}

export function renderOperationPath(
  operation: OperationDefinition,
  pathParams: Readonly<Record<string, unknown>>
): string {
  return operation.path.replace(/\{([^{}]+)\}/g, (_template, name: string) => {
    const value = pathParams[name];
    if (!isPathParameterValue(value)) {
      throw new RequestContractError(
        `Path parameter "${name}" must parse to a string, finite number, boolean, or bigint.`,
        {
          operationId: operation.id,
          details: {
            section: 'pathParams',
            issues: [
              {
                path: [name],
                message: 'Path parameter did not parse to a supported scalar value.',
                code: 'invalid_path_parameter'
              }
            ]
          }
        }
      );
    }
    return encodeURIComponent(String(value));
  });
}
