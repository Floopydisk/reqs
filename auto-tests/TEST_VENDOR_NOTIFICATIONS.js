/**
 * Test Script for Vendor Notification System
 * 
 * This script demonstrates how to test the new vendor notification endpoints
 * Run these cURL commands to test the implementation
 **/

// ============================================
// SETUP: Get vendor authentication token first
// ============================================

// 1. Login as a vendor
curl -X POST http://localhost:3000/api/auth/vendor-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@example.com",
    "password": "your_password"
  }'

// Save the token from response:
// export VENDOR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// ============================================
// TEST 1: Get All Vendor Notifications
// ============================================

curl -X GET "http://localhost:3000/api/vendors/me/notifications?page=1&limit=20" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected Response:
// {
//   "success": true,
//   "data": [...notifications],
//   "pagination": {
//     "page": 1,
//     "limit": 20,
//     "total": 5,
//     "pages": 1
//   },
//   "unreadCount": 3
// }

// ============================================
// TEST 2: Get Unread Notification Count
// ============================================

curl -X GET "http://localhost:3000/api/vendors/me/notifications/unread/count" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected Response:
// {
//   "success": true,
//   "data": {
//     "unreadCount": 3
//   }
// }

// ============================================
// TEST 3: Filter Unread Notifications
// ============================================

curl -X GET "http://localhost:3000/api/vendors/me/notifications?isRead=false" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// ============================================
// TEST 4: Filter by Notification Type
// ============================================

curl -X GET "http://localhost:3000/api/vendors/me/notifications?type=bid_selected" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// ============================================
// TEST 5: Get Single Notification
// ============================================

// Replace {notification_id} with actual notification ID from step 1
curl -X GET "http://localhost:3000/api/vendors/me/notifications/{notification_id}" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// ============================================
// TEST 6: Mark Single Notification as Read
// ============================================

curl -X PUT "http://localhost:3000/api/vendors/me/notifications/{notification_id}/read" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected Response:
// {
//   "success": true,
//   "data": {
//     "_id": "...",
//     "isRead": true,
//     ...
//   }
// }

// ============================================
// TEST 7: Mark All Notifications as Read
// ============================================

curl -X PUT "http://localhost:3000/api/vendors/me/notifications/read-all" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected Response:
// {
//   "success": true,
//   "message": "5 notifications marked as read",
//   "data": {
//     "modifiedCount": 5
//   }
// }

// ============================================
// TEST 8: Delete Single Notification
// ============================================

curl -X DELETE "http://localhost:3000/api/vendors/me/notifications/{notification_id}" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected Response:
// {
//   "success": true,
//   "message": "Notification deleted successfully"
// }

// ============================================
// TEST 9: Delete All Read Notifications
// ============================================

curl -X DELETE "http://localhost:3000/api/vendors/me/notifications/read" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected Response:
// {
//   "success": true,
//   "message": "3 notifications deleted",
//   "data": {
//     "deletedCount": 3
//   }
// }

// ============================================
// INTEGRATION TESTS: Trigger Vendor Notifications
// ============================================

// As a Procurement Manager, perform these actions to trigger vendor notifications:

// TEST 10: Shortlist a Bid (as Procurement Manager)
// This should send a notification to the vendor
curl -X PUT "http://localhost:3000/api/bids/{bid_id}/shortlist" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json"

// Then check vendor notifications:
curl -X GET "http://localhost:3000/api/vendors/me/notifications?type=vendor_shortlisted" \
  -H "Authorization: Bearer $VENDOR_TOKEN"

// TEST 11: Select a Bid (as Procurement Manager)
// This should send a "congratulations" notification to the winning vendor
curl -X PUT "http://localhost:3000/api/bids/{bid_id}/select" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json"

// Then check vendor notifications:
curl -X GET "http://localhost:3000/api/vendors/me/notifications?type=bid_selected" \
  -H "Authorization: Bearer $VENDOR_TOKEN"

