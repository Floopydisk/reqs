import { createPgModel } from "../db/pgModel";
import { ISLA } from "../types/interfaces";

const SLA = createPgModel<ISLA>("slas");
export default SLA;
