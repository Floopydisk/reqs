import { createPgModel } from "../db/pgModel";
import { ILocation } from "../types/interfaces";

const Location = createPgModel<ILocation>("locations");
export default Location;
