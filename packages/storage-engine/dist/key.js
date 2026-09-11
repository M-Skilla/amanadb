"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRecordKey = makeRecordKey;
exports.makeAuditKey = makeAuditKey;
exports.splitRecordKey = splitRecordKey;
const RECORD_KEY_TYPE = "record";
const AUDIT_KEY_TYPE = "audit";
function makeRecordKey(stub, collection, key) {
    if (!collection || !key) {
        throw new Error("Collection name or key not provided!");
    }
    return stub.createCompositeKey(RECORD_KEY_TYPE, [collection, key]);
}
function makeAuditKey(stub, collection, key, txId) {
    if (!collection || !key || !txId) {
        throw new Error("Collection name or key or Transaction Id not provided!");
    }
    return stub.createCompositeKey(AUDIT_KEY_TYPE, [collection, key, txId]);
}
function splitRecordKey(stub, compositeKey) {
    const { objectType, attributes } = stub.splitCompositeKey(compositeKey);
    if (objectType !== RECORD_KEY_TYPE || attributes.length !== 2) {
        throw new Error(`Unexpected key format ${compositeKey}`);
    }
    if (!attributes[0] || !attributes[1]) {
        throw new Error(`Empty collection and key`);
    }
    return { collection: attributes[0], key: attributes[1] };
}
//# sourceMappingURL=key.js.map