import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: Array.isArray(options.to) ? options.to.join(",") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      // Add a timeout to prevent hanging if email server is unresponsive
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Email sending timed out after 10 seconds")),
          10000
        );
      });

      await Promise.race([sendPromise, timeoutPromise]);
    } catch (error) {
      const recipient = Array.isArray(options.to)
        ? options.to.join(", ")
        : options.to;
      console.error(`Email sending failed to ${recipient}:`, error);
      throw error;
    }
  }

  async sendVendorBidRequest(
    vendors: { email: string; name: string }[],
    requisitionDetails: any
  ): Promise<void> {
    const failedEmails: string[] = [];

    // Personalize emails to each vendor
    for (const vendor of vendors) {
      try {
        await this.sendEmail({
          to: vendor.email,
          subject: `Bid Request: ${requisitionDetails.title}`,
          html: `
            <h1>Bid Request</h1>
            <p>Dear ${vendor.name},</p>
            <p>You have been specifically selected to submit a bid for the following requisition:</p>
            <p><strong>Requisition Number:</strong> ${
              requisitionDetails.requisitionNumber
            }</p>
            <p><strong>Title:</strong> ${requisitionDetails.title}</p>
            <p><strong>Description:</strong> ${
              requisitionDetails.description || "N/A"
            }</p>
            ${
              requisitionDetails.biddingDeadline
                ? `
            <p><strong>Bidding Deadline:</strong> ${new Date(
              requisitionDetails.biddingDeadline
            ).toLocaleString()}</p>
            `
                : ""
            }
            ${
              requisitionDetails.additionalInfo
                ? `
            <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0078d4; background-color: #f8f8f8;">
              <p><strong>Additional Information:</strong></p>
              <p>${requisitionDetails.additionalInfo}</p>
            </div>
            `
                : ""
            }
            <p>Please log in to the vendor portal to view the full details and submit your bid before the deadline.</p>
            <p>Thank you,</p>
            <p>Procurement Team</p>
          `,
        });
      } catch (error) {
        console.error(
          `Failed to send email to vendor ${vendor.name} (${vendor.email}):`,
          error
        );
        failedEmails.push(vendor.email);
      }
    }

    // Log a summary of failed emails, if any
    if (failedEmails.length > 0) {
      console.warn(
        `Failed to send emails to ${failedEmails.length} vendors:`,
        failedEmails
      );
      if (failedEmails.length === vendors.length) {
        throw new Error(
          `Failed to send emails to all vendors (${failedEmails.length})`
        );
      }
    }
  }

  async sendNegotiationInvitation(
    vendor: { email: string; name: string },
    negotiationDetails: any
  ): Promise<void> {
    await this.sendEmail({
      to: vendor.email,
      subject: `Negotiation Invitation: ${negotiationDetails.requisition.title}`,
      html: `
        <h1>Negotiation Invitation</h1>
        <p>Dear ${vendor.name},</p>
        <p>You are invited to a negotiation meeting for the following requisition:</p>
        <p><strong>Requisition Number:</strong> ${
          negotiationDetails.requisition.requisitionNumber
        }</p>
        <p><strong>Title:</strong> ${negotiationDetails.requisition.title}</p>
        <p><strong>Scheduled Date:</strong> ${new Date(
          negotiationDetails.scheduledDate
        ).toLocaleString()}</p>
        <p><strong>Meeting Link:</strong> <a href="${
          negotiationDetails.meetingLink
        }">${negotiationDetails.meetingLink}</a></p>
        <p>Please ensure you are available at the scheduled time.</p>
        <p>Thank you,</p>
        <p>Procurement Team</p>
      `,
    });
  }

  async sendMeetingInvitation(
    inviteeDetails: {
      email: string;
      name?: string;
      role?: string;
    },
    meetingDetails: any
  ): Promise<void> {
    await this.sendEmail({
      to: inviteeDetails.email,
      subject: `Meeting Invitation: ${meetingDetails.title}`,
      html: `
        <h1>Meeting Invitation</h1>
        <p>Dear ${inviteeDetails.name || "Participant"},</p>
        <p>You are invited to a meeting regarding the following requisition:</p>
        <p><strong>Requisition Number:</strong> ${
          meetingDetails.requisitionNumber
        }</p>
        <p><strong>Title:</strong> ${meetingDetails.title}</p>
        <p><strong>Scheduled Date:</strong> ${new Date(
          meetingDetails.scheduledDate
        ).toLocaleString()}</p>
        <p><strong>Meeting Link:</strong> <a href="${
          meetingDetails.meetingLink
        }">${meetingDetails.meetingLink}</a></p>
        <p><strong>Meeting Agenda:</strong> ${
          meetingDetails.agenda || "Negotiation discussion"
        }</p>
        <p><strong>Your Role:</strong> ${
          inviteeDetails.role || "Participant"
        }</p>
        <p>Please ensure you are available at the scheduled time.</p>
        <p>Thank you,</p>
        <p>Procurement Team</p>
      `,
    });
  }

  async sendPurchaseOrderNotification(
    vendor: { email: string; name: string },
    poDetails: any
  ): Promise<void> {
    await this.sendEmail({
      to: vendor.email,
      subject: `Purchase Order: ${poDetails.poNumber}`,
      html: `
        <h1>Purchase Order</h1>
        <p>Dear ${vendor.name},</p>
        <p>A purchase order has been issued for your bid:</p>
        <p><strong>PO Number:</strong> ${poDetails.poNumber}</p>
        <p><strong>Requisition:</strong> ${poDetails.requisition.title}</p>
        <p><strong>Total Amount:</strong> $${poDetails.totalPrice.toFixed(
          2
        )}</p>
        <p><strong>Delivery Date:</strong> ${new Date(
          poDetails.deliveryDate
        ).toLocaleDateString()}</p>
        <p>Please log in to the vendor portal to view the full details and acknowledge the purchase order.</p>
        <p>Thank you,</p>
        <p>Procurement Team</p>
      `,
    });
  }

  async sendDeliveryNotification(
    departmentUsers: { email: string; name: string }[],
    deliveryDetails: any
  ): Promise<void> {
    const departmentEmails = departmentUsers.map((user) => user.email);

    await this.sendEmail({
      to: departmentEmails,
      subject: `Delivery Notification: ${deliveryDetails.deliveryNumber}`,
      html: `
        <h1>Delivery Notification</h1>
        <p>Dear Department Member,</p>
        <p>A delivery has been received for your requisition:</p>
        <p><strong>Delivery Number:</strong> ${
          deliveryDetails.deliveryNumber
        }</p>
        <p><strong>Requisition:</strong> ${
          deliveryDetails.requisition.title
        }</p>
        <p><strong>Delivery Date:</strong> ${new Date(
          deliveryDetails.deliveryDate
        ).toLocaleDateString()}</p>
        <p>Please log in to the system to verify the delivered items.</p>
        <p>Thank you,</p>
        <p>Inventory Management Team</p>
      `,
    });
  }

  async sendBidRejectionNotification(vendor: {
    email: string;
    name: string;
    bidId: string;
    requisitionNumber: string;
    reason: string;
  }): Promise<void> {
    await this.sendEmail({
      to: vendor.email,
      subject: `Bid Rejection Notification - Requisition ${vendor.requisitionNumber}`,
      html: `
        <h1>Bid Rejection Notification</h1>
        <p>Dear ${vendor.name},</p>
        <p>We regret to inform you that your bid (ID: ${vendor.bidId}) for requisition ${vendor.requisitionNumber} has been rejected.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <p><strong>Reason for rejection:</strong> ${vendor.reason}</p>
        </div>
        <p>We appreciate your participation in the bidding process and encourage you to apply for future opportunities.</p>
        <p>If you have any questions regarding this decision, please contact our procurement team.</p>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br>Procurement Team</p>
      `,
    });
  }

  async sendBidSubmissionNotification(
    recipients: { email: string; name: string }[],
    bidDetails: {
      vendorName: string;
      requisitionNumber: string;
      bidId: string;
      totalPrice: number;
    }
  ): Promise<void> {
    const recipientEmails = recipients.map((recipient) => recipient.email);

    await this.sendEmail({
      to: recipientEmails,
      subject: `New Bid Submission - Requisition ${bidDetails.requisitionNumber}`,
      html: `
        <h1>New Bid Submission</h1>
        <p>A new bid has been submitted for your review.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <h3 style="margin-top: 0;">Bid Details</h3>
          <p><strong>Requisition:</strong> ${bidDetails.requisitionNumber}</p>
          <p><strong>Vendor:</strong> ${bidDetails.vendorName}</p>
          <p><strong>Bid ID:</strong> ${bidDetails.bidId}</p>
          <p><strong>Total Price:</strong> $${bidDetails.totalPrice.toFixed(
            2
          )}</p>
        </div>
        <p>Please log in to the procurement system to review this bid and take appropriate action.</p>
        <p>Best regards,<br>Procurement System</p>
      `,
    });
  }

  async sendDeliveryConfirmationNotification(
    recipients: { email: string; name: string }[],
    confirmationDetails: {
      deliveryNumber: string;
      requisitionTitle: string;
      status: string;
      nextStep: string;
    }
  ): Promise<void> {
    const recipientEmails = recipients.map((recipient) => recipient.email);

    await this.sendEmail({
      to: recipientEmails,
      subject: `Delivery Confirmation - ${confirmationDetails.deliveryNumber}`,
      html: `
        <h1>Delivery Confirmation</h1>
        <p>A delivery has been confirmed in the system.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
          <h3 style="margin-top: 0;">Confirmation Details</h3>
          <p><strong>Delivery Number:</strong> ${confirmationDetails.deliveryNumber}</p>
          <p><strong>Requisition:</strong> ${confirmationDetails.requisitionTitle}</p>
          <p><strong>Status:</strong> ${confirmationDetails.status}</p>
          <p><strong>Next Step:</strong> ${confirmationDetails.nextStep}</p>
        </div>
        <p>Please log in to the system to view the full details of this delivery.</p>
        <p>Best regards,<br>Inventory Management Team</p>
      `,
    });
  }

  /**
   * Send requisition cancellation notification to requester
   * @param recipient Requester email and name
   * @param details Requisition cancellation details
   */
  async sendRequisitionCancellationNotification(
    recipient: { email: string; name: string },
    details: {
      requisitionNumber: string;
      title: string;
      reason: string;
      cancelledBy: string;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: recipient.email,
      subject: `Requisition Cancellation - ${details.requisitionNumber}`,
      html: `
        <h1>Requisition Cancellation Notice</h1>
        <p>Dear ${recipient.name},</p>
        <p>We are writing to inform you that your requisition has been cancelled:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
          <h3 style="margin-top: 0;">Cancellation Details</h3>
          <p><strong>Requisition Number:</strong> ${details.requisitionNumber}</p>
          <p><strong>Title:</strong> ${details.title}</p>
          <p><strong>Cancelled By:</strong> ${details.cancelledBy}</p>
          <p><strong>Reason for Cancellation:</strong> ${details.reason}</p>
        </div>
        <p>If you have any questions regarding this cancellation, please contact the procurement team or the person who cancelled the requisition.</p>
        <p>If you still require the items requested, you may need to submit a new requisition.</p>
        <p>Best regards,<br>Procurement Team</p>
      `,
    });
  }
}

export default new EmailService();
