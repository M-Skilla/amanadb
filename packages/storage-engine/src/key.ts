import { ChaincodeStub } from "fabric-shim";

const RECORD_KEY_TYPE = "record";
const AUDIT_KEY_TYPE = "audit";

export function makeRecordKey(
  stub: ChaincodeStub,
  collection: string,
  key: string,
) {
  if (!collection || !key) {
    throw new Error("Collection name or key not provided!");
  }

  return stub.createCompositeKey(RECORD_KEY_TYPE, [collection, key]);
}

export function makeAuditKey(
  stub: ChaincodeStub,
  collection: string,
  key: string,
  txId: string,
): string {
  if (!collection || !key || !txId) {
    throw new Error("Collection name or key or Transaction Id not provided!");
  }
  return stub.createCompositeKey(AUDIT_KEY_TYPE, [collection, key, txId]);
}

export function splitRecordKey(
  stub: ChaincodeStub,
  compositeKey: string,
): { collection: string; key: string } {
  const { objectType, attributes } = stub.splitCompositeKey(compositeKey);
  if (objectType !== RECORD_KEY_TYPE || attributes.length !== 2) {
    throw new Error(`Unexpected key format ${compositeKey}`);
  }
  if (!attributes[0] || !attributes[1]) {
    throw new Error(`Empty collection and key`);
  }
  return { collection: attributes[0], key: attributes[1] };
}
