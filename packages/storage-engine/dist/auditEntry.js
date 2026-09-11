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
exports.AuditEntry = exports.AuditAction = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["GRANT_ACCESS"] = "GRANT_ACCESS";
    AuditAction["REVOKE_ACCESS"] = "REVOKE_ACCESS";
    AuditAction["GRANT_ROLE"] = "GRANT_ROLE";
    AuditAction["REVOKE_ROLE"] = "REVOKE_ROLE";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
let AuditEntry = class AuditEntry {
    constructor() {
        this.docType = 'audit';
        this.txId = '';
        this.collection = '';
        this.key = '';
        this.action = AuditAction.CREATE;
        this.actorId = '';
        this.resultingVersion = 0;
        this.timestamp = '';
    }
};
exports.AuditEntry = AuditEntry;
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AuditEntry.prototype, "docType", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AuditEntry.prototype, "txId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AuditEntry.prototype, "collection", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AuditEntry.prototype, "key", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)('action', 'string'),
    __metadata("design:type", String)
], AuditEntry.prototype, "action", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AuditEntry.prototype, "actorId", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", Number)
], AuditEntry.prototype, "resultingVersion", void 0);
__decorate([
    (0, fabric_contract_api_1.Property)(),
    __metadata("design:type", String)
], AuditEntry.prototype, "timestamp", void 0);
exports.AuditEntry = AuditEntry = __decorate([
    (0, fabric_contract_api_1.Object)()
], AuditEntry);
//# sourceMappingURL=auditEntry.js.map