// TEST 12: Reject a Bid (as Procurement Manager)
// This should send a rejection notification to the vendor
curl -X PUT "http://localhost:3000/api/bids/{bid_id}/reject" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Bid price exceeded budget constraints"
  }'

// Then check vendor notifications (should have rejection message):
curl -X GET "http://localhost:3000/api/vendors/me/notifications" \
  -H "Authorization: Bearer $VENDOR_TOKEN"

// TEST 13: Create Purchase Order (as Procurement Manager)
// This should send a PO notification to the vendor
curl -X POST "http://localhost:3000/api/requisitions/{requisition_id}/purchase-orders" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryDate": "2025-11-15",
    "notes": "Please deliver to main warehouse"
  }'

// Then check vendor notifications:
curl -X GET "http://localhost:3000/api/vendors/me/notifications?type=payment_status_updated" \
  -H "Authorization: Bearer $VENDOR_TOKEN"

// TEST 14: Schedule Negotiation (as Procurement Manager)
// This should send a meeting notification to the vendor
curl -X POST "http://localhost:3000/api/requisitions/{requisition_id}/negotiations" \
  -H "Authorization: Bearer $PM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledDate": "2025-10-25T10:00:00Z",
    "meetingLink": "https://meet.example.com/negotiation-123",
    "notes": "Negotiation for pricing and delivery terms",
    "customMessage": "Looking forward to discussing your bid"
  }'

// Then check vendor notifications:
curl -X GET "http://localhost:3000/api/vendors/me/notifications?type=meeting_scheduled" \
  -H "Authorization: Bearer $VENDOR_TOKEN"

// ============================================
// DATABASE VERIFICATION
// ============================================

// Connect to MongoDB and verify notifications are stored correctly:
/*
use requisitionpro_db;

// Check vendor notifications
db.notifications.find({ recipientModel: "Vendor" }).pretty();

// Check notification counts by type
db.notifications.aggregate([
  { $match: { recipientModel: "Vendor" } },
  { $group: { _id: "$type", count: { $sum: 1 } } }
]);

// Check unread vendor notifications
db.notifications.find({ 
  recipientModel: "Vendor", 
  isRead: false 
}).count();

// Verify polymorphic references (actor can be User or Vendor)
db.notifications.find({ 
  recipientModel: "Vendor" 
}).forEach(function(doc) {
  print("Notification: " + doc._id);
  print("Actor Model: " + doc.actorModel);
  print("Recipient Model: " + doc.recipientModel);
  print("---");
});
*/

// ============================================
// ERROR HANDLING TESTS
// ============================================

// TEST 15: Access Notification Without Authentication
curl -X GET "http://localhost:3000/api/vendors/me/notifications" \
  -H "Content-Type: application/json"

// Expected: 401 Unauthorized

// TEST 16: Access Vendor Notifications as Non-Vendor User
// (Login as a regular user, not a vendor)
curl -X GET "http://localhost:3000/api/vendors/me/notifications" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json"

// Expected: 403 Forbidden

// TEST 17: Try to Access Another Vendor's Notification
// This should fail because notifications are filtered by req.user!.vendor
curl -X GET "http://localhost:3000/api/vendors/me/notifications/{other_vendor_notification_id}" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// Expected: 404 Not Found

// ============================================
// PERFORMANCE TESTS
// ============================================

// TEST 18: Pagination Performance
// Test with large number of notifications
curl -X GET "http://localhost:3000/api/vendors/me/notifications?page=1&limit=100" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// TEST 19: Filter Performance
curl -X GET "http://localhost:3000/api/vendors/me/notifications?isRead=false&type=bid_selected&page=1&limit=50" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json"

// ============================================
// SWAGGER UI TESTING
// ============================================

// Open Swagger UI in browser:
// http://localhost:3000/api-docs

// Navigate to "Vendor Notifications" section
// Test all endpoints using the interactive UI
// - Authenticate using vendor JWT token
// - Try all GET, PUT, DELETE operations
// - Verify response schemas match documentation

console.log("✅ All test scenarios defined!");
console.log("📝 Run these tests after starting your server");
console.log("🚀 Server should be running on http://localhost:3000");
