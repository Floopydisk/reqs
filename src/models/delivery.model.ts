import { createPgModel } from "../db/pgModel";
import { generateSequentialId } from "../utils/idGenerator";

const BaseDelivery = createPgModel("deliveries");

const Delivery: any = {
  ...BaseDelivery,

  async create(data: any) {
    if (!data.deliveryNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const period = `${year}${month}`;
      data.deliveryNumber = await generateSequentialId("DEL", period, 4);
    }
    return BaseDelivery.create(data);
  },
};

export default Delivery;
