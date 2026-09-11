import { ChaincodeStub } from "fabric-shim";
export declare function makeRecordKey(stub: ChaincodeStub, collection: string, key: string): string;
export declare function makeAuditKey(stub: ChaincodeStub, collection: string, key: string, txId: string): string;
export declare function splitRecordKey(stub: ChaincodeStub, compositeKey: string): {
    collection: string;
    key: string;
};
//# sourceMappingURL=key.d.ts.map