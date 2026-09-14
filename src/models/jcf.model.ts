import { createPgModel } from "../db/pgModel";
import { generateSequentialId } from "../utils/idGenerator";
import { IJCF } from "../types/interfaces";

export type { IJCF };

const BaseJcf = createPgModel("jcfs");

const JCF: any = {
  ...BaseJcf,

  async create(data: any) {
    if (!data.jcfNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const period = `${year}${month}`;
      data.jcfNumber = await generateSequentialId("JCF", period, 4);
    }
    return BaseJcf.create(data);
  },
};

export default JCF;
