"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contracts = exports.AclMode = exports.StorageRecord = exports.StorageEngineContract = void 0;
const storageEngineContract_1 = require("./storageEngineContract");
var storageEngineContract_2 = require("./storageEngineContract");
Object.defineProperty(exports, "StorageEngineContract", { enumerable: true, get: function () { return storageEngineContract_2.StorageEngineContract; } });
var record_1 = require("./record");
Object.defineProperty(exports, "StorageRecord", { enumerable: true, get: function () { return record_1.StorageRecord; } });
Object.defineProperty(exports, "AclMode", { enumerable: true, get: function () { return record_1.AclMode; } });
exports.contracts = [storageEngineContract_1.StorageEngineContract];
//# sourceMappingURL=index.js.map