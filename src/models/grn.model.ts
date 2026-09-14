import { createPgModel } from "../db/pgModel";
import { generateSequentialId } from "../utils/idGenerator";

const BaseGrn = createPgModel("grns");

const GRN: any = {
  ...BaseGrn,

  async create(data: any) {
    if (!data.grnNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const period = `${year}${month}`;
      data.grnNumber = await generateSequentialId("GRN", period, 4);
    }
    return BaseGrn.create(data);
  },
};

export default GRN;
