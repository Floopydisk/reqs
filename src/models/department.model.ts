import { createPgModel } from "../db/pgModel";
import { IDepartment } from "../types/interfaces";

const Department = createPgModel<IDepartment>("departments");
export default Department;
