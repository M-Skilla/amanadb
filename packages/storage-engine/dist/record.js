"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageRecord = exports.AclMode = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
var AclMode;
(function (AclMode) {
    AclMode["WRITE_ONLY"] = "WRITE_ONLY";
    AclMode["READ_WRITE"] = "READ_WRITE";
})(AclMode || (exports.AclMode = AclMode = {}));
let StorageRecord = class StorageRecord {
    constructor() {
        this.docType = "record";
        this.collection = "";
        this.key = "";
        this.ownerId = "";
        this.acl = [];
        this.allowedRoles = [];
        this.aclMode = AclMode.WRITE_ONLY;
        this.data = "{}";
        this.deleted = false;
        this.version = 1;
        this.createdAt = "";
        this.updatedAt = "";
    }
};
exports.StorageRecord = StorageRecord;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "docType", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "collection", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "key", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "ownerId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)("acl", "string[]"),
    __metadata("design:type", Array)
], StorageRecord.prototype, "acl", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)("allowedRoles", "string[]"),
    __metadata("design:type", Array)
], StorageRecord.prototype, "allowedRoles", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)("aclMode", "string"),
    __metadata("design:type", String)
], StorageRecord.prototype, "aclMode", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "data", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Boolean)
], StorageRecord.prototype, "deleted", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], StorageRecord.prototype, "version", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "createdAt", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], StorageRecord.prototype, "updatedAt", void 0);
exports.StorageRecord = StorageRecord = __decorate([
    (0, fabric_contract_api_1.Object)()
], StorageRecord);
//# sourceMappingURL=record.js.map