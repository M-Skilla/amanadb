import { Object as DataObject, Property } from "fabric-contract-api";

export enum AclMode {
  WRITE_ONLY = "WRITE_ONLY",
  READ_WRITE = "READ_WRITE",
}

@DataObject()
export class StorageRecord {
  @Property()
  public docType: string = "record";

  @Property()
  public collection: string = "";

  @Property()
  public key: string = "";

  @Property()
  public ownerId: string = "";

  @Property("acl", "string[]")
  public acl: string[] = [];

  @Property("allowedRoles", "string[]")
  public allowedRoles: string[] = [];

  @Property("aclMode", "string")
  public aclMode: AclMode = AclMode.WRITE_ONLY;

  @Property()
  public data: string = "{}";

  @Property()
  public deleted: boolean = false;

  @Property()
  public version: number = 1;

  @Property()
  public createdAt: string = "";

  @Property()
  public updatedAt: string = "";
}
