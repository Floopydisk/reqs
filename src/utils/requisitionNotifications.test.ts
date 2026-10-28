import assert from "node:assert/strict";
import test from "node:test";
import Notification from "../models/notification.model";
import RFQ from "../models/rfq.model";
import User from "../models/user.model";
import { notifications } from "./notification";
import { notifyRequisitionStatusChanged } from "./requisitionNotifications";

test("persists an in-app notification for the assigned work-tool department HoD", async () => {
  const originalEnabled = process.env.NOTIFY_EMAIL_ENABLED;
  const originalUserFind = User.find;
  const originalRfqFind = RFQ.find;
  const originalInsertMany = Notification.insertMany;
  let insertedNotifications: any[] = [];
  let emittedPayload: any;
  const listener = (payload: any) => {
    emittedPayload = payload;
  };

  process.env.NOTIFY_EMAIL_ENABLED = "false";
  User.find = (() => ({
    select: async () => [],
  })) as typeof User.find;
  RFQ.find = (() => ({
    lean: async () => [],
  })) as typeof RFQ.find;
  Notification.insertMany = (async (documents: any[]) => {
    insertedNotifications = documents;
    return documents;
  }) as typeof Notification.insertMany;
  notifications.on("notification", listener);

  try {
    await notifyRequisitionStatusChanged(
      {
        _id: "requisition-1",
        requester: "requester-1",
        assignedApprover: "it-hod-1",
        requisitionNumber: "REQ-TEST-1",
        status: "hodToolComment",
        title: "Work tool request",
      },
      "hhra-1",
      "The work-tool department HoD must review this request.",
    );

    assert.ok(
      insertedNotifications.some(
        (notification) => String(notification.recipient) === "it-hod-1",
      ),
      "the assigned work-tool HoD should receive a persisted notification",
    );
    assert.ok(
      emittedPayload?.targetUserIds?.includes("it-hod-1"),
      "the assigned work-tool HoD should receive the in-app notification event",
    );
    assert.equal(
      insertedNotifications.find(
        (notification) => String(notification.recipient) === "it-hod-1",
      )?.metadata.notificationTitle,
      "Work-tool department HoD action required",
    );
  } finally {
    notifications.off("notification", listener);
    User.find = originalUserFind;
    RFQ.find = originalRfqFind;
    Notification.insertMany = originalInsertMany;
    if (originalEnabled === undefined) delete process.env.NOTIFY_EMAIL_ENABLED;
    else process.env.NOTIFY_EMAIL_ENABLED = originalEnabled;
  }
});
