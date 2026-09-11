import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Location from "../models/location.model";
import { db } from "../db";
import { locations } from "../db/schema";
import { eq } from "drizzle-orm";
import mongoose from "mongoose";

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
export const getLocations = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const locs = await Location.find({});
      if (locs && locs.length > 0) {
        res.status(200).json(locs);
        return;
      }
    } catch (err) {
      // Fallback to PostgreSQL
    }

    const pgLocs = await db.query.locations.findMany();
    res.status(200).json(pgLocs.map(l => ({ _id: l.id, ...l })));
  }
);

// @desc    Create a location
// @route   POST /api/locations
// @access  Private
export const createLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, address, contactPerson, phoneNumber, email } = req.body;

    try {
      const location = await Location.create({
        name,
        address,
        contactPerson,
        phoneNumber,
        email,
      });
      res.status(201).json(location);
      return;
    } catch (err) {
      // Fallback directly to PostgreSQL
      const id = new mongoose.Types.ObjectId().toString();
      const newLoc = {
        id,
        name,
        address: address || null,
        contactPerson: contactPerson || null,
        phoneNumber: phoneNumber || null,
        email: email || null,
      };
      await db.insert(locations).values(newLoc);
      res.status(201).json({ _id: id, ...newLoc });
    }
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

    try {
      const location = await Location.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      if (location) {
        res.status(200).json(location);
        return;
      }
    } catch (err) {
      // Fallback to PostgreSQL
    }

    const existing = await db.query.locations.findFirst({
      where: eq(locations.id, id),
    });

    if (!existing) {
      res.status(404).json({ message: "Location not found" });
      return;
    }

    await db.update(locations).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(locations.id, id));

    const updated = await db.query.locations.findFirst({
      where: eq(locations.id, id),
    });

    res.status(200).json({ _id: id, ...updated });
  }
);

// @desc    Delete a location
// @route   DELETE /api/locations/:id
// @access  Private
export const deleteLocation = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);

    try {
      const location = await Location.findById(id);
      if (location) {
        await location.deleteOne();
        res.status(200).json({ message: "Location deleted successfully" });
        return;
      }
    } catch (err) {
      // Fallback to PostgreSQL
    }

    const existing = await db.query.locations.findFirst({
      where: eq(locations.id, id),
    });

    if (!existing) {
      res.status(404).json({ message: "Location not found" });
      return;
    }

    await db.delete(locations).where(eq(locations.id, id));
    res.status(200).json({ message: "Location deleted successfully" });
  }
);
