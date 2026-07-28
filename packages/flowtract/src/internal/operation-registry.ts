import { DuplicateOperationError } from '../errors.js';
import type { OperationDefinition } from '../operation-types.js';

export class OperationRegistry<const Operations extends readonly OperationDefinition[]> {
  readonly operations: Operations;
  readonly #byId = new Map<string, OperationDefinition>();

  constructor(operations: Operations) {
    this.operations = Object.freeze([...operations]) as unknown as Operations;

    this.operations.forEach((operation, duplicateIndex) => {
      const existing = this.#byId.get(operation.id);
      if (existing !== undefined) {
        const firstIndex = this.operations.findIndex(candidate => candidate.id === operation.id);
        throw new DuplicateOperationError(
          `Operation id "${operation.id}" is registered more than once.`,
          {
            operationId: operation.id,
            details: {
              operationId: operation.id,
              firstIndex,
              duplicateIndex
            }
          }
        );
      }
      this.#byId.set(operation.id, operation);
    });
  }

  get(id: string): OperationDefinition | undefined {
    return this.#byId.get(id);
  }
}
