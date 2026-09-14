import { Request, Response, NextFunction } from "express";
import Department from "../models/department.model";
import User from "../models/user.model";
import Requisition from "../models/requisition.model";
import PurchaseOrder from "../models/purchaseOrder.model";
import { UserRole } from "../types/enums";
import { db } from "../db";
import { departments, users } from "../db/schema";
import { eq, ilike } from "drizzle-orm";

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 * @access  Private/Admin,SeniorManagement
 */
export const getDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const searchQuery = req.query.search as string;

    const allDepartments = await db.query.departments.findMany({
      where: searchQuery ? ilike(departments.name, `%${searchQuery}%`) : undefined,
      limit,
      offset: startIndex,
      with: { head: true, members: true }
    });

    const total = await db.select({ id: departments.id }).from(departments).then(r => r.length);

    res.status(200).json({
      success: true,
      count: allDepartments.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: allDepartments.map(d => ({
        _id: d.id,
        ...d,
        head: d.head ? { _id: d.head.id, ...d.head } : null,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single department
 * @route   GET /api/departments/:id
 * @access  Private
 */
export const getDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("head", "firstName lastName email")
      .populate("members", "firstName lastName email");

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if user has permission to view this department
    if (
      req.user!.role !== UserRole.ADMIN &&
      req.user!.role !== UserRole.PROCUREMENT_MANAGER && // Consolidated role
      req.user!.role !== UserRole.SENIOR_MANAGEMENT && // @nullified - kept for backward compatibility
      req.user!.department?.toString() !== department._id.toString() &&
      department.head.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to access this department",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create department
 * @route   POST /api/departments
 * @access  Private/Admin
 */
export const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Check if department with same name or code already exists
    const existingDepartment = await Department.findOne({
      $or: [{ name: req.body.name }, { code: req.body.code }],
    });

    if (existingDepartment) {
      res.status(400).json({
        success: false,
        message: "Department with this name or code already exists",
      });
      return;
    }

    // Verify that head user exists and has appropriate role
    const headUser = await User.findById(req.body.head);
    if (!headUser) {
      res
        .status(400)
        .json({ success: false, message: "Department head user not found" });
      return;
    }

    // Create department
    const department = await Department.create(req.body);

    // Update head user's role and department
    headUser.role = UserRole.DEPARTMENT_HEAD;
    headUser.department = department._id.toString();
    await headUser.save();

    // Update members' department if provided
    if (req.body.members && req.body.members.length > 0) {
      await User.updateMany(
        { _id: { $in: req.body.members } },
        { department: department._id },
      );
    }

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update department
 * @route   PUT /api/departments/:id
 * @access  Private/Admin
 */
export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if department with same name or code already exists (excluding current department)
    if (req.body.name || req.body.code) {
      const existingDepartment = await Department.findOne({
        $and: [
          { _id: { $ne: department._id } },
          {
            $or: [
              { name: req.body.name || department.name },
              { code: req.body.code || department.code },
            ],
          },
        ],
      });

      if (existingDepartment) {
        res.status(400).json({
          success: false,
          message: "Department with this name or code already exists",
        });
        return;
      }
    }

    // Handle department head change
    if (req.body.head && req.body.head !== department.head.toString()) {
      // Verify that new head user exists
      const newHeadUser = await User.findById(req.body.head);
      if (!newHeadUser) {
        res.status(400).json({
          success: false,
          message: "New department head user not found",
        });
        return;
      }

      // Update old head's role if they're not head of any other department
      const oldHeadUser = await User.findById(department.head);
      if (oldHeadUser) {
        const otherDepartmentsHeaded = await Department.countDocuments({
          _id: { $ne: department._id },
          head: oldHeadUser._id,
        });

        if (otherDepartmentsHeaded === 0) {
          oldHeadUser.role = UserRole.STAFF;
          await oldHeadUser.save();
        }
      }

      // Update new head's role and department
      newHeadUser.role = UserRole.DEPARTMENT_HEAD;
      newHeadUser.department = department._id.toString();
      await newHeadUser.save();
    }

    // Handle members changes
    if (req.body.members) {
      // Get current members
      const currentMembers = department.members.map((member: any) =>
        member.toString(),
      );

      // Find members to add and remove
      const membersToAdd = req.body.members.filter(
        (member: string) => !currentMembers.includes(member),
      );

      const membersToRemove = currentMembers.filter(
        (member: any) => !req.body.members.includes(member),
      );

      // Update new members' department
      if (membersToAdd.length > 0) {
        await User.updateMany(
          { _id: { $in: membersToAdd } },
          { department: department._id },
        );
      }

      // Clear department for removed members
      if (membersToRemove.length > 0) {
        await User.updateMany(
          {
            _id: { $in: membersToRemove },
            department: department._id,
          },
          { $unset: { department: "" } },
        );
      }
    }

    // Update department
    department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete department
 * @route   DELETE /api/departments/:id
 * @access  Private/Admin
 */
export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if department has any requisitions
    const requisitionsCount = await Requisition.countDocuments({
      department: department._id,
    });

    if (requisitionsCount > 0) {
      res.status(400).json({
        success: false,
        message:
          "Cannot delete department with existing requisitions. Transfer or delete requisitions first.",
      });
      return;
    }

    // Update head user's role
    const headUser = await User.findById(department.head);
    if (headUser) {
      const otherDepartmentsHeaded = await Department.countDocuments({
        _id: { $ne: department._id },
        head: headUser._id,
      });

      if (otherDepartmentsHeaded === 0) {
        headUser.role = UserRole.STAFF;
        headUser.department = undefined;
        await headUser.save();
      }
    }

    // Clear department for all members
    await User.updateMany(
      { department: department._id },
      { $unset: { department: "" } },
    );

    // Delete department
    await department.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get department members
 * @route   GET /api/departments/:id/members
 * @access  Private
 */
export const getDepartmentMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if user has permission to view this department's members
    if (
      req.user!.role !== UserRole.ADMIN &&
      req.user!.role !== UserRole.PROCUREMENT_MANAGER && // Consolidated role
      req.user!.role !== UserRole.SENIOR_MANAGEMENT && // @nullified - kept for backward compatibility
      req.user!.department?.toString() !== department._id.toString() &&
      department.head.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to access this department",
      });
      return;
    }

    // Add pagination support
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    // Add search functionality
    const searchQuery = req.query.search
      ? {
          $or: [
            { firstName: { $regex: req.query.search, $options: "i" } },
            { lastName: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
          department: department._id,
        }
      : { department: department._id };

    const total = await User.countDocuments(searchQuery);

    const members = await User.find(searchQuery)
      .select("firstName lastName email role profileImage")
      .skip(startIndex)
      .limit(limit)
      .sort({ firstName: 1, lastName: 1 });

    res.status(200).json({
      success: true,
      count: members.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add member to department
 * @route   POST /api/departments/:id/members
 * @access  Private/Admin,DepartmentHead
 */
export const addDepartmentMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if user has permission to add members to this department
    if (
      req.user!.role !== UserRole.ADMIN &&
      department.head.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to add members to this department",
      });
      return;
    }

    const { userId } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Check if user is already a member of this department
    if (
      user.department &&
      user.department.toString() === department._id.toString()
    ) {
      res.status(400).json({
        success: false,
        message: "User is already a member of this department",
      });
      return;
    }

    // Add user to department members
    if (!department.members.includes(user._id.toString())) {
      department.members.push(user._id.toString());
      await department.save();
    }

    // Update user's department
    user.department = department._id.toString();
    await user.save();

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from department
 * @route   DELETE /api/departments/:id/members/:userId
 * @access  Private/Admin,DepartmentHead
 */
export const removeDepartmentMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if user has permission to remove members from this department
    if (
      req.user!.role !== UserRole.ADMIN &&
      department.head.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to remove members from this department",
      });
      return;
    }

    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Check if user is a member of this department
    if (
      !user.department ||
      user.department.toString() !== department._id.toString()
    ) {
      res.status(400).json({
        success: false,
        message: "User is not a member of this department",
      });
      return;
    }

    // Check if user is the department head
    if (department.head.toString() === (req.user as any)._id.toString()) {
      res.status(400).json({
        success: false,
        message: "Cannot remove department head. Assign a new head first.",
      });
      return;
    }

    // Remove user from department members
    department.members = department.members.filter(
      (member: any) => member.toString() !== (req.user as any)._id.toString(),
    );
    await department.save();

    // Clear user's department
    user.department = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get department statistics
 * @route   GET /api/departments/:id/statistics
 * @access  Private/Admin,SeniorManagement,DepartmentHead
 */
export const getDepartmentStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      res.status(404).json({ success: false, message: "Department not found" });
      return;
    }

    // Check if user has permission to view this department's statistics
    if (
      req.user!.role !== UserRole.ADMIN &&
      req.user!.role !== UserRole.PROCUREMENT_MANAGER && // Consolidated role
      req.user!.role !== UserRole.SENIOR_MANAGEMENT && // @nullified - kept for backward compatibility
      department.head.toString() !== (req.user as any)._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Not authorized to view this department's statistics",
      });
      return;
    }

    // Get date range from query params or default to last 30 days
    const endDate = new Date();
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get requisition statistics
    const totalRequisitions = await Requisition.countDocuments({
      department: department._id,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const approvedRequisitions = await Requisition.countDocuments({
      department: department._id,
      status: {
        $in: [
          "departmentApproved",
          "procurementReview",
          "vendorBidding",
          "hrReview",
          "hrApproved",
          "accountsReview",
          "accountsApproved",
          "negotiation",
          "poGenerated",
          "vendorAcknowledged",
          "delivered",
          "inventoryConfirmed",
          "departmentConfirmed",
          "completed",
        ],
      },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const rejectedRequisitions = await Requisition.countDocuments({
      department: department._id,
      status: { $in: ["departmentRejected", "hrRejected", "accountsRejected"] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const pendingRequisitions = await Requisition.countDocuments({
      department: department._id,
      status: { $in: ["draft", "submitted"] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const completedRequisitions = await Requisition.countDocuments({
      department: department._id,
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Get total spending
    const purchaseOrders = await PurchaseOrder.find({
      requisition: {
        $in: await Requisition.find({ department: department._id }).distinct(
          "_id",
        ),
      },
      status: { $in: ["acknowledged", "fulfilled"] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalSpending: number = purchaseOrders.reduce(
      (sum: number, po: any) => sum + (po.totalPrice || 0),
      0,
    );

    // Get member count
    const memberCount = department.members.length;

    res.status(200).json({
      success: true,
      data: {
        requisitions: {
          total: totalRequisitions,
          approved: approvedRequisitions,
          rejected: rejectedRequisitions,
          pending: pendingRequisitions,
          completed: completedRequisitions,
        },
        spending: {
          total: totalSpending,
          average:
            totalRequisitions > 0 ? totalSpending / totalRequisitions : 0,
        },
        members: memberCount,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
