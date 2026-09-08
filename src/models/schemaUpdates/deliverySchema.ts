import mongoose from "mongoose";
import { DeliveryStatus } from "../../types/enums";

// Update the Delivery schema with the new confirmation fields

const deliverySchemaUpdate = {
  inventoryConfirmation: {
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  departmentConfirmation: {
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
};

// Function to apply the schema update
export const updateDeliverySchema = (DeliverySchema: mongoose.Schema) => {
  // Add inventory confirmation field
  if (!DeliverySchema.path("inventoryConfirmation")) {
    DeliverySchema.add({
      inventoryConfirmation: deliverySchemaUpdate.inventoryConfirmation,
    });
  }

  // Add department confirmation field
  if (!DeliverySchema.path("departmentConfirmation")) {
    DeliverySchema.add({
      departmentConfirmation: deliverySchemaUpdate.departmentConfirmation,
    });
  }

  return DeliverySchema;
};
