import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import SLA from "../models/sla.model";

// @desc    Get all SLAs
// @route   GET /api/slas
// @access  Private
export const getSLAs = asyncHandler(async (req: Request, res: Response) => {
  const slas = await SLA.find({});
  res.status(200).json(slas);
});

// @desc    Get SLA by ID
// @route   GET /api/slas/:id
// @access  Private
export const getSLAById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const sla = await SLA.findById(id);
  if (!sla) {
    res.status(404).json({ message: "SLA not found" });
    return;
  }
  res.status(200).json(sla);
});

// @desc    Create an SLA
// @route   POST /api/slas
// @access  Private (PM only)
export const createSLA = asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body;

  if (!title || !String(title).trim()) {
    res.status(400).json({ message: "SLA title is required" });
    return;
  }

  if (!content || !String(content).trim()) {
    res.status(400).json({ message: "SLA content is required" });
    return;
  }

  const userId = (req as any).user?._id || (req as any).user?.id;

  const sla = await SLA.create({
    title: String(title).trim(),
    content: String(content).trim(),
    createdById: userId ? String(userId) : undefined,
  });

  res.status(201).json(sla);
});

// @desc    Update an SLA
// @route   PUT /api/slas/:id
// @access  Private (PM only)
export const updateSLA = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const updates: Partial<{
    title: string;
    content: string;
  }> = {};

  if (req.body.title !== undefined) {
    updates.title = String(req.body.title).trim();
  }
  if (req.body.content !== undefined) {
    updates.content = String(req.body.content).trim();
  }

  const sla = await SLA.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!sla) {
    res.status(404).json({ message: "SLA not found" });
    return;
  }

  res.status(200).json(sla);
});

// @desc    Delete an SLA
// @route   DELETE /api/slas/:id
// @access  Private (PM only)
export const deleteSLA = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const sla = await SLA.findById(id);
  if (!sla) {
    res.status(404).json({ message: "SLA not found" });
    return;
  }

  await sla.deleteOne();
  res.status(200).json({ message: "SLA deleted successfully" });
});
