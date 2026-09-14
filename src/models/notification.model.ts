import { createPgModel } from "../db/pgModel";

const Notification = createPgModel("notifications");
export default Notification;
