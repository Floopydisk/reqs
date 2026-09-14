import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Location from "../models/location.model";

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
export const getLocations = asyncHandler(
  async (req: Request, res: Response) => {
    const locs = await Location.find({});
    res.status(200).json(locs);
  }
);

// @desc    Create a location
// @route   POST /api/locations
// @access  Private
export const createLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, address, contactPerson, phoneNumber, email } = req.body;

    const location = await Location.create({
      name,
      address,
      contactPerson,
      phoneNumber,
      email,
    });
    res.status(201).json(location);
  }
);

// @desc    Update a location
// @route   PUT /api/locations/:id
// @access  Private
export const updateLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const updates: Partial<{
      name: string;
      address: string;
      contactPerson: string;
      phoneNumber: string;
      email: string;
    }> = {};

    ["name", "address", "contactPerson", "phoneNumber", "email"].forEach(
      (field) => {
        if (req.body[field] !== undefined) {
          (updates as any)[field] = req.body[field];
        }
      }
    );

    const location = await Location.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!location) {
      res.status(404).json({ message: "Location not found" });
      return;
    }

    res.status(200).json(location);
  }
);

// @desc    Delete a location
// @route   DELETE /api/locations/:id
// @access  Private
export const deleteLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const location = await Location.findById(id);
    if (!location) {
      res.status(404).json({ message: "Location not found" });
      return;
    }

    await location.deleteOne();
    res.status(200).json({ message: "Location deleted successfully" });
  }
);
