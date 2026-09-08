import ItemHistory from "../models/itemHistory.model";

export const logItemHistory = async (
  requisitionId: string,
  itemId: string,
  action: string,
  performedBy: string,
  previousStatus?: string,
  newStatus?: string,
  comments?: string,
  metadata?: any
) => {
  try {
    await ItemHistory.create({
      requisitionId,
      itemId,
      action,
      performedBy,
      previousStatus,
      newStatus,
      comments,
      metadata,
    });
  } catch (error) {
    console.error("Error logging item history:", error);
  }
};

export const getItemHistory = async (requisitionId: string, itemId: string) => {
  try {
    return await ItemHistory.find({ requisitionId, itemId })
      .populate("performedBy", "firstName lastName email role")
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error("Error fetching item history:", error);
    return [];
  }
};
