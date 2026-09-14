import { createPgModel } from "../db/pgModel";
import { IRequisition } from "../types/interfaces";
import { generateSequentialId } from "../utils/idGenerator";

const BaseRequisition = createPgModel<IRequisition>("requisitions");

const Requisition: any = {
  ...BaseRequisition,

  async create(data: any) {
    if (!data.requisitionNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const period = `${year}${month}`;
      data.requisitionNumber = await generateSequentialId("REQ", period, 4);
    }
    return BaseRequisition.create(data);
  },
};

export default Requisition;
