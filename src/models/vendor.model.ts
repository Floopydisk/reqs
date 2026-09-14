import { createPgModel } from "../db/pgModel";
import { IVendor } from "../types/interfaces";

const Vendor = createPgModel<IVendor>("vendors");
export default Vendor;
