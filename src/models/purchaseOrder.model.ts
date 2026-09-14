import { createPgModel } from "../db/pgModel";
import { generateSequentialId } from "../utils/idGenerator";

const BasePurchaseOrder = createPgModel("purchaseOrders");

const PurchaseOrder: any = {
  ...BasePurchaseOrder,

  async create(data: any) {
    if (!data.poNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const period = `${year}${month}`;
      data.poNumber = await generateSequentialId("PO", period, 4);
    }
    return BasePurchaseOrder.create(data);
  },
};

export default PurchaseOrder;
