import { createPgModel } from "../db/pgModel";

const Comment = createPgModel("comments");
export default Comment;
