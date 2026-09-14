import { createPgModel } from "../db/pgModel";
import { IVendorCategory } from "../types/interfaces";

const VendorCategory = createPgModel<IVendorCategory>("vendorCategories");
export default VendorCategory;
