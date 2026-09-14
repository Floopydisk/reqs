import { createPgModel } from "../db/pgModel";
import { generateSequentialId } from "../utils/idGenerator";

const BaseRfq = createPgModel("rfqs");

const RFQ: any = {
  ...BaseRfq,

  async create(data: any) {
    if (!data.rfqNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const period = `${year}${month}`;
      data.rfqNumber = await generateSequentialId("RFQ", period, 4);
    }
    return BaseRfq.create(data);
  },
};

export default RFQ;
